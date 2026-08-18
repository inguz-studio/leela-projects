// =============================================================================
// functions/src/seed/analyticsSnapshots.seed.ts
//
// Seed da série diária de snapshots de analytics da Marina (LEELA-S821-T1b ·
// E11 · Onda 2 T2-L1) — 5 dias mock coerentes com os agregados canônicos do
// HANDOFF-05 (1.284 inscritos · R$ 142.280 · 120 membros · 3 desafios),
// terminando NOS valores canônicos (o último dia bate com dashboard/current).
//
// Habilita testar a série ANTES das telas da Onda 3 (histórico não é
// backfillável — decisão 6). NÃO executar em produção (guard F5).
//
// Escrita via montarSnapshot (@leela/core) — o seed passa pelo MESMO
// construtor de shape da Function (nenhum campo fora do contrato).
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { montarSnapshot, type OverviewKPIs } from '@leela/core';
import { assertEmulatorOnly } from './emulator-guard';
import { MARINA_CASTELO_UID } from './tenants.seed';

/** Dias da série mock (fixos — seed determinístico e idempotente). */
export const DIAS_SNAPSHOT_SEED = [
  '2026-07-08',
  '2026-07-09',
  '2026-07-10',
  '2026-07-11',
  '2026-07-12',
] as const;

/** Carimbo fixo por dia (03:05 America/Sao_Paulo = 06:05Z) — determinístico. */
function capturadoEmDoDia(dia: string): number {
  return new Date(`${dia}T06:05:00Z`).getTime();
}

/**
 * Série mock: progressão plausível que TERMINA nos agregados canônicos do
 * HANDOFF-05 (mesmos números do aceite E02: 1.284 / 142.280 / 47 vagas).
 */
const SERIE_SEED: readonly (OverviewKPIs & { dia: string })[] = [
  {
    dia: '2026-07-08',
    inscricoesTotais: 1198,
    inscricoesTrendPct: 8.4,
    receitaConfirmada: 131540,
    receitaTrendPct: null,
    vagasRestantes: 133,
    eventoEmRisco: null,
    taxaConversaoPct: null,
    conversaoSparkline: [],
    membrosAtivosTotais: 114,
    desafiosAtivosTotais: 3,
    formasPagamento: null,
  },
  {
    dia: '2026-07-09',
    inscricoesTotais: 1221,
    inscricoesTrendPct: 9.1,
    receitaConfirmada: 134060,
    receitaTrendPct: null,
    vagasRestantes: 110,
    eventoEmRisco: null,
    taxaConversaoPct: null,
    conversaoSparkline: [],
    membrosAtivosTotais: 116,
    desafiosAtivosTotais: 3,
    formasPagamento: null,
  },
  {
    dia: '2026-07-10',
    inscricoesTotais: 1247,
    inscricoesTrendPct: 10.6,
    receitaConfirmada: 137180,
    receitaTrendPct: null,
    vagasRestantes: 84,
    eventoEmRisco: null,
    taxaConversaoPct: null,
    conversaoSparkline: [],
    membrosAtivosTotais: 118,
    desafiosAtivosTotais: 3,
    formasPagamento: null,
  },
  {
    dia: '2026-07-11',
    inscricoesTotais: 1266,
    inscricoesTrendPct: 11.3,
    receitaConfirmada: 139790,
    receitaTrendPct: null,
    vagasRestantes: 65,
    eventoEmRisco: {
      nome: 'Meia Maratona Floripa',
      slug: 'meia-floripa-2026',
    },
    taxaConversaoPct: null,
    conversaoSparkline: [],
    membrosAtivosTotais: 119,
    desafiosAtivosTotais: 3,
    formasPagamento: null,
  },
  {
    dia: '2026-07-12',
    inscricoesTotais: 1284,
    inscricoesTrendPct: 12.5,
    receitaConfirmada: 142280,
    receitaTrendPct: null,
    vagasRestantes: 47,
    eventoEmRisco: {
      nome: 'Meia Maratona Floripa',
      slug: 'meia-floripa-2026',
    },
    taxaConversaoPct: null,
    conversaoSparkline: [],
    membrosAtivosTotais: 120,
    desafiosAtivosTotais: 3,
    formasPagamento: null,
  },
];

/**
 * Grava a série de 5 snapshots diários da Marina. Idempotente: docIds fixos
 * (o dia), conteúdo determinístico (capturadoEm derivado do dia) — rerun
 * regrava byte-idêntico.
 */
export async function seedAnalyticsSnapshots(
  db: admin.firestore.Firestore
): Promise<void> {
  assertEmulatorOnly('seedAnalyticsSnapshots');

  const col = db
    .collection('profissionais')
    .doc(MARINA_CASTELO_UID)
    .collection('analyticsSnapshots');

  const batch = db.batch();
  for (const { dia, ...kpis } of SERIE_SEED) {
    batch.set(
      col.doc(dia),
      montarSnapshot(kpis, MARINA_CASTELO_UID, dia, capturadoEmDoDia(dia))
    );
  }
  await batch.commit();

  console.log(
    `[seed] analyticsSnapshots: ${SERIE_SEED.length} dias ` +
      `(${DIAS_SNAPSHOT_SEED[0]}..${DIAS_SNAPSHOT_SEED[DIAS_SNAPSHOT_SEED.length - 1]}) ` +
      'para Marina — série termina nos agregados canônicos HANDOFF-05'
  );
}

// ---------------------------------------------------------------------------
// Entry point (execução direta)
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    admin.initializeApp({ projectId: 'demo-leela' });
  }
  seedAnalyticsSnapshots(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
