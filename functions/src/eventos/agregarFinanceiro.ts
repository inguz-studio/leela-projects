// =============================================================================
// functions/src/eventos/agregarFinanceiro.ts
//
// Agregado financeiro do evento por Cloud Function (LEELA-S207-T2 · E03).
//
// Doc mantido: `eventos/{eventoId}/financeiro/current` — escrita EXCLUSIVA
// de Function (a Rule catch-all das subcoleções de evento nega escrita de
// cliente; leitura fica com o tenant dono/platform_admin). A tela S207-T1
// LÊ este doc — nunca recalcula receita no cliente.
//
// FULL RECOMPUTE (idempotente por construção — mesmo padrão dos rollups
// E16 e dos agregados de membros E05): recontagem via aggregate count()
// sobre a subcoleção `inscritos` + derivação de taxa/líquido a partir do
// TERMO do tenant. Reprocessar N vezes produz o MESMO doc — nada acumula.
// SNAPSHOT-CONSISTENTE (review Onda1 #07): leituras E escritas rodam numa
// única transação — corrida entre dois onInscritoWrite não persiste mais
// agregado stale nem doc com total ≠ Σ porStatus.
//
// Fontes:
//   - contagens (total, por status/kit/modalidade): count() na subcoleção;
//   - `receitaBruta` = `eventos.receitaConfirmada` (∑): o VALOR monetário
//     nasce no fluxo de pagamento (webhook idempotente por eventId — E12,
//     mockProvider já define o contrato). Até lá a fonte é o seed canônico
//     (R$ 85.617). Esta Function NUNCA inventa receita a partir de contagem
//     × preço de kit (kit.preco é DELTA sobre inscrição — E04 define lotes);
//   - `taxaPct` = platformFeePct do TERMO do tenant (TermsProvider, RN-406).
//     Tenant sem termos → taxaPct/taxaValor/receitaLiquida = null, SEM
//     fallback para default (padrão rollups E16 — mascarar ausência de
//     termo reinstalaria a constante que RN-406 proíbe).
//
// O agregado ∑ `eventos.qtdInscritos` também é mantido aqui (era só seed até
// este lote): total de inscrições da subcoleção (todas — cancelada é
// inscrição com histórico; bate com o canônico 453). Escreve SÓ quando o
// valor difere (no-op em reprocesso — padrão itemKitIndex).
//
// Gatilho: onWrite de `eventos/{e}/inscritos/{i}` → recomputa. O write do
// financeiro/current e do evento pai NÃO redispara este gatilho (documentos
// diferentes) — sem loop.
//
// +2026-08-17 (S825-T1 · lane SERIE-FINANCEIRA · leva 25 do dono): este doc
// passa a carregar a SÉRIE POR FORMA DE PAGAMENTO e as PENDÊNCIAS EM R$. A
// escolha de casa foi esta e não o agregado do organizador porque a S825-T1
// diz "agregado do EVENTO", porque o laço sobre `pagamentos` confirmados já
// estava aqui (a série é de graça) e porque a autoridade sobre número de
// venda, pelo próprio E11, é a de vendas — o organizador CONSOLIDA, não
// apura. Ver `packages/core/src/pedidos/serieFormasPagamento.ts` para o
// contrato e para as três decisões que o governam.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  acumularPagamento,
  computeLiquidoProdutor,
  computeTaxa,
  createTermsProvider,
  isModoTaxa,
  KITS_INSCRITO,
  roundMoney,
  serieZerada,
  STATUS_INSCRITO,
  TermsNotFoundError,
} from '@leela/core';
import type {
  CommercialTerms,
  FatiaFormaPagamento,
  KitInscrito,
  ModoTaxa,
  StatusInscrito,
} from '@leela/core';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Contagens de inscritos do evento (recontadas da fonte). */
export interface ContagemInscritos {
  total: number;
  porStatus: Record<StatusInscrito, number>;
  porKit: Record<KitInscrito, number>;
  /** Chaves = `evento.modalidades` (percursos configurados no evento) */
  porModalidade: Record<string, number>;
}

/**
 * Dinheiro PARADO no evento (VG-INSIGHTS-3 · candidato "pendências em R$").
 *
 * Denominador PRÓPRIO, e é por isso que ele não entrou no alerta de
 * pendências que já existe: aquele conta INSCRITOS pendentes há mais de 24h,
 * este soma PAGAMENTOS pendentes. Um pedido de três pessoas é uma cobrança e
 * três inscritos — casar os dois números numa frase só ("N pendentes, R$ X")
 * repetiria, em miniatura, o erro do funil que fechava em inscrito
 * (D-1008-R19). Cada número fica com a sua unidade e com o seu rótulo.
 *
 * SEM o corte de 24h, também de propósito: o corte exigiria índice composto
 * (`eventoId` + `status` + `criadoEm`) e responde outra pergunta. "Quanto
 * está parado" é estado de caixa; "o que já passou do prazo" é operação.
 */
