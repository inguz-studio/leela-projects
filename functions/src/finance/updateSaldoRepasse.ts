// =============================================================================
// functions/src/finance/updateSaldoRepasse.ts
//
// Recompute do saldo de repasse do tenant (LEELA-E09s-L2-T1 · E09-slim).
//
// Doc mantido: `tenants/{tid}/saldo/current` — escrita EXCLUSIVA de Function
// (Rules negam write de cliente — RN-357). Os 3 cards do painel-slim LEEM
// este doc; ninguém soma no cliente.
//
// FULL RECOMPUTE (idempotente por construção — padrão dos agregados ∑ do
// repo: agregarFinanceiro/rollups/virarLote): toda execução relê as fontes
// e recomputa via `computeSaldoRepasse` (@leela/core — RN-350/351; NUNCA
// reimplementado aqui). Reprocessar N vezes produz o MESMO doc; quando nada
// mudou, NÃO há escrita (no-op comparado campo a campo — a prova de
// idempotência dos testes usa o `atualizadoEm` intocado).
//
// FONTES (tudo lido DENTRO de uma transação — snapshot-consistente, mesmo
// racional do review Onda1 #07 do agregarFinanceiro):
//   - eventos do tenant (status — `encerrado` libera a retenção, RN-350);
//   - `eventos/{id}/financeiro/current` (E03-S207 — fonte da verdade de
//     bruto/líquido; E09-slim LÊ, nunca reconstrói. Evento ainda SEM o doc
//     agregado não contribui — nada é fabricado a partir de contagem×preço);
//   - `tenants/{tid}/repasses/*` (comprometido — RN-351; recusado/cancelado
//     devolvem via `comprometeSaldo` do core);
//   - `tenants/{tid}/commercialTerms/current` (retencaoRepassePct /
//     disponibilizacaoDiasUteis / platformFeePct — decisão #4; ausentes ⇒
//     defaults do core);
//   - `pagamentos` confirmados do tenant (janela D+N — ver abaixo).
//
// JANELA D+N (RN-348) — pendência do L1 RESOLVIDA com fonte REAL:
// o agregado por evento não tem granularidade por transação, mas os docs
// `pagamentos/{id}` TÊM — o webhook de confirmação (E12, única porta) grava
// `status:'confirmado'` + `pagoEm` + `valorFinal` + `tenantId`. A janela é
// derivada DESSES fatos: Σ computeLiquidoProdutor(valorFinal, feePct) das
// transações com < N dias úteis desde `pagoEm` (computeDentroJanelaDN, core).
// Limites DOCUMENTADOS (aproximações explícitas, nunca dado fabricado):
//   a. feePct usado é o do termo VIGENTE (RN-406 — "taxa sempre do termo do
//      tenant", mesmo comportamento do agregarFinanceiro; termo alterado
//      entre a venda e o recompute muda a fatia, como já muda no agregado);
//   b. receita SEM pagamento materializado (seed canônico) não tem transação
//      ⇒ não entra na janela (libera direto) — o seed não tem `pagoEm` real
//      e inventar um seria fabricar dado;
//   c. estorno PARCIAL mantém o pagamento 'confirmado' ⇒ a janela conta o
//      valorFinal cheio (conservador: segura mais, nunca libera a mais);
//      estorno TOTAL flipa o status e sai da janela;
//   d. a parcela RETIDA (15%) de uma transação dentro da janela é subtraída
//      DUAS vezes (uma em `retido`, outra em `dentroJanelaDN`) — o clamp ≥ 0
//      do core absorve; o viés é sempre CONSERVADOR (disponível menor,
//      nunca maior). Refino fino = pós-V1, junto do toggle RN-347.
//
// GATILHOS (aceite T1): onWrite de `eventos/{id}/financeiro/current` e de
// `tenants/{tid}/repasses/{id}`. O write de `saldo/current` NÃO é gatilho —
// sem loop. `evento.status='encerrado'` entra pelo cron encerrarEventos
// (L2-T6), que chama este recompute por tenant afetado.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  computeDentroJanelaDN,
  computeLiquidoProdutor,
  computeSaldoRepasse,
  isEstadoRepasse,
  isModoTaxa,
  roundMoney,
  type EventoSaldoInput,
  type ModoTaxa,
  type RepasseSaldoInput,
  type SaldoRepasseComputado,
  type TransacaoJanelaInput,
} from '@leela/core';

type Db = admin.firestore.Firestore;
type Tx = admin.firestore.Transaction;

// ---------------------------------------------------------------------------
// Leitura dos inputs (compartilhada com requestRepasse — L2-T3: a validação
// transacional da corrida usa EXATAMENTE esta leitura dentro da MESMA tx)
// ---------------------------------------------------------------------------

