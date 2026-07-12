// =============================================================================
// functions/src/eventos/logComunicacao.ts
//
// Escrita server-side do LOG DE COMUNICAÇÃO (LEELA-FABLE-G-T1 · Onda 2).
// Coleção: `eventos/{eventoId}/comunicacoes/{comunicacaoId}` — escrita
// EXCLUSIVA de Function (Rules: write false); o envio físico é server-side
// e o status vem de webhook de provider.
//
// Contratos (Kleppmann/Schneier — ver core/comms/logComunicacao.ts):
//   - `registrarComunicacao` = hasSent+markSent ATÔMICOS (RN-219): o docId
//     é determinístico ({destinatario}_{chave}_{canal}) e a transação
//     verifica existência antes de criar — reprocessar o webhook de
//     pagamento deriva o MESMO id, colide, e o e-mail NÃO é reenviado.
//     Registrar-antes-de-enviar = at-most-once (a política que RN-219 pede);
//     um `enfileirado` órfão de crash é recuperável (enfileirado→enviado
//     continua transição válida — sweeper futuro).
//   - `tenantId` NUNCA vem do chamador: é lido do evento pai NA MESMA
//     transação (ADR-009 — chamador não carimba tenant alheio).
//   - `aplicarEventoProvedorNoLog` aplica webhooks at-least-once e fora de
//     ordem via merge monotônico puro do core (reaplicar = no-op).
//   - Validação fail-fast: o doc é passado por `parseLogComunicacao` ANTES
//     do write — Function nunca persiste log fora do shape canônico.
//
// Consumidores: S1206-T3 (disparo do e-mail do ingresso no webhook
// confirmado) e E06-L2 (enviarCampanha faz fan-out chamando registrar por
// destinatário). O agregado ∑ é mantido por `agregarComunicacoes.ts`.
// =============================================================================

import * as admin from 'firebase-admin';
import {
  aplicarEventoProvedor,
  chaveLogComunicacao,
  COLECAO_LOG_COMUNICACAO,
  logComunicacaoDocId,
  parseLogComunicacao,
} from '@leela/core';
import type {
  CanalLogComunicacao,
  DestinatarioComunicacao,
  EventoProvedor,
  TipoLogComunicacao,
} from '@leela/core';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface RegistrarComunicacaoParams {
  destinatario: DestinatarioComunicacao;
  canal: CanalLogComunicacao;
  tipo: TipoLogComunicacao;
  /**
   * Referência da chave de idempotência (ver `chaveLogComunicacao`):
   * campanhaRef p/ tipo 'campanha'; subtipo estável (ex.: 'emailConfirmacao')
   * p/ 'transacional'; ignorada p/ 'ingresso'.
   */
  chaveRef?: string;
  /** Assunto/título curto — NUNCA o corpo (PII mínima) */
  assunto: string;
  templateRef?: string;
}

export interface RegistrarComunicacaoResult {
  registrada: boolean;
  motivo: 'ok' | 'ja_registrada' | 'evento_inexistente';
  comunicacaoId: string;
}

export interface AplicarEventoProvedorResult {
  atualizada: boolean;
  motivo: 'ok' | 'nao_encontrada' | 'sem_mudanca';
}

// ---------------------------------------------------------------------------
// Registro idempotente (markSent — RN-219)
// ---------------------------------------------------------------------------

/**
 * Registra uma comunicação como `enfileirado` — IDEMPOTENTE por docId
 * determinístico, transacional (check-then-create serializado pela tx).
 *
 * `{ registrada: false, motivo: 'ja_registrada' }` É o sinal de hasSent:
 * o chamador NÃO reenvia (RN-219 — reprocesso de webhook não duplica
 * e-mail). tenantId sai do evento pai (ADR-009), nunca do chamador.
 */