export interface PendenciasEvento {
  /** Pagamentos em `pendente` do evento (transações, não pessoas). */
  qtd: number;
  /** Σ `valorFinal` desses pagamentos, em R$. */
  valor: number;
}

/** Shape do doc `eventos/{id}/financeiro/current` (sem o Timestamp). */
export interface FinanceiroEvento {
  tenantId: string;
  /** Receita bruta confirmada (R$) — espelho do ∑ `receitaConfirmada` */
  receitaBruta: number;
  /** % do termo do tenant (RN-406) — null quando o tenant não tem termos */
  taxaPct: number | null;
  /** Taxa Leela (R$) — null quando não há termo */
  taxaValor: number | null;
  /** Líquido do produtor (R$) — null quando não há termo */
  receitaLiquida: number | null;
  inscritos: ContagemInscritos;
  /**
   * Série por forma de pagamento (E11 · S825-T1) — a resposta à leva 25 do
   * dono. Nasce COMPLETA (uma fatia por forma do enum, ordem canônica) e sai
   * do MESMO laço que já varria os pagamentos confirmados para os carimbos
   * TAXAFLEX: nenhuma query nova, nenhum índice novo, nenhum doc a mais lido.
   *
   * Doc gravado antes desta série não tem o campo, e quem lê DEVE tratar
   * ausência como "não computada" (`parseSerieFormasPagamento` devolve null)
   * — nunca como "nenhuma venda".
   */
  formasPagamento: FatiaFormaPagamento[];
  /** Dinheiro parado — ver {@link PendenciasEvento}. */
  pendentes: PendenciasEvento;
}

/**
 * Σ dos CARIMBOS de taxa (TAXAFLEX · RN-179/182) dos pagamentos CONFIRMADOS
 * do evento — a fonte por transação da taxa real (pct+fixo por meio,
 * congelada na compra). `receitaComCarimbo` = Σ valorFinal desses docs, a
 * fatia da receita que NÃO precisa mais de imputação por %.
 */
export interface CarimbosTaxaEvento {
  taxaCarimbada: number;
  receitaComCarimbo: number;
}

/**
 * Deriva taxa e líquido a partir do bruto + % do termo (null-safe, RN-406),
 * agora HÍBRIDO com os carimbos TAXAFLEX (RN-179/182):
 *
 *   taxaValor = Σ taxaCongelada.valor (confirmados com carimbo)
 *             + computeTaxa(max(0, bruto − Σ valorFinal com carimbo), pct)
 *
 * — a fatia carimbada usa a taxa REAL da venda (pct+fixo por meio, congelada
 * na compra; mudar tabela/termo não retroage); só o RESTO legado/seed segue
 * na imputação por % vigente (aproximação documentada do E09s). Estorno
 * PARCIAL mantém o pagamento confirmado ⇒ a taxa cheia permanece contada
 * (conservador p/ o organizador; o SE devolve taxa = BENCHMARK-REEMBOLSO);
 * estorno INTEGRAL flipa o status e sai do Σ inteiro.
 *
 * RN-347 (EVENTO-CAMPOS): o líquido respeita o MODO da taxa do evento —
 * 'incorporada' (default/vigente): líquido = bruto − taxa;
 * 'repassada': a taxa é cobrada por fora do comprador ⇒ líquido = bruto
 * (a taxa nunca foi dinheiro do produtor). Reusa `computeLiquidoProdutor`
 * do core (E09s-L1) — NUNCA reimplementa a matemática. `taxaValor` segue
 * informativo nos DOIS modos (é a fatia Leela; o modo decide QUEM paga).
 *
 * Sem termo E sem carimbo ⇒ triple null (vigente — decisão #7: nada libera).
 * Sem termo COM carimbo (termo deletado é negado pelas Rules — quase
 * impossível): a fatia carimbada ainda vale; o resto fica sem imputação.
 * @pure
 */
