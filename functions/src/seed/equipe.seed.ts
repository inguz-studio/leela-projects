// =============================================================================
// functions/src/seed/equipe.seed.ts
//
// Seed da EQUIPE do evento canônico (LEELA-S304-T1 · E04-L4 · RN-320):
// 4 membros de exemplo na Meia Maratona Floripa 2026 — UM por papel
// (organizador, administrador, operador, financeiro).
//
// Cada membro ganha:
//   1. usuário no AUTH Emulator (idempotente por e-mail);
//   2. custom claims `{ role: 'athlete', eventos: { meia-floripa-2026: papel } }`
//      via mergeClaimsEquipe — o MESMO merge preservador da Function
//      `setClaimsEquipe` (claims pré-existentes atravessam intactas);
//   3. doc âncora `eventos/{id}/equipe/{uid}` com status 'ativo' (docId = uid
//      — convenção que `papelEventoAtivo()` das Rules confere via get()).
//
// Guard anti-produção: toca AUTH ⇒ exige FIREBASE_AUTH_EMULATOR_HOST (ou
// projectId demo-*), mesmo padrão de platformAdmin.seed.ts; Firestore segue
// assertEmulatorOnly.
//
// Uso (Git Bash, Emulator Suite de pé — Auth 9099 + Firestore 8080):
//   export JAVA_HOME="$HOME/.jdks/jdk-21.0.11+10"
//   firebase emulators:exec --only auth,firestore --project demo-leela \
//     "npx tsx functions/src/seed/equipe.seed.ts"
// =============================================================================

/* eslint-disable no-console */

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import type { PapelEvento, StatusMembroEquipe } from '@leela/core';
import { mergeClaimsEquipe } from '../eventos/setClaimsEquipe';
import { assertEmulatorOnly } from './emulator-guard';
import { assertAuthEmulatorOnly } from './platformAdmin.seed';
import { CASTELO_TENANT_ID } from './tenants.seed';
import { MEIA_FLORIPA_ID } from './eventos.seed';

export interface MembroEquipeSeed {
  uid: string;
  nome: string;
  email: string;
  papel: PapelEvento;
  status: StatusMembroEquipe;
}

/** 4 membros canônicos — 1 por papel (RN-320). */
export const EQUIPE_SEEDS: MembroEquipeSeed[] = [
  {
    uid: 'uid-equipe-organizador',
    nome: 'Otávio Antunes',
    email: 'otavio.equipe@demo-leela.dev',
    papel: 'organizador',
    status: 'ativo',
  },
  {
    uid: 'uid-equipe-administrador',
    nome: 'Amanda Ribeiro',
    email: 'amanda.equipe@demo-leela.dev',
    papel: 'administrador',
    status: 'ativo',
  },
  {
    uid: 'uid-equipe-operador',
    nome: 'Carla Nunes',
    email: 'carla.equipe@demo-leela.dev',
    papel: 'operador',
    status: 'ativo',
  },
  {
    uid: 'uid-equipe-financeiro',
    nome: 'Fábio Ferreira',
    email: 'fabio.equipe@demo-leela.dev',
    papel: 'financeiro',
    status: 'ativo',
  },
];

/**
 * Grava os DOCS de equipe (Firestore apenas — sem Auth). Usado pelos testes
 * de Rules, que simulam o token por conta própria (rules-unit-testing).
 */
export async function seedEquipeDocs(db: admin.firestore.Firestore): Promise<void> {
  assertEmulatorOnly('seedEquipeDocs');
  const agora = Timestamp.now();
  const batch = db.batch();
  for (const membro of EQUIPE_SEEDS) {
    const ref = db
      .collection('eventos')
      .doc(MEIA_FLORIPA_ID)
      .collection('equipe')
      .doc(membro.uid);
    batch.set(ref, {
      tenantId: CASTELO_TENANT_ID,
      eventoId: MEIA_FLORIPA_ID,
      uid: membro.uid,
      nome: membro.nome,
      email: membro.email,
      profId: null,
      papel: membro.papel,
      status: membro.status,
      convidadoEm: agora,
      atualizadoEm: agora,
    });
  }
  await batch.commit();
  console.log(`[seed] equipe: ${EQUIPE_SEEDS.length} membros em ${MEIA_FLORIPA_ID}`);
}

/**
 * Seed completo: Auth users + claims (merge preservador) + docs âncora.
 * Idempotente — rerun regrava claims/docs sem duplicar usuários.
 */
export async function seedEquipe(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth
): Promise<void> {
  assertEmulatorOnly('seedEquipe');
  assertAuthEmulatorOnly();

  for (const membro of EQUIPE_SEEDS) {
    // 1. Usuário (idempotente por uid; e-mail estável)
    try {
      await auth.getUser(membro.uid);
    } catch {
      await auth.createUser({
        uid: membro.uid,
        email: membro.email,
        emailVerified: true,
        displayName: membro.nome,
      });
    }

    // 2. Claims — merge PRESERVADOR (nunca set cru; RN-401/ADR-008)
    const atual = (await auth.getUser(membro.uid)).customClaims;
    const claims = mergeClaimsEquipe(
      { role: 'athlete', ...(atual ?? {}) },
      MEIA_FLORIPA_ID,
      membro.papel
    );
    await auth.setCustomUserClaims(membro.uid, claims);
    await auth.revokeRefreshTokens(membro.uid);
  }

  // 3. Docs âncora (status 'ativo' — papelEventoAtivo() das Rules)
  await seedEquipeDocs(db);
  console.log('[seed] equipe: claims + âncoras gravadas (4 papéis)');
}

// ---------------------------------------------------------------------------
// Entry point (execução direta)
// ---------------------------------------------------------------------------
if (require.main === module) {
  if (!admin.apps.length) {
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= 'localhost:9099';
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    admin.initializeApp({ projectId: 'demo-leela' });
  }
  seedEquipe(admin.firestore(), admin.auth())
    .then(() => {
      console.log('[seed] done');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('[seed] error:', err);
      process.exit(1);
    });
}
