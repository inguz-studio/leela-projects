// =============================================================================
// functions/src/eventos/agregarComunicacoes.ts
//
// Agregado ∑ do LOG DE COMUNICAÇÃO por Cloud Function (FABLE-G-T1 · Onda 2).
//
// Doc mantido: `eventos/{eventoId}/comunicacoesResumo/current` — escrita
// EXCLUSIVA de Function (Rules: write false; leitura owner/staff — é o
// histórico de comunicação do evento, dado pessoal por associação). É a
// visão POR EVENTO que a aba Comunicação (E06-L3) consome sem enumerar os
// N logs no cliente.
//
// FULL RECOMPUTE (idempotente por construção — MESMO padrão de
// `agregarFinanceiro`/rollups E16): recontagem via aggregate count() sobre a
// subcoleção `comunicacoes`, tudo numa única transação (snapshot-consistente
// — dois onWrite em corrida não persistem agregado stale). Reprocessar N
// vezes produz o MESMO doc — nada acumula. Como o log é FLAT por evento
// (decisão Kleppmann no core), cada contagem é query de igualdade de escopo
// de coleção — índice single-field automático, nenhum composto.
//
// Gatilho: onWrite de `eventos/{e}/comunicacoes/{c}` → recomputa. O write do
// resumo não redispara este gatilho (subcoleção diferente) — sem loop.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  CANAIS_LOG_COMUNICACAO,
  COLECAO_LOG_COMUNICACAO,
  COLECAO_RESUMO_COMUNICACOES,
  DOC_RESUMO_COMUNICACOES,
  STATUS_LOG_COMUNICACAO,
  TIPOS_LOG_COMUNICACAO,
} from '@leela/core';
import type {
  CanalLogComunicacao,
  ResumoComunicacoes,
  StatusLogComunicacao,
  TipoLogComunicacao,
} from '@leela/core';

type Db = admin.firestore.Firestore;

/**
 * Recomputa o resumo de comunicações do evento DO ZERO e persiste
 * `comunicacoesResumo/current` com set() integral (substituição total —
 * idempotente). 11 contagens agregadas (1 total + 5 status + 2 canais +
 * 3 tipos) no MESMO snapshot transacional.
 *
 * @returns o resumo recomputado, ou null quando o evento não existe
 *          (log órfão de evento deletado — nada a manter).
 */
export async function recomputarResumoComunicacoes(
  db: Db,
  eventoId: string
): Promise<ResumoComunicacoes | null> {
  return db.runTransaction(async (tx) => {
    const eventoRef = db.collection('eventos').doc(eventoId);
    const eventoSnap = await tx.get(eventoRef);
    if (!eventoSnap.exists) return null;

    const tenantId = (eventoSnap.get('tenantId') as string) ?? '';
    const col = eventoRef.collection(COLECAO_LOG_COMUNICACAO);

    const count = async (q: FirebaseFirestore.Query): Promise<number> =>
      (await tx.get(q.count())).data().count;

    const total = await count(col);

    const porStatus = {} as Record<StatusLogComunicacao, number>;
    for (const status of STATUS_LOG_COMUNICACAO) {
      porStatus[status] = await count(col.where('status', '==', status));
    }

    const porCanal = {} as Record<CanalLogComunicacao, number>;
    for (const canal of CANAIS_LOG_COMUNICACAO) {
      porCanal[canal] = await count(col.where('canal', '==', canal));
    }

    const porTipo = {} as Record<TipoLogComunicacao, number>;
    for (const tipo of TIPOS_LOG_COMUNICACAO) {
      porTipo[tipo] = await count(col.where('tipo', '==', tipo));
    }

    const resumo: ResumoComunicacoes = {
      tenantId,
      total,
      porStatus,
      porCanal,
      porTipo,
    };

    // set() integral (não merge): o doc É a recomputação — idempotente
    tx.set(
      eventoRef
        .collection(COLECAO_RESUMO_COMUNICACOES)
        .doc(DOC_RESUMO_COMUNICACOES),
      { ...resumo, atualizadoEm: FieldValue.serverTimestamp() }
    );

    return resumo;
  });
}

/**
 * onWrite de log de comunicação → recomputa o resumo do evento.
 * At-least-once safe: a recomputação é full — reprocessar não duplica.
 */
export const onComunicacaoWrite = functions.firestore
  .document('eventos/{eventoId}/comunicacoes/{comunicacaoId}')
  .onWrite(async (_change, context) => {
    const eventoId = context.params['eventoId'] as string;
    try {
      const resumo = await recomputarResumoComunicacoes(
        admin.firestore(),
        eventoId
      );
      if (resumo) {
        logger.info('resumo_comunicacoes_recomputado', {
          eventoId,
          total: resumo.total,
        });
      }
    } catch (err) {
      // Sem PII no log — só o id do evento (LGPD)
      logger.error('resumo_comunicacoes_falha', { eventoId, err });
      throw err;
    }
  });