export function computeFinanceiro(
  receitaBruta: number,
  taxaPct: number | null,
  modo: ModoTaxa = 'incorporada',
  carimbos?: CarimbosTaxaEvento
): Pick<FinanceiroEvento, 'taxaPct' | 'taxaValor' | 'receitaLiquida'> {
  const temCarimbo =
    carimbos !== undefined && carimbos.receitaComCarimbo > 0;
  if (taxaPct === null && !temCarimbo) {
    return { taxaPct: null, taxaValor: null, receitaLiquida: null };
  }
  if (!temCarimbo) {
    // Caminho vigente byte a byte (só imputação por % do termo)
    return {
      taxaPct,
      taxaValor: computeTaxa(receitaBruta, taxaPct as number),
      receitaLiquida: computeLiquidoProdutor(receitaBruta, taxaPct as number, modo),
    };
  }
  const restoLegado = Math.max(
    0,
    roundMoney(receitaBruta - carimbos.receitaComCarimbo)
  );
  const taxaValor = roundMoney(
    carimbos.taxaCarimbada +
      (taxaPct !== null ? computeTaxa(restoLegado, taxaPct) : 0)
  );
  const receitaLiquida =
    modo === 'repassada'
      ? roundMoney(receitaBruta)
      : Math.max(0, roundMoney(receitaBruta - taxaValor));
  return { taxaPct, taxaValor, receitaLiquida };
}

// ---------------------------------------------------------------------------
// Recomputação (núcleo — testável com Admin SDK contra o Emulator)
// ---------------------------------------------------------------------------

/**
 * Reconta os inscritos do evento via aggregate count() DENTRO da transação
 * (fonte da verdade, snapshot-consistente — review Onda1 #07: as ~10 counts
 * sequenciais fora de tx podiam misturar estados de writes concorrentes).
 */
async function contarInscritos(
  tx: admin.firestore.Transaction,
  db: Db,
  eventoId: string,
  modalidades: readonly string[]
): Promise<ContagemInscritos> {
  const col = db.collection('eventos').doc(eventoId).collection('inscritos');

  const count = async (q: FirebaseFirestore.Query): Promise<number> =>
    (await tx.get(q.count())).data().count;

  const total = await count(col);

  const porStatus = {} as Record<StatusInscrito, number>;
  for (const status of STATUS_INSCRITO) {
    porStatus[status] = await count(col.where('status', '==', status));
  }

  const porKit = {} as Record<KitInscrito, number>;
  for (const kit of KITS_INSCRITO) {
    porKit[kit] = await count(col.where('kit', '==', kit));
  }

  const porModalidade: Record<string, number> = {};
  for (const modalidade of modalidades) {
    porModalidade[modalidade] = await count(
      col.where('modalidade', '==', modalidade)
    );
  }

  return { total, porStatus, porKit, porModalidade };
}

/**
 * Recomputa o agregado financeiro do evento do zero e persiste:
 *   - `eventos/{id}/financeiro/current` — set() integral (idempotente);
 *   - `eventos/{id}.qtdInscritos` — sincronizado quando difere (no-op senão).
 *
 * TUDO dentro de UMA transação (fix review Onda1 #07): leituras (evento,
 * counts, termo) saem do MESMO snapshot e o commit falha/retenta se um write
 * concorrente de inscrito invalidar o snapshot — dois onInscritoWrite em
 * corrida não gravam mais agregado stale (que persistia até o próximo write),
 * nem doc com `total` ≠ Σ porStatus na tela S207.
 *
 * @returns o doc financeiro recomputado, ou null quando o evento não existe
 *          (inscrito órfão de evento deletado — nada a manter).
 */
