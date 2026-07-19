// =============================================================================
// functions/src/finance/requestTransfer.ts
//
// Transferência de titularidade / troca de ingresso — Function
// (LEELA-S904-T4 · E09 · RN-343/344/345 · ADR-011).
// Subcoleção: `eventos/{eventoId}/transferencias/{transferenciaId}` (write
// só Function; leitura de gestão via Rules).
//
// tipo='titularidade' (RN-343/345) — EXECUTA na transação:
//   guards puros do core (`podeTransferirTitularidade`): inscrição
//   confirmada, kit NÃO entregue, chip NÃO vinculado, sem check-in, flag
//   ligada e janela aberta (política S305). Kit com item tamanhado ⇒
//   `novoTitular.tamanhos` OBRIGATÓRIO com as MESMAS chaves (RN-345 — o
//   tamanho é do corpo do novo titular, nunca herdado). Efeitos atômicos:
//   inscrito (atletaNome/dadosPessoais/tamanhos + titularHistorico[] append)
//   + doc de transferência 'concluida'. O PAGAMENTO permanece na MESMA
//   inscrição (ADR-011); a taxa da política (RN-343) entra como
//   `diffCobrada` (registro — cobrança é do fluxo de checkout).
//
// tipo='ingresso' (RN-344) — SÓ REGISTRO ('registrada'): deriva
//   `diffCobrada` do lote vigente da modalidade destino (ADR-012) e NÃO
//   aplica nada ao inscrito. DIRECTIVE: trocar `modalidade` fora do checkout
//   corromperia a contagem `vendidos` por lote (RN-300/ratchet) e a
//   capacidade (RN-304) — a aplicação + cobrança são do fluxo de checkout.
//
// IDEMPOTÊNCIA (retry de callable):
//   titularidade → docId determinístico `{inscritoId}-t{n}` (n = tamanho da
//     trilha + 1, lido NA transação); retry após sucesso detecta a última
//     entrada da trilha com o MESMO novo nome e devolve replay sem efeito.
//   ingresso → docId `{inscritoId}-ing-{novaModalidade}` (um registro por
//     destino); retry devolve o existente.
//
// GUARDS (Schneier): só ORGANIZADOR (tenant_owner/staff do tenant DO
// PEDIDO — assertTenantWriter); cross-tenant nega (RN-400). Self-service do
// atleta é E13-S1316 (fora deste lote).
//
// PREMISSA REGISTRADA: docs financeiros (pedido/pagamento/ledger) CONGELAM o
// titular da COMPRA — não são reescritos na transferência; o titular vigente
// vive no inscrito (`atletaNome` + trilha). `atletaId` também permanece (o
// vínculo de conta do novo titular é do app do atleta — E13).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  diffTrocaIngresso,
  exigeRecoletaTamanhos,
  gradeDoDocItemKit,
  isTipoTransferencia,
  loteAtivo,
  parseDadosPessoais,
  parseInscrito,
  parseLote,
  parseSufixoTamanho,
  podeTransferirTitularidade,
  podeTrocarIngresso,
  roundMoney,
  tamanhosDoCorte,
  type AuthClaims,
  type EstadoTransferencia,
  type Inscrito,
  type ItemPedido,
  type Lote,
  type NovoTitularDados,
  type StatusPedido,
  type TipoTransferencia,
  type TitularHistoricoEntry,
} from '@leela/core';
import {
  assertTenantAtivo,
  assertTenantWriter,
  type EventoCaller,
} from '../eventos/criarEvento';
import { lerPoliticaVendasTx } from './requestRefund';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Nome da subcoleção de transferências (write só Function). */
export const TRANSFERENCIAS_SUBCOL = 'transferencias';

export const NOME_TITULAR_MIN = 3;
export const NOME_TITULAR_MAX = 120;

