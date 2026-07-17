// =============================================================================
// functions/src/seed/politicaVendas.seed.ts
//
// Seed da política de vendas da Meia Maratona Floripa 2026
// (LEELA-S305-T1 · E04 · RN-338/339/340/343/344).
//
// Defaults legais (Brasil, CDC Art. 49): arrependimento 7 dias corridos /
// corte 48h / SLA de análise 3 dias; transferência HABILITADA 72h taxa R$ 0;
// troca de ingresso HABILITADA 48h, downgrade SEM reembolso.
//
// NÃO executar em produção (assertEmulatorOnly).
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { POLITICA_VENDAS_DOC_ID } from '@leela/core';
import { assertEmulatorOnly } from './emulator-guard';
import { CASTELO_TENANT_ID } from './tenants.seed';
import { MEIA_FLORIPA_ID } from './eventos.seed';

/** Política canônica da Meia Floripa (defaults legais + flags ligadas). */
export const POLITICA_VENDAS_SEED = {
  reembolso: {
    janelaArrependimentoDias: 7,
    corteHoras: 48,
    slaAnaliseDias: 3,
  },
  transferencia: {
    habilitada: true,
    janelaHoras: 72,
    taxa: 0,
  },
  trocaIngresso: {
    habilitada: true,
    janelaHoras: 48,
    permiteReembolsoDowngrade: false,
  },
} as const;

export async function seedPoliticaVendas(db: admin.firestore.Firestore): Promise<void> {
  assertEmulatorOnly('seedPoliticaVendas');

  const ref = db
    .collection('eventos')
    .doc(MEIA_FLORIPA_ID)
    .collection('politicaVendas')
    .doc(POLITICA_VENDAS_DOC_ID);

  const snap = await ref.get();
  const data: Record<string, unknown> = {
    id: POLITICA_VENDAS_DOC_ID,
    tenantId: CASTELO_TENANT_ID,
    eventoId: MEIA_FLORIPA_ID,
    reembolso: { ...POLITICA_VENDAS_SEED.reembolso },
    transferencia: { ...POLITICA_VENDAS_SEED.transferencia },
    trocaIngresso: { ...POLITICA_VENDAS_SEED.trocaIngresso },
    atualizadoEm: FieldValue.serverTimestamp(),
  };
  if (!snap.exists) data['criadoEm'] = FieldValue.serverTimestamp();
  await ref.set(data, { merge: true });

  console.log(
    '[seed] politicaVendas: Meia Floripa (7d/48h/SLA 3d · transferência 72h ' +
      'taxa 0 · troca 48h downgrade off)'
  );
}

// ---------------------------------------------------------------------------
// Entry point (execução direta)
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] =
      process.env['FIRESTORE_EMULATOR_HOST'] ?? 'localhost:8080';
    admin.initializeApp({ projectId: 'demo-leela' });
  }
  seedPoliticaVendas(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
