/**
 * platformRollupsRules.integration.test.ts — LEELA-S1605-T1
 *
 * Security Rules de `platform/rollups` no Firestore Emulator (RN-409) +
 * derivação pura de saúde por tenant.
 *
 * Cobre:
 *   - platform_admin LÊ o doc de rollups
 *   - tenant_owner / tenant_staff / athlete / anônimo NÃO leem
 *   - NENHUM cliente escreve — nem platform_admin (write é só de Function)
 *   - deny recursivo: subpaths de platform/** seguem o mesmo regime
 *   - deriveTenantHealth (heurística V1) — pura
 *
 * Pré-requisito: Firestore Emulator 8080 (via emulators:exec).
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { deriveTenantHealth } from '@leela/core';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const ADMIN_UID = 'uid-platform-admin';
const MARINA_UID = 'uid-marina-castelo';
const CASTELO_ID = 'castelo-producoes';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });

  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  // Doc de rollups gravado como a Function grava (Admin SDK bypassa Rules)
  await adminDb.doc('platform/rollups').set({
    gmvTotal: 1500,
    receitaLeelaTotal: 157.5,
    tenantsAtivos: 1,
    tenants: {
      [CASTELO_ID]: {
        tenantId: CASTELO_ID,
        nome: 'Castelo Produções',
        status: 'ativo',
        gmv: 1500,
        receitaLeela: 157.5,
        platformFeePct: 10.5,
        eventosAtivos: 2,
        health: 'saudavel',
      },
    },
    atualizadoEm: FieldValue.serverTimestamp(),
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function ctxAs(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}

// ── Leitura: SÓ platform_admin (RN-409) ────────────────────────────────────
describe('platform/rollups — leitura só do platform_admin (RN-409)', () => {
  it('platform_admin lê o doc de rollups', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'platform/rollups')));
  });

  it('tenant_owner NÃO lê (nem a própria linha de saúde)', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(getDoc(doc(ctx.firestore(), 'platform/rollups')));
  });

  it('tenant_staff NÃO lê', async () => {
    const ctx = ctxAs('uid-staff', { role: 'tenant_staff', tenantId: CASTELO_ID });
    await assertFails(getDoc(doc(ctx.firestore(), 'platform/rollups')));
  });

  it('athlete NÃO lê', async () => {
    const ctx = ctxAs('uid-atleta', { role: 'athlete' });
    await assertFails(getDoc(doc(ctx.firestore(), 'platform/rollups')));
  });

  it('anônimo NÃO lê', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'platform/rollups')));
  });
});

// ── Escrita: NUNCA pelo cliente (só Function/Admin SDK — RN-409) ──────────
describe('platform/rollups — escrita exclusiva de Function (RN-409)', () => {
  it('nem platform_admin escreve pelo cliente', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      setDoc(doc(ctx.firestore(), 'platform/rollups'), { gmvTotal: 999999 })
    );
  });

  it('tenant_owner não infla o próprio GMV', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(doc(ctx.firestore(), 'platform/rollups'), { gmvTotal: 1 })
    );
  });

  it('delete é negado até para admin', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(deleteDoc(doc(ctx.firestore(), 'platform/rollups')));
  });

  it('subpaths de platform/** seguem o mesmo regime (deny recursivo)', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      setDoc(doc(ctx.firestore(), 'platform/rollups/porTenant/castelo'), { x: 1 })
    );
  });
});

// ── deriveTenantHealth — heurística V1 (pura) ─────────────────────────────
describe('deriveTenantHealth (S1605-T1)', () => {
  it('suspenso → critico (independe de eventos)', () => {
    expect(deriveTenantHealth('suspenso', 5)).toBe('critico');
    expect(deriveTenantHealth('suspenso', 0)).toBe('critico');
  });

  it('pending → atencao', () => {
    expect(deriveTenantHealth('pending', 0)).toBe('atencao');
  });

  it('ativo sem eventos → atencao; com eventos → saudavel', () => {
    expect(deriveTenantHealth('ativo', 0)).toBe('atencao');
    expect(deriveTenantHealth('ativo', 1)).toBe('saudavel');
    expect(deriveTenantHealth('ativo', 3)).toBe('saudavel');
  });
});
