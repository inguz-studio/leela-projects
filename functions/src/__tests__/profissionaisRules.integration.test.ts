/**
 * profissionaisRules.integration.test.ts — LEELA-CONS-4-T1
 *
 * Integração (Firestore Emulator): Security Rules de `profissionais/{profId}`
 * no caminho do JOIN tenant → owner (getTenantComOwner do api-client).
 *
 * A task CONS-4-T1 escolheu READER com join (não denormalização): a garantia
 * de que o join funciona é 100% das Rules — este teste replica exatamente as
 * duas leituras do reader (tenants/{id} + profissionais/{ownerUid}) nos
 * papéis que a tela usa:
 *   - platform_admin (tela /plataforma/tenants/:id) lê tenant E profissional;
 *   - membro do PRÓPRIO tenant lê o perfil do owner (resource.data.tenantId);
 *   - cross-tenant NÃO lê o profissional de outro tenant;
 *   - anônimo não lê nada;
 *   - cliente NUNCA escreve em profissionais (write = platform_admin only) —
 *     nome do owner não é falsificável pelo tenant.
 *
 * Skip real (describe.skipIf) sem FIRESTORE_EMULATOR_HOST — padrão C1.
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
import {
  doc,
  getDoc,
  updateDoc,
  type Firestore,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

// ── Fixtures ──────────────────────────────────────────────────────────────
const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';

const MARINA_UID = 'uid-marina-castelo';
const STAFF_UID = 'uid-staff-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';
const ADMIN_UID = 'uid-platform-admin';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

describe.skipIf(!hasEmulator)('profissionais — Rules do join owner (CONS-4-T1)', () => {
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
    await seedFixtures();
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  async function seedFixtures(): Promise<void> {
    const now = FieldValue.serverTimestamp();
    const batch = adminDb.batch();

    batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
      id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
      status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
      id: PASSO_ID, nome: 'Passo Certo Eventos', slug: PASSO_ID,
      status: 'ativo', ownerUid: PASSO_OWNER_UID, tipo: 'promotor',
      criadoEm: now, atualizadoEm: now,
    });

    batch.set(adminDb.collection('profissionais').doc(MARINA_UID), {
      id: MARINA_UID, tenantId: CASTELO_ID,
      nome: 'Marina Castelo', email: 'marina@castelo.com.br',
      papeis: ['organizador'],
      criadoEm: now, atualizadoEm: now,
    });
    batch.set(adminDb.collection('profissionais').doc(PASSO_OWNER_UID), {
      id: PASSO_OWNER_UID, tenantId: PASSO_ID,
      nome: 'Owner Passo Certo', email: 'owner@passocerto.com.br',
      papeis: ['organizador'],
      criadoEm: now, atualizadoEm: now,
    });

    await batch.commit();
  }

  function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
    return testEnv.authenticatedContext(uid, claims).firestore() as unknown as Firestore;
  }

  const platformAdmin = () => dbAs(ADMIN_UID, { role: 'platform_admin' });
  const staffCastelo = () =>
    dbAs(STAFF_UID, { role: 'tenant_staff', tenantId: CASTELO_ID });
  const outroTenant = () =>
    dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });

  // ── O join da tela /plataforma/tenants/:id (platform_admin) ─────────────

  it('platform_admin faz o join completo: tenant + profissionais/{ownerUid}', async () => {
    const db = platformAdmin();

    const tenantSnap = await assertSucceeds(getDoc(doc(db, 'tenants', CASTELO_ID)));
    const ownerUid = tenantSnap.get('ownerUid') as string;
    expect(ownerUid).toBe(MARINA_UID);

    const profSnap = await assertSucceeds(getDoc(doc(db, 'profissionais', ownerUid)));
    expect(profSnap.get('nome')).toBe('Marina Castelo');
  });

  // ── Membro do próprio tenant também resolve o nome do owner ─────────────

  it('staff do MESMO tenant lê o perfil do owner (isTenantMember)', async () => {
    const snap = await assertSucceeds(
      getDoc(doc(staffCastelo(), 'profissionais', MARINA_UID))
    );
    expect(snap.get('nome')).toBe('Marina Castelo');
  });

  // ── Isolamento (ADR-009) ─────────────────────────────────────────────────

  it('cross-tenant NÃO lê o profissional de outro tenant', async () => {
    await assertFails(getDoc(doc(outroTenant(), 'profissionais', MARINA_UID)));
  });

  it('anônimo não lê profissional nem tenant', async () => {
    const anon = testEnv.unauthenticatedContext().firestore() as unknown as Firestore;
    await assertFails(getDoc(doc(anon, 'profissionais', MARINA_UID)));
    await assertFails(getDoc(doc(anon, 'tenants', CASTELO_ID)));
  });

  // ── Nome do owner não é falsificável pelo cliente ────────────────────────

  it('cliente (até o próprio owner) NÃO escreve em profissionais', async () => {
    const marina = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      updateDoc(doc(marina, 'profissionais', MARINA_UID), { nome: 'Forjado' })
    );
    await assertFails(
      updateDoc(doc(staffCastelo(), 'profissionais', MARINA_UID), { nome: 'Forjado' })
    );
  });
});
