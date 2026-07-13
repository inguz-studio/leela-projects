// =============================================================================
// functions/src/seed/participantes.seed.ts
//
// Seed de PARTICIPAÇÕES no desafio canônico (LEELA-S1307/S1308 · E13
// adiantado · Onda 2 T2-L2).
//
// A participação é o GATE anti-spoof do domínio jornada: onRegistroWrite só
// agrega registros de quem JÁ participa (a fronteira RN-117 é o callable
// entrarNoDesafio — S1308-T1). Este seed usa o MESMO caminho privilegiado
// (Admin SDK) que o callable usa, com `entrouEm` fixo (determinístico).
//
// Agregados (pontos/pontosPorPilar/diasAtivos) NASCEM ZERADOS aqui — quem
// os preenche é o recompute da Function (registros.seed.ts chama
// recomputarParticipacao depois de gravar os registros).
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { recomputarAgregadosDesafio } from '../jornada/onRegistroWrite';
import { assertEmulatorOnly } from './emulator-guard';
import { CLUBE_CPS_SLUG, seedClubes } from './clubes.seed';
import { seedDesafios } from './desafios.seed';

export const PARTICIPANTES_SEED = [
  { uid: 'uid-aline-barros', entrouEmIso: '2026-03-01T12:00:00Z' },
  { uid: 'uid-bruno-aguiar', entrouEmIso: '2026-03-09T12:00:00Z' },
] as const;

export const DESAFIO_PARTICIPACAO_SEED_ID = 'preparacao-meia-floripa';

/**
 * Cria as participações canônicas no desafio Preparação Meia Floripa.
 * Idempotente: docId = uid; `entrouEm` fixo; agregados zerados só no
 * CREATE (rerun preserva o que o recompute já materializou).
 */
export async function seedParticipantes(
  db: admin.firestore.Firestore
): Promise<void> {
  assertEmulatorOnly('seedParticipantes');

  await seedClubes(db);
  await seedDesafios(db);

  const desafioRef = db
    .collection('clubes').doc(CLUBE_CPS_SLUG)
    .collection('desafios').doc(DESAFIO_PARTICIPACAO_SEED_ID);

  for (const spec of PARTICIPANTES_SEED) {
    const ref = desafioRef.collection('participantes').doc(spec.uid);
    const snap = await ref.get();
    if (snap.exists) continue; // rerun não zera agregados já recomputados

    await ref.set({
      atletaId: spec.uid,
      clubeId: CLUBE_CPS_SLUG,
      desafioId: DESAFIO_PARTICIPACAO_SEED_ID,
      entrouEm: Timestamp.fromDate(new Date(spec.entrouEmIso)),
      pontos: 0,
      pontosPorPilar: { fisico: 0, mental: 0, espiritual: 0 },
      diasAtivos: 0,
    });
  }

  // ∑ do desafio pela MESMA rotina da Function (recontagem idempotente)
  await recomputarAgregadosDesafio(db, CLUBE_CPS_SLUG, DESAFIO_PARTICIPACAO_SEED_ID);

  console.log(
    `[seed] participantes: ${PARTICIPANTES_SEED.length} participações no ` +
      `desafio ${DESAFIO_PARTICIPACAO_SEED_ID}`
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
  seedParticipantes(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