/**
 * Projeção de repasse COM id (o cancel/reject substitui o estado do alvo) e
 * COM a associação a evento (RN-349), que o guard por evento do
 * `requestRepasse` (RN-368) precisa para somar o comprometido DAQUELE evento.
 * `computeSaldoRepasse` ignora o campo — o ∑ do tenant não olha para evento.
 */
export interface RepasseSaldoInputComId extends RepasseSaldoInput {
  id: string;
  /** Evento associado; ausente = repasse LEGADO, anterior à RN-369. */
  eventoId?: string;
}

/** Inputs do recompute lidos num snapshot transacional único. */
export interface SaldoRepasseInputs {
  eventos: EventoSaldoInput[];
  repasses: RepasseSaldoInputComId[];
  /** % de retenção do termo — undefined ⇒ default 15 do core (RN-350) */
  retencaoPct: number | undefined;
  /** Σ fundos ainda na janela D+N (RN-348) — derivado dos pagamentos */
  dentroJanelaDN: number;
  /** O tenant tem `commercialTerms/current`? (decisão #7 — sem termo, sem saque) */
  temTermo: boolean;
}

/**
 * Lê TODOS os inputs do saldo dentro da transação (snapshot único):
 * eventos + financeiro/current, repasses, termo e pagamentos confirmados.
 * Fail-fast em dado corrompido (estado de repasse fora da union, valor não
 * numérico) — só Functions escrevem nessas coleções; corrupção = bug, nunca
 * mascarar em dinheiro.
 */