export interface RequestTransferInput {
  pedidoId: string;
  inscritoId: string;
  tipo: TipoTransferencia;
  /** Obrigatório em tipo='titularidade'. */
  novoTitular?: NovoTitularDados;
  /** Obrigatório em tipo='ingresso'. */
  novaModalidade?: string;
}

export interface RequestTransferResult {
  eventoId: string;
  inscritoId: string;
  transferenciaId: string;
  tipo: TipoTransferencia;
  estado: EstadoTransferencia;
  /** Diferença/taxa registrada a cobrar (R$ — cobrança é do checkout). */
  diffCobrada: number;
  /** true = retry idempotente, nenhum efeito novo. */
  replay: boolean;
}

/** Valida o input bruto. @pure */
export function validarRequestTransferInput(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Input é obrigatório.'];
  }
  const input = raw as Record<string, unknown>;
  const erros: string[] = [];
  for (const campo of ['pedidoId', 'inscritoId'] as const) {
    const v = input[campo];
    if (typeof v !== 'string' || v.length === 0 || v.includes('/')) {
      erros.push(`"${campo}" é obrigatório (sem "/").`);
    }
  }
  if (!isTipoTransferencia(input['tipo'])) {
    erros.push('"tipo" deve ser "titularidade" ou "ingresso".');
  }
  if (input['tipo'] === 'titularidade') {
    const nt = input['novoTitular'] as Record<string, unknown> | undefined;
    const nome = nt?.['nome'];
    if (
      !nt ||
      typeof nome !== 'string' ||
      nome.trim().length < NOME_TITULAR_MIN ||
      nome.trim().length > NOME_TITULAR_MAX
    ) {
      erros.push(
        `"novoTitular.nome" é obrigatório (${NOME_TITULAR_MIN}–${NOME_TITULAR_MAX} caracteres).`
      );
    }
    const tamanhos = nt?.['tamanhos'];
    if (
      tamanhos !== undefined &&
      (tamanhos === null || typeof tamanhos !== 'object' || Array.isArray(tamanhos))
    ) {
      erros.push('"novoTitular.tamanhos" deve ser mapa itemId→tamanho.');
    }
  }
  if (input['tipo'] === 'ingresso') {
    const nm = input['novaModalidade'];
    if (typeof nm !== 'string' || nm.length === 0) {
      erros.push('"novaModalidade" é obrigatória em tipo="ingresso".');
    }
  }
  return erros;
}

// ---------------------------------------------------------------------------
// Núcleo (testável contra o Emulator)
// ---------------------------------------------------------------------------