export async function registrarComunicacao(
  db: Db,
  eventoId: string,
  params: RegistrarComunicacaoParams,
  agora: Date = new Date()
): Promise<RegistrarComunicacaoResult> {
  // Fail-fast FORA da tx: chave/docId inválidos lançam antes de qualquer IO.
  const chave = chaveLogComunicacao(params.tipo, params.chaveRef);
  const comunicacaoId = logComunicacaoDocId(
    params.destinatario.ref,
    chave,
    params.canal
  );

  const eventoRef = db.collection('eventos').doc(eventoId);
  const logRef = eventoRef
    .collection(COLECAO_LOG_COMUNICACAO)
    .doc(comunicacaoId);

  return db.runTransaction(async (tx) => {
    const eventoSnap = await tx.get(eventoRef);
    if (!eventoSnap.exists) {
      return {
        registrada: false,
        motivo: 'evento_inexistente' as const,
        comunicacaoId,
      };
    }

    const existente = await tx.get(logRef);
    if (existente.exists) {
      // hasSent: o registro JÁ existe — não reenviar (RN-219).
      return {
        registrada: false,
        motivo: 'ja_registrada' as const,
        comunicacaoId,
      };
    }

    const doc: Record<string, unknown> = {
      tenantId: eventoSnap.get('tenantId') as string,
      eventoId,
      destinatario: {
        tipo: params.destinatario.tipo,
        ref: params.destinatario.ref,
      },
      canal: params.canal,
      tipo: params.tipo,
      chave,
      status: 'enfileirado',
      assunto: params.assunto,
      enfileiradoEm: admin.firestore.Timestamp.fromDate(agora),
    };
    if (params.tipo === 'campanha') {
      doc['campanhaRef'] = chave;
    }
    if (params.templateRef !== undefined) {
      doc['templateRef'] = params.templateRef;
    }

    // Fail-fast: a Function nunca persiste log fora do shape canônico.
    parseLogComunicacao(comunicacaoId, doc);

    tx.set(logRef, doc);
    return { registrada: true, motivo: 'ok' as const, comunicacaoId };
  });
}

/**
 * hasSent read-only (fora de fluxo de envio — ex.: UI server-side).
 * Para DECIDIR um envio use `registrarComunicacao` (check+mark atômicos);
 * este helper é consulta, não guarda de idempotência.
 */
export async function jaComunicado(
  db: Db,
  eventoId: string,
  destinatarioRef: string,
  tipo: TipoLogComunicacao,
  canal: CanalLogComunicacao,
  chaveRef?: string
): Promise<boolean> {
  const chave = chaveLogComunicacao(tipo, chaveRef);
  const snap = await db
    .collection('eventos')
    .doc(eventoId)
    .collection(COLECAO_LOG_COMUNICACAO)
    .doc(logComunicacaoDocId(destinatarioRef, chave, canal))
    .get();
  return snap.exists;
}

// ---------------------------------------------------------------------------
// Webhooks de status do provider (at-least-once, fora de ordem)
// ---------------------------------------------------------------------------

/**
 * Aplica um evento de provider (enviado/entregue/aberto/falhou) ao log —
 * transacional + merge MONOTÔNICO puro do core: reaplicar o mesmo evento é
 * `sem_mudanca` (nenhum write); eventos fora de ordem só preenchem carimbo
 * ausente e nunca regridem o status.
 */
export async function aplicarEventoProvedorNoLog(
  db: Db,
  eventoId: string,
  comunicacaoId: string,
  evento: EventoProvedor
): Promise<AplicarEventoProvedorResult> {
  const logRef = db
    .collection('eventos')
    .doc(eventoId)
    .collection(COLECAO_LOG_COMUNICACAO)
    .doc(comunicacaoId);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(logRef);
    if (!snap.exists) {
      return { atualizada: false, motivo: 'nao_encontrada' as const };
    }

    // Parse fail-fast: merge só roda sobre log íntegro.
    const log = parseLogComunicacao(
      comunicacaoId,
      snap.data() as Record<string, unknown>
    );

    const mudancas = aplicarEventoProvedor(log, evento);
    if (mudancas === null) {
      return { atualizada: false, motivo: 'sem_mudanca' as const };
    }

    tx.update(logRef, mudancas);
    return { atualizada: true, motivo: 'ok' as const };
  });
}

/**
 * Localiza o docId do log pelo id de mensagem do provider (correlação de
 * webhook). Escopado ao EVENTO (o provider carrega eventoId/comunicacaoId
 * como metadata do envio; este lookup é o fallback quando só o
 * providerMessageId volta) — query de igualdade single-field, sem índice
 * composto. Retorna null quando não há correspondência.
 */
export async function localizarPorProviderMessageId(
  db: Db,
  eventoId: string,
  providerMessageId: string
): Promise<string | null> {
  if (providerMessageId.length === 0) return null;
  const snap = await db
    .collection('eventos')
    .doc(eventoId)
    .collection(COLECAO_LOG_COMUNICACAO)
    .where('providerMessageId', '==', providerMessageId)
    .limit(1)
    .get();
  const primeiro = snap.docs[0];
  return primeiro !== undefined ? primeiro.id : null;
}