export async function recomputarFinanceiroEvento(
  db: Db,
  eventoId: string
): Promise<FinanceiroEvento | null> {
  return db.runTransaction(async (tx) => {
    const eventoRef = db.collection('eventos').doc(eventoId);
    const eventoSnap = await tx.get(eventoRef);
    if (!eventoSnap.exists) return null;

    const tenantId = (eventoSnap.get('tenantId') as string) ?? '';
    const receitaBruta =
      typeof eventoSnap.get('receitaConfirmada') === 'number'
        ? (eventoSnap.get('receitaConfirmada') as number)
        : 0;
    const modalidades = Array.isArray(eventoSnap.get('modalidades'))
      ? (eventoSnap.get('modalidades') as unknown[]).filter(
          (m): m is string => typeof m === 'string'
        )
      : [];

    const inscritos = await contarInscritos(tx, db, eventoId, modalidades);

    // Termo do PRÓPRIO tenant (RN-406) — sem termo, sem taxa imputada.
    // Leitura via tx (mesmo snapshot); parsing/validação seguem no provider.
    const termoSnap = await tx.get(
      db.doc(`tenants/${tenantId}/commercialTerms/current`)
    );
    const terms = createTermsProvider(
      async (): Promise<CommercialTerms | null> =>
        termoSnap.exists ? (termoSnap.data() as CommercialTerms) : null,
      { ttlMs: 0 }
    );
    let taxaPct: number | null = null;
    try {
      taxaPct = await terms.getPlatformFeePct(tenantId);
    } catch (err) {
      if (!(err instanceof TermsNotFoundError)) throw err;
    }

    // RN-347: modo da taxa do PRÓPRIO evento (mesmo snapshot da tx) — ausente
    // ou lixo ⇒ 'incorporada' (comportamento vigente; guard, nunca lança aqui
    // para não travar o pipeline de agregação por doc legado).
    const taxaModoRaw = eventoSnap.get('taxaModo');
    const modoTaxa: ModoTaxa = isModoTaxa(taxaModoRaw) ? taxaModoRaw : 'incorporada';

    // TAXAFLEX (RN-179/182): Σ dos carimbos dos pagamentos CONFIRMADOS do
    // evento — fonte por transação, MESMO snapshot da tx (query equality-only
    // eventoId+status: merge de índices single-field, sem índice novo).
    // Doc com tenantId divergente (ADR-009 violado) fica FORA do Σ.
    const pagamentosSnap = await tx.get(
      db
        .collection('pagamentos')
        .where('eventoId', '==', eventoId)
        .where('status', '==', 'confirmado')
    );
    let taxaCarimbada = 0;
    let receitaComCarimbo = 0;
    // S825-T1: a série por forma sai DESTE laço. Ela conta TODO confirmado do
    // tenant, com ou sem carimbo TAXAFLEX — o carimbo governa imputação de
    // taxa, não a existência da venda. Deixar a série presa ao `if` do
    // carimbo esconderia da rosca justamente a venda legada, que é a mais
    // provável de ter forma interessante para o organizador.
    const formasPagamento = serieZerada();
    for (const pagDoc of pagamentosSnap.docs) {
      if (pagDoc.get('tenantId') !== tenantId) continue;
      const tc = pagDoc.get('taxaCongelada') as { valor?: unknown } | undefined;
      const vf = pagDoc.get('valorFinal');
      acumularPagamento(
        formasPagamento,
        pagDoc.get('forma'),
        vf,
        pagDoc.get('estornadoTotal')
      );
      if (
        tc !== undefined &&
        typeof tc.valor === 'number' &&
        Number.isFinite(tc.valor) &&
        tc.valor >= 0 &&
        typeof vf === 'number' &&
        Number.isFinite(vf) &&
        vf > 0
      ) {
        taxaCarimbada = roundMoney(taxaCarimbada + tc.valor);
        // Review antagonista F2: estorno PARCIAL mantém o pagamento
        // 'confirmado' mas REVERTE o face estornado em receitaConfirmada —
        // a fatia de receita "coberta pelo carimbo" é o que SOBROU
        // (valorFinal − estornadoTotal, clamp 0). Sem isso, o carimbo
        // "cobriria" receita que já saiu do bruto e o clamp do resto
        // engoliria a imputação da fatia LEGADA (líquido superestimado).
        // A TAXA carimbada segue CHEIA (decisão documentada: estorno
        // parcial não devolve taxa — fronteira BENCHMARK-REEMBOLSO).
        const estornadoRaw = pagDoc.get('estornadoTotal');
        const estornado =
          typeof estornadoRaw === 'number' &&
          Number.isFinite(estornadoRaw) &&
          estornadoRaw > 0
            ? estornadoRaw
            : 0;
        receitaComCarimbo = roundMoney(
          receitaComCarimbo + Math.max(0, roundMoney(vf - estornado))
        );
      }
    }

    // VG-INSIGHTS-3: dinheiro parado. Segunda query equality-only sobre a
    // MESMA coleção (`eventoId` + `status`), no mesmo snapshot da tx e servida
    // pelo mesmo merge de índices single-field — sem índice novo.
    //
    // Achado que vale registrar: o painel do dono registrou esta opção como
    // "o laço já varre os pendentes, falta somar". A varredura de pendentes
    // que existe é a do `aggregateProfessionalDashboard`, e ela varre
    // INSCRITOS — e o inscrito, por decisão de arquitetura (`inscrito.ts`
    // §"[pag] NUNCA se denormaliza"), não carrega centavo nenhum. Somar ali
    // era impossível sem join. Aqui é barato porque esta Function já mora na
    // coleção onde o dinheiro está.
    const pendentesSnap = await tx.get(
      db
        .collection('pagamentos')
        .where('eventoId', '==', eventoId)
        .where('status', '==', 'pendente')
    );
    let pendentesQtd = 0;
    let pendentesValor = 0;
    for (const pagDoc of pendentesSnap.docs) {
      if (pagDoc.get('tenantId') !== tenantId) continue;
      const vf = pagDoc.get('valorFinal');
      if (typeof vf !== 'number' || !Number.isFinite(vf) || vf < 0) continue;
      pendentesQtd += 1;
      pendentesValor = roundMoney(pendentesValor + vf);
    }

    const financeiro: FinanceiroEvento = {
      tenantId,
      receitaBruta,
      ...computeFinanceiro(receitaBruta, taxaPct, modoTaxa, {
        taxaCarimbada,
        receitaComCarimbo,
      }),
      inscritos,
      formasPagamento,
      pendentes: { qtd: pendentesQtd, valor: pendentesValor },
    };

    // set() integral (não merge): o doc É a recomputação — idempotente
    tx.set(eventoRef.collection('financeiro').doc('current'), {
      ...financeiro,
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    // ∑ qtdInscritos — sincroniza só quando difere (no-op em reprocesso)
    if (eventoSnap.get('qtdInscritos') !== inscritos.total) {
      tx.update(eventoRef, {
        qtdInscritos: inscritos.total,
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    }

    return financeiro;
  });
}

// ---------------------------------------------------------------------------
// REPROCESSO (S825-T1): full-recompute de TODOS os `financeiro/current`
// ---------------------------------------------------------------------------

/**
 * Reprocessa o financeiro agregado de TODOS os eventos — a operação que anda
 * JUNTO com o deploy da série por forma de pagamento, no mesmo molde que a
 * RN-822 fixou para a demografia.
 *
 * POR QUE ELA É OBRIGATÓRIA E NÃO CONVENIÊNCIA. O gatilho desta Function é o
 * write de inscrito. Sem reprocesso, o `financeiro/current` de um evento que
 * já encerrou as inscrições NUNCA ganha a série — e um evento encerrado é
 * exatamente aquele cuja rosca o organizador quer olhar. A consolidação por
 * organizador trata série ausente como "não computada" e mantém o "em breve",
 * então o sintoma de esquecer este passo não é número errado: é a tela do
 * dono continuar prometendo o que o deploy já entregou.
 *
 * IDEMPOTENTE por construção: `recomputarFinanceiroEvento` é full recompute
 * transacional. Sequencial de propósito — operação administrativa pontual não
 * merece rajada de transações concorrentes contra a base.
 *
 * Execução (runbook), com credencial do projeto, DEPOIS do deploy:
 *   const { reprocessarFinanceiroTodosEventos } =
 *     require('./lib/functions/src/eventos/agregarFinanceiro');
 *   await reprocessarFinanceiroTodosEventos(admin.firestore());
 */
export async function reprocessarFinanceiroTodosEventos(
  db: Db
): Promise<{ eventos: number; falhas: string[] }> {
  // Só ids saem do storage (select vazio = nenhum campo) — zero PII aqui.
  const eventosSnap = await db.collection('eventos').select().get();
  const falhas: string[] = [];
  for (const docSnap of eventosSnap.docs) {
    try {
      await recomputarFinanceiroEvento(db, docSnap.id);
    } catch (err) {
      falhas.push(docSnap.id);
      logger.error('financeiro_reprocesso_falha', { eventoId: docSnap.id, err });
    }
  }
  logger.info('financeiro_reprocesso_concluido', {
    eventos: eventosSnap.size,
    falhas: falhas.length,
  });
  return { eventos: eventosSnap.size, falhas };
}

// ---------------------------------------------------------------------------
// Gatilho (Cloud Functions v1 — mesmo runtime dos módulos existentes)
// ---------------------------------------------------------------------------

/**
 * onWrite de inscrito → recomputa o financeiro do evento.
 * At-least-once safe: a recomputação é full — reprocessar não duplica.
 */
export const onInscritoWrite = functions.firestore
  .document('eventos/{eventoId}/inscritos/{inscritoId}')
  .onWrite(async (_change, context) => {
    const eventoId = context.params['eventoId'] as string;
    try {
      const financeiro = await recomputarFinanceiroEvento(
        admin.firestore(),
        eventoId
      );
      if (financeiro) {
        logger.info('financeiro_evento_recomputado', {
          eventoId,
          total: financeiro.inscritos.total,
          receitaBruta: financeiro.receitaBruta,
        });
      }
    } catch (err) {
      // Sem PII no log — só o id do evento (LGPD)
      logger.error('financeiro_evento_falha', { eventoId, err });
      throw err;
    }
  });