export async function lerInputsSaldoRepasse(
  tx: Tx,
  db: Db,
  tenantId: string,
  agora: Date
): Promise<SaldoRepasseInputs> {
  // 1. Eventos do tenant (status decide a retenção — RN-350)
  const eventosSnap = await tx.get(
    db.collection('eventos').where('tenantId', '==', tenantId)
  );

  // 2. Agregado financeiro POR evento (E03-S207 — fonte da verdade)
  const financeiroRefs = eventosSnap.docs.map((d) =>
    d.ref.collection('financeiro').doc('current')
  );
  const financeiroSnaps =
    financeiroRefs.length > 0 ? await tx.getAll(...financeiroRefs) : [];

  // RN-347 (EVENTO-CAMPOS): modo da taxa POR EVENTO — mapa eventoId→modo do
  // MESMO snapshot (inclui eventos ainda sem financeiro/current: um pagamento
  // pode confirmar antes do 1º recompute do agregado). Ausente/lixo ⇒
  // 'incorporada' (comportamento vigente — guard defensivo, não lança para
  // não travar o recompute do tenant inteiro por um doc legado).
  const modoPorEvento = new Map<string, ModoTaxa>();
  for (const eventoDoc of eventosSnap.docs) {
    const raw = eventoDoc.get('taxaModo');
    modoPorEvento.set(eventoDoc.id, isModoTaxa(raw) ? raw : 'incorporada');
  }

  const eventos: EventoSaldoInput[] = [];
  eventosSnap.docs.forEach((eventoDoc, i) => {
    const finSnap = financeiroSnaps[i];
    if (finSnap === undefined || !finSnap.exists) {
      // Evento sem agregado (nenhum inscrito processado ainda) — contribui 0.
      // NUNCA derivar bruto/líquido aqui (seria reconstruir o E03).
      return;
    }
    const receitaBruta = finSnap.get('receitaBruta');
    const receitaLiquida = finSnap.get('receitaLiquida');
    if (typeof receitaBruta !== 'number' || !Number.isFinite(receitaBruta)) {
      throw new Error(
        `financeiro/current de '${eventoDoc.id}' com receitaBruta inválida — dado corrompido.`
      );
    }
    eventos.push({
      eventoId: eventoDoc.id,
      receitaBruta,
      receitaLiquida:
        typeof receitaLiquida === 'number' && Number.isFinite(receitaLiquida)
          ? receitaLiquida
          : null, // null ⇒ tenant sem termo (decisão #7)
      encerrado: eventoDoc.get('status') === 'encerrado',
    });
  });

  // 3. Repasses do tenant (comprometido — RN-351)
  const repassesSnap = await tx.get(
    db.collection('tenants').doc(tenantId).collection('repasses')
  );
  const repasses: RepasseSaldoInputComId[] = repassesSnap.docs.map((doc) => {
    const estado = doc.get('estado');
    const valor = doc.get('valor');
    if (!isEstadoRepasse(estado)) {
      throw new Error(
        `repasse '${doc.id}' com estado fora da union (RN-353) — dado corrompido.`
      );
    }
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) {
      throw new Error(
        `repasse '${doc.id}' com valor inválido — dado corrompido.`
      );
    }
    // RN-349/RN-369: docs LEGADOS (anteriores à associação obrigatória) não
    // têm o campo. Ausência é fato, não corrupção — o repasse continua
    // comprometendo o saldo do tenant, só não abate nenhum evento.
    const eventoIdRaw = doc.get('eventoId');
    const eventoId =
      typeof eventoIdRaw === 'string' && eventoIdRaw.length > 0
        ? eventoIdRaw
        : undefined;
    return { id: doc.id, estado, valor, ...(eventoId !== undefined ? { eventoId } : {}) };
  });

  // 4. Termo comercial do tenant (decisão #4 — % retenção e D+N por tenant)
  const termoSnap = await tx.get(
    db.doc(`tenants/${tenantId}/commercialTerms/current`)
  );
  const temTermo = termoSnap.exists;
  const retencaoRaw = temTermo ? termoSnap.get('retencaoRepassePct') : undefined;
  const retencaoPct =
    typeof retencaoRaw === 'number' && Number.isFinite(retencaoRaw)
      ? retencaoRaw
      : undefined; // core aplica o default 15 (RN-350)
  const diasUteisRaw = temTermo
    ? termoSnap.get('disponibilizacaoDiasUteis')
    : undefined;
  const diasUteis =
    typeof diasUteisRaw === 'number' && Number.isInteger(diasUteisRaw) && diasUteisRaw >= 0
      ? diasUteisRaw
      : undefined; // core aplica o default 2 (RN-348)
  const feePctRaw = temTermo ? termoSnap.get('platformFeePct') : undefined;
  const feePct =
    typeof feePctRaw === 'number' && Number.isFinite(feePctRaw) ? feePctRaw : null;

  // 5. Janela D+N (RN-348) — fonte REAL por transação: pagamentos confirmados
  //    do tenant (webhook grava pagoEm/valorFinal). Sem termo ⇒ 0 (nada
  //    libera de qualquer forma — decisão #7). Query equality-only (tenantId
  //    + status): servida por merge de índices single-field, sem índice novo.
  let dentroJanelaDN = 0;
  if (feePct !== null) {
    const pagamentosSnap = await tx.get(
      db
        .collection('pagamentos')
        .where('tenantId', '==', tenantId)
        .where('status', '==', 'confirmado')
    );
    const transacoes: TransacaoJanelaInput[] = [];
    for (const doc of pagamentosSnap.docs) {
      const pagoEm = doc.get('pagoEm');
      const valorFinal = doc.get('valorFinal');
      if (!(pagoEm instanceof Timestamp)) continue; // confirmado legado sem carimbo — sem fato, sem janela
      if (typeof valorFinal !== 'number' || !Number.isFinite(valorFinal) || valorFinal <= 0) {
        continue; // pagamento zero/corrompido não segura fundos
      }
      // RN-347: o líquido da transação respeita o modo do EVENTO da venda
      // (pagamento denormaliza eventoId). Evento desconhecido/sem modo ⇒
      // 'incorporada' (conservador: líquido menor, nunca segura a menos).
      const eventoIdPagamento = doc.get('eventoId');
      const modo: ModoTaxa =
        typeof eventoIdPagamento === 'string'
          ? (modoPorEvento.get(eventoIdPagamento) ?? 'incorporada')
          : 'incorporada';
      // TAXAFLEX (RN-179/182): doc com CARIMBO usa a taxa REAL congelada na
      // venda (pct+fixo por meio) — a aproximação (a) "feePct do termo
      // VIGENTE" vira exata p/ docs novos. O modo congelado do DOC
      // (`taxaRepassada` presente ⇒ repassada) vence o mapa do evento.
      // Doc pré-TAXAFLEX (sem carimbo) segue a imputação vigente.
      const tc = doc.get('taxaCongelada') as { valor?: unknown } | undefined;
      const taxaRepassadaDoc = doc.get('taxaRepassada');
      let valorLiquido: number;
      if (
        tc !== undefined &&
        typeof tc.valor === 'number' &&
        Number.isFinite(tc.valor) &&
        tc.valor >= 0
      ) {
        const ehRepassada =
          typeof taxaRepassadaDoc === 'number' && taxaRepassadaDoc > 0;
        valorLiquido = ehRepassada
          ? valorFinal
          : Math.max(0, roundMoney(valorFinal - tc.valor));
      } else {
        valorLiquido = computeLiquidoProdutor(valorFinal, feePct, modo);
      }
      transacoes.push({
        valorLiquido,
        confirmadaEm: pagoEm.toDate(),
      });
    }
    dentroJanelaDN =
      diasUteis !== undefined
        ? computeDentroJanelaDN(transacoes, agora, diasUteis)
        : computeDentroJanelaDN(transacoes, agora);
  }

  return { eventos, repasses, retencaoPct, dentroJanelaDN, temTermo };
}

