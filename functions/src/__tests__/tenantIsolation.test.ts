/**
 * tenantIsolation.test.ts — LEELA-S1600-T3
 *
 * Suite de integração: Security Rules multi-tenant no Firestore Emulator.
 *
 * Cobre (ADR-009, RN-400/401/402):
 *   - Cross-tenant read/write NEGADO (dado de A não vaza para B)
 *   - Same-tenant leitura PERMITIDA (claim.tenantId bate)
 *   - platform_admin cruza tenants (leitura macro)
 *   - Anônimo negado em tudo
 *   - Tenant SUSPENSO: escrita NEGADA, leitura PERMITIDA (RN-402)
 *   - atletas global: leitura pelo próprio uid; outros tenants negados
 *   - Escrita de campos financeiros/status negada ao cliente (pagamentos)
 *
 * Também cobre os testes deny-by-default da S000-2-T1 (estavam skipped).
 *
 * Pré-requisito: Firestore Emulator na porta 8080 (via emulators:exec).
 * JAVA_HOME=/c/Program Files/Microsoft/jdk-17.0.19.10-hotspot
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import * as admin from 'firebase-admin';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

// ── Tenant / user fixtures ────────────────────────────────────────────────
const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const SUSPENDED_TENANT_ID = 'tenant-suspenso';

const MARINA_UID = 'uid-marina-castelo';      // tenant_owner de castelo
const PASSO_OWNER_UID = 'uid-passo-owner';    // tenant_owner de passo-certo
const SUSPENDED_OWNER_UID = 'uid-suspended';  // tenant_owner de suspenso
const ATHLETE_UID = 'uid-atleta-global';
const PLATFORM_ADMIN_UID = 'uid-platform-admin';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

// ── Setup ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: 8080,
    },
  });

  // Admin SDK para seed (bypassa Rules)
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

// ── Seed (via Admin SDK — bypassa Rules) ─────────────────────────────────

async function seedFixtures(): Promise<void> {
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = adminDb.batch();

  // Tenants
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
  batch.set(adminDb.collection('tenants').doc(SUSPENDED_TENANT_ID), {
    id: SUSPENDED_TENANT_ID, nome: 'Tenant Suspenso', slug: SUSPENDED_TENANT_ID,
    status: 'suspenso', ownerUid: SUSPENDED_OWNER_UID, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });

  // Evento do Castelo (tenant-scoped)
  batch.set(adminDb.collection('eventos').doc('evento-castelo-1'), {
    id: 'evento-castelo-1', tenantId: CASTELO_ID,
    nome: 'Corrida Castelo 2026', status: 'publicado',
    criadoEm: now, atualizadoEm: now,
  });

  // Evento do Passo Certo (tenant-scoped)
  batch.set(adminDb.collection('eventos').doc('evento-passo-1'), {
    id: 'evento-passo-1', tenantId: PASSO_ID,
    nome: 'Passo Certo Run', status: 'publicado',
    criadoEm: now, atualizadoEm: now,
  });

  // Clube do Castelo
  batch.set(adminDb.collection('clubes').doc('clube-castelo'), {
    id: 'clube-castelo', tenantId: CASTELO_ID,
    nome: 'Clube Castelo', criadoEm: now, atualizadoEm: now,
  });

  // Evento do tenant suspenso
  batch.set(adminDb.collection('eventos').doc('evento-suspenso-1'), {
    id: 'evento-suspenso-1', tenantId: SUSPENDED_TENANT_ID,
    nome: 'Evento Suspenso', status: 'rascunho',
    criadoEm: now, atualizadoEm: now,
  });

  // Pagamento do Castelo (financeiro — escrita só por Function)
  batch.set(adminDb.collection('pagamentos').doc('pag-castelo-1'), {
    id: 'pag-castelo-1', tenantId: CASTELO_ID,
    valor: 100, status: 'confirmado', criadoEm: now,
  });

  // Atleta (global)
  batch.set(adminDb.collection('atletas').doc(ATHLETE_UID), {
    id: ATHLETE_UID, nome: 'Atleta Global',
    email: 'atleta@leela.app', criadoEm: now,
  });

  await batch.commit();
}

// Helper: contexto autenticado com custom claims
function ctxAs(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}

// ── Suites ────────────────────────────────────────────────────────────────

// ── S000-2-T1: Deny-by-default (anteriormente skipped) ───────────────────
describe('Deny-by-default (S000-2-T1)', () => {
  it('nega leitura de qualquer coleção por usuário anônimo', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), 'atletas', ATHLETE_UID)));
  });

  it('nega escrita por usuário anônimo', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(
      setDoc(doc(ctx.firestore(), 'atletas', 'qualquer'), { nome: 'x' })
    );
  });

  it('nega leitura autenticada sem claims (coleção sem rule permissiva)', async () => {
    const ctx = testEnv.authenticatedContext('uid-sem-claims');
    // Coleção 'eventos' exige tenantId no claim; usuário sem claim é negado
    await assertFails(
      getDoc(doc(ctx.firestore(), 'eventos', 'evento-castelo-1'))
    );
  });
});

// ── Isolamento cross-tenant (RN-400) ─────────────────────────────────────
describe('Isolamento cross-tenant (RN-400)', () => {
  it('tenant_owner de A NÃO lê evento de B', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      getDoc(doc(ctx.firestore(), 'eventos', 'evento-passo-1'))
    );
  });

  it('tenant_owner de B NÃO lê evento de A', async () => {
    const ctx = ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
    await assertFails(
      getDoc(doc(ctx.firestore(), 'eventos', 'evento-castelo-1'))
    );
  });

  it('tenant_owner de A NÃO lê clube de B', async () => {
    const ctx = ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
    await assertFails(
      getDoc(doc(ctx.firestore(), 'clubes', 'clube-castelo'))
    );
  });

  it('tenant_owner de A NÃO escreve evento de B', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(doc(ctx.firestore(), 'eventos', 'evento-passo-1'), {
        tenantId: PASSO_ID, nome: 'Hack', status: 'publicado',
      })
    );
  });

  it('tenant_owner de A NÃO lê tenant doc de B', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      getDoc(doc(ctx.firestore(), 'tenants', PASSO_ID))
    );
  });
});

// ── Same-tenant: leitura permitida ───────────────────────────────────────
describe('Same-tenant (leitura permitida)', () => {
  it('tenant_owner lê evento do próprio tenant', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'eventos', 'evento-castelo-1'))
    );
  });

  it('tenant_owner lê clube do próprio tenant', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'clubes', 'clube-castelo'))
    );
  });

  it('tenant_owner lê o próprio tenant doc', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'tenants', CASTELO_ID))
    );
  });

  it('tenant_owner NÃO escreve em tenant doc (escrita só admin)', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(doc(ctx.firestore(), 'tenants', CASTELO_ID), { nome: 'Novo Nome' })
    );
  });
});

// ── platform_admin cruza tenants ──────────────────────────────────────────
describe('platform_admin — acesso cross-tenant', () => {
  it('lê evento de qualquer tenant', async () => {
    const ctx = ctxAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'eventos', 'evento-castelo-1'))
    );
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'eventos', 'evento-passo-1'))
    );
  });

  it('lê clube de qualquer tenant', async () => {
    const ctx = ctxAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'clubes', 'clube-castelo'))
    );
  });

  it('lê tenant doc de qualquer tenant', async () => {
    const ctx = ctxAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'tenants', CASTELO_ID))
    );
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'tenants', PASSO_ID))
    );
  });

  it('escreve em tenant doc', async () => {
    const ctx = ctxAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'tenants', CASTELO_ID), {
        id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
        status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
      })
    );
  });

  it('lê dados de platform/rollups', async () => {
    // Seed do doc de rollups via admin
    await adminDb.collection('platform').doc('rollups').set({ gmvTotal: 0 });
    const ctx = ctxAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'platform', 'rollups'))
    );
  });

  it('tenant_owner NÃO lê platform/rollups', async () => {
    await adminDb.collection('platform').doc('rollups').set({ gmvTotal: 0 });
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      getDoc(doc(ctx.firestore(), 'platform', 'rollups'))
    );
  });
});

// ── Anônimo negado em tudo ────────────────────────────────────────────────
describe('Usuário anônimo — negado em tudo', () => {
  it('não lê eventos', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(
      getDoc(doc(ctx.firestore(), 'eventos', 'evento-castelo-1'))
    );
  });

  it('não escreve eventos', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(
      setDoc(doc(ctx.firestore(), 'eventos', 'novo-evento'), {
        tenantId: CASTELO_ID, nome: 'Hack',
      })
    );
  });

  it('não lê tenants', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(
      getDoc(doc(ctx.firestore(), 'tenants', CASTELO_ID))
    );
  });

  it('não lê atletas', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(
      getDoc(doc(ctx.firestore(), 'atletas', ATHLETE_UID))
    );
  });
});

// ── Tenant SUSPENSO: escrita negada, leitura permitida (RN-402) ───────────
describe('Tenant suspenso (RN-402)', () => {
  it('owner de tenant suspenso NÃO cria evento (escrita bloqueada)', async () => {
    const ctx = ctxAs(SUSPENDED_OWNER_UID, {
      role: 'tenant_owner', tenantId: SUSPENDED_TENANT_ID,
    });
    await assertFails(
      setDoc(doc(ctx.firestore(), 'eventos', 'novo-evento-suspenso'), {
        tenantId: SUSPENDED_TENANT_ID,
        nome: 'Evento Bloqueado',
        status: 'rascunho',
      })
    );
  });

  it('owner de tenant suspenso LEIA evento existente (dados preservados)', async () => {
    const ctx = ctxAs(SUSPENDED_OWNER_UID, {
      role: 'tenant_owner', tenantId: SUSPENDED_TENANT_ID,
    });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'eventos', 'evento-suspenso-1'))
    );
  });

  it('owner de tenant suspenso NÃO cria clube (escrita bloqueada)', async () => {
    const ctx = ctxAs(SUSPENDED_OWNER_UID, {
      role: 'tenant_owner', tenantId: SUSPENDED_TENANT_ID,
    });
    await assertFails(
      setDoc(doc(ctx.firestore(), 'clubes', 'novo-clube-suspenso'), {
        tenantId: SUSPENDED_TENANT_ID,
        nome: 'Clube Bloqueado',
      })
    );
  });

  it('platform_admin ainda lê dados de tenant suspenso', async () => {
    const ctx = ctxAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'eventos', 'evento-suspenso-1'))
    );
  });
});

// ── atletas global (identidade cross-tenant, ADR-009) ────────────────────
describe('atletas — identidade global cross-tenant', () => {
  it('atleta lê o próprio doc', async () => {
    const ctx = ctxAs(ATHLETE_UID, { role: 'athlete' });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'atletas', ATHLETE_UID))
    );
  });

  it('atleta NÃO lê doc de outro atleta', async () => {
    const ctx = ctxAs(ATHLETE_UID, { role: 'athlete' });
    await assertFails(
      getDoc(doc(ctx.firestore(), 'atletas', 'outro-atleta-uid'))
    );
  });

  it('tenant_owner NÃO lê atleta aleatório', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      getDoc(doc(ctx.firestore(), 'atletas', ATHLETE_UID))
    );
  });

  it('platform_admin lê qualquer atleta', async () => {
    const ctx = ctxAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'atletas', ATHLETE_UID))
    );
  });

  it('atleta escreve no próprio doc', async () => {
    const ctx = ctxAs(ATHLETE_UID, { role: 'athlete' });
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'atletas', ATHLETE_UID), {
        id: ATHLETE_UID, nome: 'Atleta Atualizado', email: 'atleta@leela.app',
      })
    );
  });

  it('atleta NÃO escreve em doc de outro atleta', async () => {
    const ctx = ctxAs(ATHLETE_UID, { role: 'athlete' });
    await assertFails(
      setDoc(doc(ctx.firestore(), 'atletas', 'outro-atleta'), {
        nome: 'Hack',
      })
    );
  });
});

// ── Pagamentos: escrita só por Function (nunca pelo cliente) ─────────────
describe('pagamentos — escrita bloqueada ao cliente', () => {
  it('tenant_owner NÃO escreve em pagamentos (só Function/Admin SDK)', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(doc(ctx.firestore(), 'pagamentos', 'novo-pag'), {
        tenantId: CASTELO_ID, valor: 200, status: 'confirmado',
      })
    );
  });

  it('tenant_owner lê pagamentos do próprio tenant', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'pagamentos', 'pag-castelo-1'))
    );
  });

  it('tenant_owner NÃO lê pagamentos de outro tenant', async () => {
    const ctx = ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
    await assertFails(
      getDoc(doc(ctx.firestore(), 'pagamentos', 'pag-castelo-1'))
    );
  });
});

// ── commercialTerms: escrita só platform_admin (RN-404) ──────────────────
describe('commercialTerms — escrita só platform_admin (RN-404)', () => {
  beforeEach(async () => {
    await adminDb
      .collection('tenants').doc(CASTELO_ID)
      .collection('commercialTerms').doc('current')
      .set({ platformFeePct: 10.5, saasMonthlyFee: 0 });
  });

  it('platform_admin escreve commercialTerms', async () => {
    const ctx = ctxAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      setDoc(
        doc(ctx.firestore(), 'tenants', CASTELO_ID, 'commercialTerms', 'current'),
        { platformFeePct: 12, saasMonthlyFee: 0 }
      )
    );
  });

  it('tenant_owner NÃO escreve nos próprios commercialTerms (RN-404)', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(
        doc(ctx.firestore(), 'tenants', CASTELO_ID, 'commercialTerms', 'current'),
        { platformFeePct: 0 }
      )
    );
  });

  it('tenant_owner lê os próprios commercialTerms', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertSucceeds(
      getDoc(
        doc(ctx.firestore(), 'tenants', CASTELO_ID, 'commercialTerms', 'current')
      )
    );
  });

  it('tenant_owner de B NÃO lê commercialTerms de A', async () => {
    const ctx = ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
    await assertFails(
      getDoc(
        doc(ctx.firestore(), 'tenants', CASTELO_ID, 'commercialTerms', 'current')
      )
    );
  });
});
