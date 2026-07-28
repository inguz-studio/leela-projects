// =============================================================================
// functions/src/seed/clubes.seed.ts
//
// Seed do clube canônico para o Emulator (dev/testes) — LEELA-S101-T1.
// NÃO executar em produção (guard assertEmulatorOnly).
//
// Clube canônico (HANDOFF-05):
//   Corrida Perfeita Sul — slug `corrida-perfeita-sul`, owner Felipe Martins,
//   código de convite 8A3K9, Lagoa da Conceição (Florianópolis/SC),
//   assessoria esportiva · corrida de rua · desde 12 Jan 2022.
//
// O clube é tenant-scoped (ADR-009): o seed garante também o tenant
// `corrida-perfeita` (ativo) — sem ele, tenantAtivo() nas Rules não resolve.
//
// Uso:
//   firebase emulators:exec --only firestore --project demo-leela \
//     "npx ts-node src/seed/clubes.seed.ts"
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { assertEmulatorOnly as guardEmulatorOnly } from './emulator-guard';

// IDs canônicos — fixos para o seed ser idempotente
export const CORRIDA_PERFEITA_TENANT_ID = 'corrida-perfeita';
export const FELIPE_MARTINS_UID = 'uid-felipe-martins';
export const CLUBE_CPS_SLUG = 'corrida-perfeita-sul';

/** Código de convite canônico do clube (RN-101 — HANDOFF-05) */
export const CLUBE_CPS_CODIGO_CONVITE = '8A3K9';

/**
 * Guard anti-produção (padrão F5 — review S1600): seed SÓ roda no Emulator.
 */
function assertEmulatorOnly(): void {
  // Delegado ao guard COMPARTILHADO de emulator-guard.ts (mesmo contrato
  // F5 + escape nominal de producao da lane DEPLOY-PREVIEW). Antes: copia
  // local identica - consolidada para o escape valer em todos os seeds.
  guardEmulatorOnly('seedClubes');
}

/**
 * Popula o tenant da assessoria + o clube canônico no Firestore (Emulator).
 * Idempotente — set() com merge; `criadoEm` só é gravado na criação e os
 * agregados ∑ NÃO são regravados em rerun (a Function é a dona deles).
 */
export async function seedClubes(db: admin.firestore.Firestore): Promise<void> {
  assertEmulatorOnly();

  const now = FieldValue.serverTimestamp();

  // ── 1. Tenant da assessoria (pré-requisito de tenantAtivo nas Rules) ─────
  const tenantRef = db.collection('tenants').doc(CORRIDA_PERFEITA_TENANT_ID);
  const tenantSnap = await tenantRef.get();
  const tenantData: Record<string, unknown> = {
    id: CORRIDA_PERFEITA_TENANT_ID,
    nome: 'Corrida Perfeita',
    slug: CORRIDA_PERFEITA_TENANT_ID,
    status: 'ativo',
    ownerUid: FELIPE_MARTINS_UID,
    tipo: 'produtor',
    atualizadoEm: now,
  };
  if (!tenantSnap.exists) {
    tenantData['criadoEm'] = now;
  }
  await tenantRef.set(tenantData, { merge: true });

  // ── 2. Clube canônico (docId = slug) ─────────────────────────────────────
  const clubeRef = db.collection('clubes').doc(CLUBE_CPS_SLUG);
  const clubeSnap = await clubeRef.get();

  const clubeData: Record<string, unknown> = {
    id: CLUBE_CPS_SLUG,
    tenantId: CORRIDA_PERFEITA_TENANT_ID,
    nome: 'Corrida Perfeita Sul',
    descricao:
      'Assessoria de corrida na Lagoa da Conceição. Corpo forte, mente ' +
      'presente, espírito leve. Treinos 3x/semana + preparação de provas ' +
      'em Floripa e região.',
    slug: CLUBE_CPS_SLUG,
    categoria: 'Assessoria esportiva',
    modalidade: 'Corrida de rua',
    localizacao: { cidade: 'Florianópolis', estado: 'SC', online: false },
    ownerId: FELIPE_MARTINS_UID,
    codigoConvite: CLUBE_CPS_CODIGO_CONVITE,
    visibilidade: 'publica',
    aprovacaoManual: false,
    modeloEntrada: 'gratuito',
    atualizadoEm: now,
  };

  if (!clubeSnap.exists) {
    // criadoEm canônico: clube existe "desde 12 Jan 2022" (HANDOFF-05)
    clubeData['criadoEm'] = Timestamp.fromDate(
      new Date('2022-01-12T12:00:00-03:00')
    );
    // Agregados ∑ nascem zerados; a Cloud Function os mantém dali em diante.
    clubeData['qtdMembrosAtivos'] = 0;
    clubeData['qtdDesafiosAtivos'] = 0;
  }

  await clubeRef.set(clubeData, { merge: true });

  console.log(
    '[seed] clubes: Corrida Perfeita Sul (corrida-perfeita-sul, código 8A3K9)'
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
  seedClubes(admin.firestore())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
