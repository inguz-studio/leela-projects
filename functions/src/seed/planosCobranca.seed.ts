// =============================================================================
// functions/src/seed/planosCobranca.seed.ts
//
// Seed do plano de cobrança "Padrão" (LEELA-T2-L4 · CB-T1 · decisão #15).
//
// Defaults iniciais (Vitor 2026-07-05): 10% cartão / 8% PIX. Tabela por
// parcela (2x-12x) e mensalidade SaaS em PLACEHOLDER 0 — única pendência
// comercial ("exercitar depois"); o modelo já as comporta.
//
// Idempotente: se o plano `padrao` já existe, NO-OP (edições do admin no
// Emulator não são sobrescritas por rerun). NÃO executar em produção
// (guard F5).
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
  PLANO_PADRAO,
  PLANO_PADRAO_ID,
  PLANOS_COBRANCA_COLLECTION,
} from '@leela/core';
import { assertEmulatorOnly } from './emulator-guard';

/**
 * Grava o plano "Padrão" (docId `padrao`). No-op se já existe.
 */
export async function seedPlanosCobranca(
  db: admin.firestore.Firestore
): Promise<void> {
  assertEmulatorOnly('seedPlanosCobranca');

  const ref = db.collection(PLANOS_COBRANCA_COLLECTION).doc(PLANO_PADRAO_ID);
  const snap = await ref.get();
  if (snap.exists) {
    console.log('[seed] planosCobranca: plano "Padrão" já existe — no-op');
    return;
  }

  await ref.set({
    id: PLANO_PADRAO_ID,
    ...PLANO_PADRAO,
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });

  console.log(
    '[seed] planosCobranca: "Padrão" — 10% cartão / 8% PIX · tabela 2x-12x ' +
      'placeholder 0 · SaaS R$ 0 (pendência comercial: valores reais depois)'
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
  seedPlanosCobranca(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
