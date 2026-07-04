// =============================================================================
// functions/src/seed/commercialTerms.seed.ts
//
// Seed do termo comercial canônico (LEELA-S1602-T1) para o Emulator.
// NÃO executar em produção (guard idêntico ao de tenants.seed.ts — F5).
//
// Termo canônico — Castelo Produções (HANDOFF-05 / E04 / E09):
//   platformFeePct 10,5% · até 12x sem juros · antecipação indisponível ·
//   comunidade off · saasMonthlyFee R$ 0 (produtor-sócio — RN-405).
//
// Versionamento: grava `current` (versao 1) + snapshot imutável `v1`.
// Idempotente: se `current` já existe, NÃO regrava (não infla versão).
//
// Uso:
//   firebase emulators:exec --only firestore --project demo-leela \
//     "npx tsx functions/src/seed/commercialTerms.seed.ts"
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { DEFAULT_COMMERCIAL_TERMS } from '@leela/core';
import { CASTELO_TENANT_ID } from './tenants.seed';

/** uid sintético do platform_admin no ambiente de seed. */
export const SEED_ADMIN_UID = 'uid-platform-admin';

/**
 * Guard anti-produção (mesmo padrão F5 de tenants.seed.ts).
 */
function assertEmulatorOnly(): void {
  const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
  const projectId =
    process.env['GCLOUD_PROJECT'] ?? process.env['GOOGLE_CLOUD_PROJECT'] ?? '';

  if (!emulatorHost && !projectId.startsWith('demo-')) {
    throw new Error(
      '[seed] BLOQUEADO: seedCommercialTerms só roda no Emulator. ' +
        'Defina FIRESTORE_EMULATOR_HOST (ou use um projectId demo-*). ' +
        'NUNCA execute este seed contra produção.'
    );
  }
}

/**
 * Grava o termo canônico da Castelo Produções (versao 1 + snapshot v1).
 * Idempotente: se `commercialTerms/current` já existe, é no-op (preserva
 * a cadeia de versões existente — rerun não infla `versao`).
 */
export async function seedCommercialTerms(
  db: admin.firestore.Firestore
): Promise<void> {
  assertEmulatorOnly();

  const termsCol = db
    .collection('tenants')
    .doc(CASTELO_TENANT_ID)
    .collection('commercialTerms');

  const currentSnap = await termsCol.doc('current').get();
  if (currentSnap.exists) {
    console.log(
      `[seed] commercialTerms: já existe (versao ${String(currentSnap.get('versao'))}) — no-op`
    );
    return;
  }

  const payload = {
    ...DEFAULT_COMMERCIAL_TERMS,
    versao: 1,
    atualizadoPor: SEED_ADMIN_UID,
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  };

  const batch = db.batch();
  batch.set(termsCol.doc('current'), payload);
  batch.set(termsCol.doc('v1'), payload); // snapshot imutável de auditoria
  await batch.commit();

  console.log(
    '[seed] commercialTerms: Castelo Produções — 10,5% · 12x sem juros · SaaS R$ 0 (versao 1)'
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
  seedCommercialTerms(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