export async function requestTransferCore(
  db: Db,
  rawInput: unknown,
  caller: EventoCaller,
  agora: Date = new Date()
): Promise<RequestTransferResult> {
  const tenantId = assertTenantWriter(caller.claims);
  const erros = validarRequestTransferInput(rawInput);
  if (erros.length > 0) {
    throw new https.HttpsError(
      'invalid-argument',
      `RequestTransferInput inválido: ${erros.join(' ')}`
    );
  }
  const input = rawInput as unknown as RequestTransferInput;

  await assertTenantAtivo(db, tenantId);

  const pedidoRef = db.collection('pedidos').doc(input.pedidoId);

  const resultado = await db.runTransaction(async (tx) => {
    // ── LEITURAS ───────────────────────────────────────────────────────────
    const pedidoSnap = await tx.get(pedidoRef);
    if (!pedidoSnap.exists) {
      throw new https.HttpsError('not-found', `Pedido '${input.pedidoId}' não existe.`);
    }
    if (pedidoSnap.get('tenantId') !== tenantId) {
      throw new https.HttpsError('permission-denied', 'Pedido pertence a outro tenant (RN-400).');
    }
    if ((pedidoSnap.get('status') as StatusPedido) !== 'pago') {
      throw new https.HttpsError(
        'failed-precondition',
        `Pedido '${input.pedidoId}' está '${String(pedidoSnap.get('status'))}' — só pedido pago transfere.`
      );
    }
    const inscritoRefs = (pedidoSnap.get('inscritoRefs') as string[]) ?? [];
    if (!inscritoRefs.includes(input.inscritoId)) {
      throw new https.HttpsError(
        'failed-precondition',
        `Inscrito '${input.inscritoId}' não pertence ao pedido '${input.pedidoId}' (ADR-011).`
      );
    }
    const eventoId = pedidoSnap.get('eventoId') as string;
    const eventoRef = db.collection('eventos').doc(eventoId);
    const inscritoRef = eventoRef.collection('inscritos').doc(input.inscritoId);

    const [eventoSnap, inscritoSnap] = await Promise.all([
      tx.get(eventoRef),
      tx.get(inscritoRef),
    ]);
    if (!eventoSnap.exists) {
      throw new https.HttpsError('internal', `Evento '${eventoId}' do pedido não existe.`);
    }
    if (!inscritoSnap.exists) {
      throw new https.HttpsError('not-found', `Inscrito '${input.inscritoId}' não existe.`);
    }
    const inscrito: Inscrito = parseInscrito(
      inscritoSnap.id,
      inscritoSnap.data() as Record<string, unknown>
    );
    const dataEvento = eventoSnap.get('data') as Timestamp | undefined;
    if (!dataEvento) {
      throw new https.HttpsError('internal', 'Evento sem data — janela de política inderivável.');
    }
    const politica = await lerPoliticaVendasTx(tx, db, eventoId, tenantId);
    const transferenciasCol = eventoRef.collection(TRANSFERENCIAS_SUBCOL);
    const agoraTs = FieldValue.serverTimestamp();

    // ── TIPO 'titularidade' — executa (RN-343/345) ─────────────────────────
    if (input.tipo === 'titularidade') {
      const novoTitular = input.novoTitular as NovoTitularDados;
      const nomeNovo = novoTitular.nome.trim();
      const trilha: TitularHistoricoEntry[] = inscrito.titularHistorico ?? [];

      // Replay idempotente: a última transferência JÁ instalou este titular.
      const ultima = trilha[trilha.length - 1];
      if (ultima !== undefined && ultima.nomeNovo === nomeNovo && inscrito.atletaNome === nomeNovo) {
        return {
          eventoId,
          inscritoId: input.inscritoId,
          transferenciaId: ultima.transferenciaRef,
          tipo: 'titularidade' as const,
          estado: 'concluida' as const,
          diffCobrada: roundMoney(politica.transferencia.taxa),
          replay: true,
        };
      }

      const guarda = podeTransferirTitularidade(
        inscrito,
        politica.transferencia,
        dataEvento,
        agora
      );
      if (!guarda.ok) {
        throw new https.HttpsError('failed-precondition', guarda.motivo ?? 'Transferência bloqueada.');
      }

      // RN-345: kit com item tamanhado ⇒ recoleta OBRIGATÓRIA cobrindo as
      // MESMAS chaves (tamanho é do corpo do novo titular).
      let tamanhosNovos: Record<string, string> | undefined;
      if (exigeRecoletaTamanhos(inscrito)) {
        const recoletados = novoTitular.tamanhos ?? {};
        const chavesEsperadas = Object.keys(inscrito.tamanhos).sort();
        const chavesRecoletadas = Object.keys(recoletados).sort();
        const cobre =
          chavesEsperadas.length === chavesRecoletadas.length &&
          chavesEsperadas.every(
            (k, i) =>
              k === chavesRecoletadas[i] &&
              typeof recoletados[k] === 'string' &&
              (recoletados[k] as string).length > 0
          );
        if (!cobre) {
          throw new https.HttpsError(
            'invalid-argument',
            `Kit tem item tamanhado — recolete o tamanho do novo titular para: ${chavesEsperadas.join(', ')} (RN-345).`
          );
        }
        // RN-231 (fix A1 da review antagonista TAMANHOS-GRADE): o valor
        // recoletado é o SUFIXO de SKU ('M' | 'feminina__M') e este callable
        // é um PRODUTOR de escrita de `inscrito.tamanhos` — a validação na
        // origem cobre TODAS as origens, não só o checkout. Sufixo malformado
        // ou fora da grade EFETIVA do item ⇒ rejeita ANTES de escrever
        // (senão o recompute 2D decrementaria o SKU antigo e o valor novo não
        // casaria com SKU nenhum — a camiseta do atleta sumiria da contagem).
        for (const [itemId, sufixo] of Object.entries(recoletados)) {
          const decomposto =
            sufixo.length > 0 ? parseSufixoTamanho(sufixo) : null;
          if (decomposto === null) {
            throw new https.HttpsError(
              'invalid-argument',
              `Tamanho de '${itemId.slice(0, 80)}' fora do padrão tamanho ou corte__tamanho (RN-231/RN-345).`
            );
          }
          const itemSnap = await tx.get(db.collection('itensKit').doc(itemId));
          // Fail-closed como no checkout: item fora do catálogo nunca
          // legitima um SKU (a chave veio de checkout validado; o catálogo
          // sumir depois é dado corrompido — intervenção do organizador).
          if (!itemSnap.exists) {
            throw new https.HttpsError(
              'failed-precondition',
              `Item '${itemId.slice(0, 80)}' não existe mais no catálogo do evento (RN-345).`
            );
          }
          const daGrade = tamanhosDoCorte(
            gradeDoDocItemKit(itemSnap.data() ?? {}),
            decomposto.corte
          );
          if (!daGrade.includes(decomposto.tamanho)) {
            throw new https.HttpsError(
              'invalid-argument',
              `Tamanho de '${itemId.slice(0, 80)}' fora da grade do item (corte ${decomposto.corte}) — RN-231/RN-345.`
            );
          }
        }
        tamanhosNovos = recoletados;
      }

      // Bloco [reg] do novo titular: quando fornecido, valida fail-fast.
      if (novoTitular.dadosPessoais !== undefined) {
        parseDadosPessoais(`novoTitular de ${input.inscritoId}`, novoTitular.dadosPessoais);
      }

      const transferenciaId = `${input.inscritoId}-t${trilha.length + 1}`;
      const transferenciaRef = transferenciasCol.doc(transferenciaId);
      const taxa = roundMoney(politica.transferencia.taxa);

      const entrada: Omit<TitularHistoricoEntry, 'em'> & { em: Timestamp } = {
        nomeAnterior: inscrito.atletaNome,
        nomeNovo,
        transferenciaRef: transferenciaId,
        // Timestamp REAL (serverTimestamp não entra em arrayUnion/array).
        em: Timestamp.fromDate(agora),
        por: caller.uid,
      };

      tx.create(transferenciaRef, {
        id: transferenciaId,
        tenantId,
        eventoId,
        pedidoId: input.pedidoId,
        inscritoId: input.inscritoId,
        tipo: 'titularidade',
        estado: 'concluida',
        titularAnterior: { atletaId: inscrito.atletaId, nome: inscrito.atletaNome },
        novoTitular: {
          nome: nomeNovo,
          ...(novoTitular.dadosPessoais !== undefined
            ? { dadosPessoais: novoTitular.dadosPessoais }
            : {}),
          ...(tamanhosNovos !== undefined ? { tamanhos: tamanhosNovos } : {}),
        },
        diffCobrada: taxa,
        criadoEm: agoraTs,
        criadoPor: caller.uid,
      });
      tx.update(inscritoRef, {
        atletaNome: nomeNovo,
        ...(novoTitular.dadosPessoais !== undefined
          ? { dadosPessoais: novoTitular.dadosPessoais }
          : {}),
        ...(tamanhosNovos !== undefined ? { tamanhos: tamanhosNovos } : {}),
        titularHistorico: [...trilha, entrada],
        atualizadoEm: agoraTs,
      });

      return {
        eventoId,
        inscritoId: input.inscritoId,
        transferenciaId,
        tipo: 'titularidade' as const,
        estado: 'concluida' as const,
        diffCobrada: taxa,
        replay: false,
      };
    }

    // ── TIPO 'ingresso' — só registro (RN-344) ─────────────────────────────
    const novaModalidade = input.novaModalidade as string;
    const transferenciaId = `${input.inscritoId}-ing-${novaModalidade}`;
    const transferenciaRef = transferenciasCol.doc(transferenciaId);
    const existente = await tx.get(transferenciaRef);
    if (existente.exists) {
      return {
        eventoId,
        inscritoId: input.inscritoId,
        transferenciaId,
        tipo: 'ingresso' as const,
        estado: existente.get('estado') as EstadoTransferencia,
        diffCobrada: existente.get('diffCobrada') as number,
        replay: true,
      };
    }

    const modalidades = (eventoSnap.get('modalidades') as string[]) ?? [];
    const guarda = podeTrocarIngresso(
      inscrito,
      novaModalidade,
      modalidades,
      politica.trocaIngresso,
      dataEvento,
      agora
    );
    if (!guarda.ok) {
      throw new https.HttpsError('failed-precondition', guarda.motivo ?? 'Troca bloqueada.');
    }

    // Lote vigente do destino (ADR-012 — lote pertence à modalidade).
    const lotesSnap = await tx.get(
      eventoRef.collection('lotes').where('modalidade', '==', novaModalidade)
    );
    const lotes: Lote[] = lotesSnap.docs.map((d) =>
      parseLote(d.id, d.data() as Record<string, unknown>)
    );
    const vigente = loteAtivo(lotes, agora);
    if (vigente === null) {
      throw new https.HttpsError(
        'failed-precondition',
        `Modalidade '${novaModalidade}' sem lote vigente — troca indisponível agora (ADR-012).`
      );
    }

    const itens = (pedidoSnap.get('itens') as ItemPedido[]) ?? [];
    const item = itens.find((i) => i?.inscritoRef === input.inscritoId);
    if (!item || typeof item.valorFinal !== 'number') {
      throw new https.HttpsError(
        'internal',
        `Pedido sem linha do inscrito '${input.inscritoId}' — decomposição corrompida (ADR-011).`
      );
    }
    const diff = diffTrocaIngresso(vigente.preco, item.valorFinal, politica.trocaIngresso);

    // DIRECTIVE: NÃO tocar inscrito.modalidade aqui — a aplicação (e a
    // cobrança do diff) são do fluxo de checkout; mudar modalidade fora dele
    // corromperia vendidos/capacidade por lote (RN-300/RN-304/ADR-012).
    tx.create(transferenciaRef, {
      id: transferenciaId,
      tenantId,
      eventoId,
      pedidoId: input.pedidoId,
      inscritoId: input.inscritoId,
      tipo: 'ingresso',
      estado: 'registrada',
      titularAnterior: { atletaId: inscrito.atletaId, nome: inscrito.atletaNome },
      novaModalidade,
      diffCobrada: diff,
      criadoEm: agoraTs,
      criadoPor: caller.uid,
    });

    return {
      eventoId,
      inscritoId: input.inscritoId,
      transferenciaId,
      tipo: 'ingresso' as const,
      estado: 'registrada' as const,
      diffCobrada: diff,
      replay: false,
    };
  });

  logger.info('transferencia_processada', {
    eventoId: resultado.eventoId,
    inscritoId: resultado.inscritoId,
    transferenciaId: resultado.transferenciaId,
    tipo: resultado.tipo,
    estado: resultado.estado,
    diffCobrada: resultado.diffCobrada,
    replay: resultado.replay,
    uid: caller.uid,
  });

  return resultado;
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

export const requestTransfer = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return requestTransferCore(admin.firestore(), data, {
    uid: context.auth.uid,
    claims: context.auth.token as unknown as AuthClaims,
  });
});
