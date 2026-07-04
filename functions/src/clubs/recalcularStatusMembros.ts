// =============================================================================
// functions/src/clubs/recalcularStatusMembros.ts
//
// Cron diário (03:00 America/Sao_Paulo): recalcula `membros.status` por data
// (RN-102 — novo→ativo após 7 dias; ativo→inativo após 30 dias sem atividade)
// e reconta os agregados ∑ `clubes.qtdMembrosAtivos` (S103-T1).
//
// O trigger onMembroWrite cobre mudanças por WRITE; este cron cobre o tempo
// PASSANDO sem write nenhum (membro que "envelhece" de novo→ativo ou
// ativo→inativo sem tocar no doc).
//
// Lógica em membrosAggregates.recalcularStatusMembrosCore (testável no
// Emulator sem o scheduler).
// =============================================================================

import * as admin from 'firebase-admin';
import { pubsub } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { recalcularStatusMembrosCore } from './membrosAggregates';

export const recalcularStatusMembros = pubsub
  .schedule('every day 03:00')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    const stats = await recalcularStatusMembrosCore(admin.firestore());
    logger.info('recalcular_status_membros', { ...stats });
    return null;
  });
