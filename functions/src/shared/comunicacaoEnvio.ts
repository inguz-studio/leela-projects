// =============================================================================
// functions/src/shared/comunicacaoEnvio.ts
//
// ENVELOPE GENÉRICO de envio de comunicação (E06-L1-T1 · Camada B).
// Extraído de `clubs/onComunicadoEnvio.ts` (S108-T1): guarda de idempotência
// (status 'enviado' → no-op), janela deslizante de 7 dias do limite de push
// (RN-133) e carimbo `status='enviado' + enviadoEm + alcance` — agora
// parametrizados pela COLEÇÃO (comunicados do clube OU campanhas do evento)
// e por um callback de alcance. `onComunicadoEnvio` (clube) e
// `enviarCampanha` (evento) são cascas finas sobre este módulo.
//
// Contratos (preservados 1:1 do clube — baseline E05 é o teste de regressão):
//   - LIMITE RN-133: janela DESLIZANTE de 7 dias contada de `agora` —
//     mais estrita e determinística que semana-calendário. Só docs com canal
//     push contam; email-only não consome cota. PUSH_SEMANA_MAX vem da fonte
//     única `core/comunicacao` — NUNCA redeclarar.
//   - IDEMPOTENTE: reenviar um doc já 'enviado' é no-op (não duplica alcance
//     nem consome cota de novo) — retry-safe.
//   - TRANSACIONAL (fix #05 do review Onda1): get do doc + contagem da cota
//     + update rodam numa runTransaction — check-then-act concorrente não
//     fura a cota RN-133 nem carimba duas vezes. A query da janela roda
//     DENTRO da tx: commit concorrente na janela invalida e re-conta.
//   - ALCANCE: delegado ao domínio via `calcularAlcance(tx, snap)` — o clube
//     reconta membros não-inativos p/ 'todos'; o evento reconta inscritos
//     ativos p/ 'todos_inscritos'; segmentos específicos usam a fotografia
//     `segmento.tamanhoEstimado` (cada casca decide).
//
// O disparo físico de push/email é MOCK em V1 (padrão PaymentProvider/
// ADR-006) — este módulo é a máquina de estados; o registro por
// destinatário vive no LOG de comunicação (FABLE-G, RN-219).
// =============================================================================

import type { firestore } from 'firebase-admin';
import { PUSH_SEMANA_MAX, temCanalPush } from '@leela/core';

const DIA_MS = 24 * 60 * 60 * 1000;

/** Janela deslizante do limite RN-133 (7 dias) */
export const JANELA_PUSH_DIAS = 7;

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface EnvioResultado {
  enviado: boolean;
  motivo:
    | 'ok'
    | 'ja_enviado'
    | 'limite_push_semana'
    | 'comunicado_invalido'
    | 'nao_elegivel';
  /** Push enviados na janela (para copy de erro na tela) */
  pushNaJanela?: number;
}

/**
 * Guarda de elegibilidade do CALLER, avaliada DENTRO da transação sobre o
 * snap fresco (fix TOCTOU — review antagonista O3-L4 #1): o cron varre e
 * SÓ depois dispara; entre a query e a tx o organizador pode ter voltado a
 * campanha para rascunho ou adiado o agendamento. `false` ⇒ aborta com
 * 'nao_elegivel' SEM carimbar e SEM consumir cota. Omitida ⇒ comportamento
 * original (o disparo manual não exige estado 'agendado').
 */
export type ElegivelParaEnvio = (
  snap: firestore.DocumentSnapshot
) => boolean;

/** Callback de alcance do domínio — roda DENTRO da transação de envio. */
export type CalcularAlcance = (
  tx: firestore.Transaction,
  snap: firestore.DocumentSnapshot
) => Promise<number>;

// ---------------------------------------------------------------------------
// Limite de push (RN-133) — janela deslizante sobre uma coleção qualquer
// ---------------------------------------------------------------------------

/** Query canônica da janela: enviados, com push, dentro dos últimos 7 dias. */
function queryPushNaJanela(
  colecao: firestore.CollectionReference,
  agora: Date
): firestore.Query {
  const inicioJanela = new Date(agora.getTime() - JANELA_PUSH_DIAS * DIA_MS);
  return colecao
    .where('status', '==', 'enviado')
    .where('canal', 'array-contains', 'push')
    .where('enviadoEm', '>=', inicioJanela);
}

/**
 * Conta docs ENVIADOS com canal push na janela deslizante de 7 dias da
 * coleção dada (comunicados do clube ou campanhas do evento).
 * `exceto` exclui o próprio doc (defesa contra recontagem em retry parcial).
 */
export async function contarPushNaJanelaColecao(
  colecao: firestore.CollectionReference,
  agora: Date,
  exceto?: string
): Promise<number> {
  const enviados = await queryPushNaJanela(colecao, agora).get();
  return enviados.docs.filter((d) => d.id !== exceto).length;
}

// ---------------------------------------------------------------------------
// Envio (envelope transacional)
// ---------------------------------------------------------------------------

/**
 * Executa o envio de uma comunicação da `colecao`: valida RN-133, calcula o
 * alcance via callback do domínio e carimba status='enviado' + enviadoEm +
 * alcance. Idempotente para retry e TRANSACIONAL — cota e carimbo são
 * serializados pela runTransaction (dois envios concorrentes não furam o
 * limite nem carimbam duas vezes).
 */
export async function executarEnvioComunicacao(
  db: firestore.Firestore,
  colecao: firestore.CollectionReference,
  docId: string,
  calcularAlcance: CalcularAlcance,
  agora: Date = new Date(),
  elegivel?: ElegivelParaEnvio
): Promise<EnvioResultado> {
  const docRef = colecao.doc(docId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) {
      return { enviado: false, motivo: 'comunicado_invalido' as const };
    }

    // Idempotência: reenvio de doc já enviado é no-op (retry-safe)
    if (snap.get('status') === 'enviado') {
      return { enviado: false, motivo: 'ja_enviado' as const };
    }

    // Guarda do caller sobre o snap FRESCO (anti-TOCTOU — só o cron usa):
    // roda APÓS o guard de 'enviado' (ja_enviado continua vencendo, p/ o
    // retry curar fan-out) e ANTES de cota/carimbo.
    if (elegivel !== undefined && !elegivel(snap)) {
      return { enviado: false, motivo: 'nao_elegivel' as const };
    }

    const canal = (snap.get('canal') ?? []) as string[];

    // RN-133: o 5º push da janela é bloqueado (email-only não conta).
    // Query DENTRO da tx: commit concorrente na janela invalida e re-conta.
    if (temCanalPush(canal as never)) {
      const enviados = await tx.get(queryPushNaJanela(colecao, agora));
      const pushNaJanela = enviados.docs.filter((d) => d.id !== docId).length;
      if (pushNaJanela >= PUSH_SEMANA_MAX) {
        return {
          enviado: false,
          motivo: 'limite_push_semana' as const,
          pushNaJanela,
        };
      }
    }

    const alcance = await calcularAlcance(tx, snap);

    tx.update(docRef, {
      status: 'enviado',
      enviadoEm: agora,
      alcance,
    });

    return { enviado: true, motivo: 'ok' as const };
  });
}
