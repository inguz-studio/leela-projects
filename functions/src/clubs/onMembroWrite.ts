// =============================================================================
// functions/src/clubs/onMembroWrite.ts
//
// Trigger Firestore: mantém `membros.status` (derivado, RN-102) e o agregado
// ∑ `clubes.qtdMembrosAtivos` a cada write em membros (S103-T1).
//
// Idempotência/retry (aceite do lote E05-L1):
//   - status: derivação determinística por data; regravar o mesmo valor é
//     detectado e vira no-op (sem loop de trigger);
//   - agregado: RECONTAGEM via count() — reprocessar o mesmo evento nunca
//     duplica (increment é proibido aqui por não ser retry-safe).
//
// O write de correção de status re-dispara o trigger UMA vez; na segunda
// passada nada diverge e a cadeia termina.
// =============================================================================

import * as admin from 'firebase-admin';
import { firestore } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  recontarMembrosAtivos,
  sincronizarMembro,
} from './membrosAggregates';

export const onMembroWrite = firestore
  .document('clubes/{clubId}/membros/{membroId}')
  .onWrite(async (change, context) => {
    const clubId = context.params['clubId'] as string;
    const membroId = context.params['membroId'] as string;
    const db = admin.firestore();

    // 1. Doc vivo: garante status derivado + tenantId propagado
    if (change.after.exists) {
      const corrigiu = await sincronizarMembro(db, clubId, membroId);
      if (corrigiu) {
        logger.info('membro_sincronizado', { clubId, membroId });
      }
    }

    // 2. Agregado ∑ por recontagem (create, update de status e delete)
    const agregadoMudou = await recontarMembrosAtivos(db, clubId);
    if (agregadoMudou) {
      logger.info('qtdMembrosAtivos_recontado', { clubId });
    }
  });
