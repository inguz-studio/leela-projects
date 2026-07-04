// =============================================================================
// functions/src/clubs/onDesafioWrite.ts
//
// Trigger Firestore: mantém o agregado ∑ `clubes.qtdDesafiosAtivos` e o
// tenantId propagado a cada write em desafios (S105-T1 — fecha a pendência
// herdada do E05-L1).
//
// Idempotência/retry (mesmo contrato de onMembroWrite):
//   - agregado: RECONTAGEM via count() — reprocessar o mesmo evento nunca
//     duplica (increment é proibido aqui por não ser retry-safe);
//   - tenantId: correção determinística; regravar o mesmo valor é detectado
//     e vira no-op (sem loop de trigger).
// =============================================================================

import * as admin from 'firebase-admin';
import { firestore } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  recontarDesafiosAtivos,
  sincronizarDesafio,
} from './desafiosAggregates';

export const onDesafioWrite = firestore
  .document('clubes/{clubId}/desafios/{desafioId}')
  .onWrite(async (change, context) => {
    const clubId = context.params['clubId'] as string;
    const desafioId = context.params['desafioId'] as string;
    const db = admin.firestore();

    // 1. Doc vivo: garante tenantId propagado do clube pai (ADR-009)
    if (change.after.exists) {
      const corrigiu = await sincronizarDesafio(db, clubId, desafioId);
      if (corrigiu) {
        logger.info('desafio_sincronizado', { clubId, desafioId });
      }
    }

    // 2. Agregado ∑ por recontagem (create, update de status e delete)
    const agregadoMudou = await recontarDesafiosAtivos(db, clubId);
    if (agregadoMudou) {
      logger.info('qtdDesafiosAtivos_recontado', { clubId });
    }
  });