// ---------------------------------------------------------------------------
// Recompute (núcleo — testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

/** Os 6 campos ∑ do saldo são idênticos? (no-op de escrita — idempotência) */
function saldoInalterado(
  atual: FirebaseFirestore.DocumentSnapshot,
  novo: SaldoRepasseComputado
): boolean {
  return (
    atual.get('vendidoBruto') === novo.vendidoBruto &&
    atual.get('retido') === novo.retido &&
    atual.get('disponivel') === novo.disponivel &&
    atual.get('comprometido') === novo.comprometido &&
    atual.get('dentroJanelaDN') === novo.dentroJanelaDN &&
    atual.get('eventosSemTermo') === novo.eventosSemTermo
  );
}

/**
 * Recomputa o saldo consolidado do tenant do zero e persiste em
 * `tenants/{tid}/saldo/current` (RN-350/351). Tudo numa transação:
 * leituras e escrita saem do MESMO snapshot; dois recomputes concorrentes
 * serializam no write do doc. Quando nada mudou, NENHUMA escrita acontece
 * (recomputar duas vezes com o mesmo estado não muda o saldo — aceite T1).
 */
export async function recomputarSaldoRepasse(
  db: Db,
  tenantId: string,
  agora: Date = new Date()
): Promise<SaldoRepasseComputado> {
  if (typeof tenantId !== 'string' || tenantId.length === 0) {
    throw new Error('tenantId é obrigatório para recomputar o saldo.');
  }
  return db.runTransaction(async (tx) => {
    const inputs = await lerInputsSaldoRepasse(tx, db, tenantId, agora);
    const saldoRef = db.doc(`tenants/${tenantId}/saldo/current`);
    const atualSnap = await tx.get(saldoRef);

    const computado = computeSaldoRepasse({
      eventos: inputs.eventos,
      repasses: inputs.repasses,
      dentroJanelaDN: inputs.dentroJanelaDN,
      ...(inputs.retencaoPct !== undefined
        ? { retencaoPct: inputs.retencaoPct }
        : {}),
    });

    if (atualSnap.exists && saldoInalterado(atualSnap, computado)) {
      return computado; // no-op — zero write (idempotente)
    }

    tx.set(saldoRef, {
      tenantId,
      ...computado,
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return computado;
  });
}

// ---------------------------------------------------------------------------
// Gatilhos (Cloud Functions v1 — mesmo runtime dos módulos existentes)
// ---------------------------------------------------------------------------

async function recomputarComLog(
  tenantId: string,
  origem: string,
  docId: string
): Promise<void> {
  try {
    const saldo = await recomputarSaldoRepasse(admin.firestore(), tenantId);
    // Sem PII no log — ids + agregados financeiros (padrão agregarFinanceiro)
    logger.info('saldo_repasse_recomputado', {
      tenantId,
      origem,
      docId,
      disponivel: saldo.disponivel,
      retido: saldo.retido,
      comprometido: saldo.comprometido,
    });
  } catch (err) {
    logger.error('saldo_repasse_falha', { tenantId, origem, docId, err });
    throw err;
  }
}

/**
 * onWrite do agregado financeiro do evento (E03 escreve, E09s reage):
 * receita mudou ⇒ recomputa o saldo do tenant dono. At-least-once safe.
 */
export const onFinanceiroEventoWrite = functions.firestore
  .document('eventos/{eventoId}/financeiro/current')
  .onWrite(async (change, context) => {
    const eventoId = context.params['eventoId'] as string;
    const tenantIdRaw = change.after.exists
      ? change.after.get('tenantId')
      : change.before.get('tenantId');
    if (typeof tenantIdRaw !== 'string' || tenantIdRaw.length === 0) {
      // Agregado sem tenantId (ADR-009 violado) — nada a recomputar; logar
      // para observabilidade sem quebrar o pipeline do E03.
      logger.warn('saldo_repasse_sem_tenant', { eventoId });
      return;
    }
    await recomputarComLog(tenantIdRaw, 'financeiro_evento', eventoId);
  });

/**
 * onWrite de repasse (criado/transicionado pelas callables L2-T3/T4) ⇒
 * recomputa o comprometido/disponível (RN-351 — recusa/cancelamento
 * devolvem o valor ao disponível NESTE recompute).
 */
export const onRepasseWrite = functions.firestore
  .document('tenants/{tenantId}/repasses/{repasseId}')
  .onWrite(async (_change, context) => {
    const tenantId = context.params['tenantId'] as string;
    const repasseId = context.params['repasseId'] as string;
    await recomputarComLog(tenantId, 'repasse', repasseId);
  });
