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
  deleteDoc,
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

  // Clube do Passo Certo (vítima da matriz de hijack)
  batch.set(adminDb.collection('clubes').doc('clube-passo-1'), {
    id: 'clube-passo-1', tenantId: PASSO_ID,
    nome: 'Clube Passo', criadoEm: now, atualizadoEm: now,
  });

  // Coleções tenant-scoped restantes — um doc por tenant (castelo × passo)
  const scopedPairs: Array<[string, string, string, Record<string, unknown>]> = [
    ['comunicados', 'com-castelo-1', 'com-passo-1', { titulo: 'Aviso' }],
    ['parcerias', 'parc-castelo-1', 'parc-passo-1', { parceiro: 'Loja X' }],
    ['programaAfiliacao', 'afil-castelo-1', 'afil-passo-1', { pct: 5 }],
    ['equipe', 'eq-castelo-1', 'eq-passo-1', { nome: 'Membro Equipe' }],
    ['promotores', 'prom-castelo-1', 'prom-passo-1', { nome: 'Promotor' }],
    ['inscritos', 'insc-castelo-1', 'insc-passo-1', {
      atletaId: ATHLETE_UID, kit: 'kit_basico', status: 'confirmado',
      modalidade: '5k', chipNumero: null,
    }],
  ];
  for (const [col, casteloDoc, passoDoc, extra] of scopedPairs) {
    batch.set(adminDb.collection(col).doc(casteloDoc), {
      id: casteloDoc, tenantId: CASTELO_ID, ...extra, criadoEm: now,
    });
    batch.set(adminDb.collection(col).doc(passoDoc), {
      id: passoDoc, tenantId: PASSO_ID, ...extra, criadoEm: now,
    });
  }

  // Profissionais (tenant-scoped via claim)
  batch.set(adminDb.collection('profissionais').doc(MARINA_UID), {
    id: MARINA_UID, nome: 'Marina Castelo', tenantId: CASTELO_ID, criadoEm: now,
  });
  batch.set(adminDb.collection('profissionais').doc(PASSO_OWNER_UID), {
    id: PASSO_OWNER_UID, nome: 'Owner Passo', tenantId: PASSO_ID, criadoEm: now,
  });

  // Subscription da comunidade (tenants/{id}/subscriptions — S1603)
  batch.set(
    adminDb.collection('tenants').doc(CASTELO_ID)
      .collection('subscriptions').doc('sub-castelo-1'),
    {
      id: 'sub-castelo-1', atletaId: ATHLETE_UID, clubeId: 'clube-castelo',
      valor: 49.9, status: 'ativa', criadoEm: now,
    }
  );

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
// S1602-T1 endureceu a Rule: além do papel, a escrita exige shape completo
// + versionamento (current: bump exato). Payloads aqui seguem o shape;
// a suíte dedicada é commercialTermsRules.integration.test.ts.
describe('commercialTerms — escrita só platform_admin (RN-404)', () => {
  /** Payload de termos com shape completo (S1602-T1). */
  function termsPayload(versao: number, overrides: Record<string, unknown> = {}) {
    return {
      platformFeePct: 10.5,
      installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
      anticipation: { disponivel: false },
      communityMonthlyEnabled: false,
      saasMonthlyFee: 0,
      versao,
      atualizadoPor: PLATFORM_ADMIN_UID,
      atualizadoEm: new Date(),
      ...overrides,
    };
  }

  beforeEach(async () => {
    await adminDb
      .collection('tenants').doc(CASTELO_ID)
      .collection('commercialTerms').doc('current')
      .set(termsPayload(1));
  });

  it('platform_admin escreve commercialTerms', async () => {
    const ctx = ctxAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      setDoc(
        doc(ctx.firestore(), 'tenants', CASTELO_ID, 'commercialTerms', 'current'),
        termsPayload(2, { platformFeePct: 12 })
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

// ─────────────────────────────────────────────────────────────────────────
// F1 — Write-takeover cross-tenant por OVERWRITE (o pior bug — ADR-009).
// Owner de A tenta SOBRESCREVER doc de B carimbando o próprio tenantId.
// A rule de update valida resource.data.tenantId (dono ATUAL = B) + exige
// tenantId imutável, então o hijack DEVE falhar em TODA coleção writable.
// ─────────────────────────────────────────────────────────────────────────
describe('F1 — takeover cross-tenant por overwrite (matriz completa)', () => {
  // [coleção, docId da vítima (tenant B = Passo), payload de hijack]
  const hijackTargets: Array<[string, string, Record<string, unknown>]> = [
    ['eventos', 'evento-passo-1', { nome: 'HIJACK', status: 'rascunho' }],
    ['clubes', 'clube-passo-1', { nome: 'HIJACK' }],
    ['comunicados', 'com-passo-1', { titulo: 'HIJACK' }],
    ['parcerias', 'parc-passo-1', { parceiro: 'HIJACK' }],
    ['programaAfiliacao', 'afil-passo-1', { pct: 99 }],
    ['equipe', 'eq-passo-1', { nome: 'HIJACK' }],
    ['promotores', 'prom-passo-1', { nome: 'HIJACK' }],
    ['inscritos', 'insc-passo-1', { status: 'cancelado' }],
  ];

  for (const [col, victimId, payload] of hijackTargets) {
    it(`owner de A NÃO sobrescreve ${col}/${victimId} carimbando tenantId=A`, async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(
        setDoc(doc(ctx.firestore(), col, victimId), {
          id: victimId, tenantId: CASTELO_ID, ...payload,
        })
      );
    });

    it(`owner de A NÃO deleta ${col}/${victimId} de B`, async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(deleteDoc(doc(ctx.firestore(), col, victimId)));
    });
  }

  it('owner NÃO muda o tenantId do próprio doc (tenantId imutável)', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(doc(ctx.firestore(), 'eventos', 'evento-castelo-1'), {
        id: 'evento-castelo-1', tenantId: PASSO_ID, nome: 'Doa pra B', status: 'publicado',
      })
    );
  });

  it('owner ATUALIZA o próprio evento mantendo o tenantId (caminho feliz)', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'eventos', 'evento-castelo-1'), {
        id: 'evento-castelo-1', tenantId: CASTELO_ID,
        nome: 'Corrida Castelo 2026 (editada)', status: 'publicado',
      })
    );
  });

  it('owner CRIA evento no próprio tenant (caminho feliz)', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'eventos', 'evento-castelo-novo'), {
        id: 'evento-castelo-novo', tenantId: CASTELO_ID,
        nome: 'Novo', status: 'rascunho',
      })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// F2 — Isolamento de leitura das coleções antes sem cobertura.
// ─────────────────────────────────────────────────────────────────────────
describe('F2 — isolamento de leitura (coleções sem cobertura prévia)', () => {
  const readTargets: Array<[string, string]> = [
    ['comunicados', 'com-passo-1'],
    ['parcerias', 'parc-passo-1'],
    ['programaAfiliacao', 'afil-passo-1'],
    ['equipe', 'eq-passo-1'],
    ['promotores', 'prom-passo-1'],
    ['inscritos', 'insc-passo-1'],
  ];

  for (const [col, docId] of readTargets) {
    it(`owner de A NÃO lê ${col} de B`, async () => {
      const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
      await assertFails(getDoc(doc(ctx.firestore(), col, docId)));
    });

    it(`owner de B lê o próprio ${col}`, async () => {
      const ctx = ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
      await assertSucceeds(getDoc(doc(ctx.firestore(), col, docId)));
    });

    it(`platform_admin lê ${col} de qualquer tenant`, async () => {
      const ctx = ctxAs(PLATFORM_ADMIN_UID, { role: 'platform_admin' });
      await assertSucceeds(getDoc(doc(ctx.firestore(), col, docId)));
    });
  }

  it('profissionais: owner de A NÃO lê profissional de B', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(getDoc(doc(ctx.firestore(), 'profissionais', PASSO_OWNER_UID)));
  });

  it('profissionais: membro do tenant lê profissional do próprio tenant', async () => {
    const ctx = ctxAs('uid-staff-castelo', { role: 'tenant_staff', tenantId: CASTELO_ID });
    await assertSucceeds(getDoc(doc(ctx.firestore(), 'profissionais', MARINA_UID)));
  });

  it('subscriptions: atleta dono lê a própria assinatura da comunidade', async () => {
    const ctx = ctxAs(ATHLETE_UID, { role: 'athlete' });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'tenants', CASTELO_ID, 'subscriptions', 'sub-castelo-1'))
    );
  });

  it('subscriptions: owner do tenant lê assinatura da própria comunidade', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'tenants', CASTELO_ID, 'subscriptions', 'sub-castelo-1'))
    );
  });

  it('subscriptions: cliente NÃO escreve status (só Function)', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(
        doc(ctx.firestore(), 'tenants', CASTELO_ID, 'subscriptions', 'sub-castelo-1'),
        { status: 'cancelada' }
      )
    );
  });

  it('subscriptions: owner de B NÃO lê assinatura de A', async () => {
    const ctx = ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
    await assertFails(
      getDoc(doc(ctx.firestore(), 'tenants', CASTELO_ID, 'subscriptions', 'sub-castelo-1'))
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────
// F4 — RBAC intra-tenant: promoter/staff não escrevem como owner.
// ─────────────────────────────────────────────────────────────────────────
describe('F4 — RBAC intra-tenant (papel de escrita)', () => {
  it('promoter do tenant NÃO cria evento (não é writer)', async () => {
    const ctx = ctxAs('uid-promoter-castelo', { role: 'promoter', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(doc(ctx.firestore(), 'eventos', 'evento-promoter'), {
        id: 'evento-promoter', tenantId: CASTELO_ID, nome: 'x', status: 'rascunho',
      })
    );
  });

  it('promoter do tenant LÊ eventos do próprio tenant (é membro)', async () => {
    const ctx = ctxAs('uid-promoter-castelo', { role: 'promoter', tenantId: CASTELO_ID });
    await assertSucceeds(
      getDoc(doc(ctx.firestore(), 'eventos', 'evento-castelo-1'))
    );
  });

  it('tenant_staff CRIA evento (é writer)', async () => {
    const ctx = ctxAs('uid-staff-castelo', { role: 'tenant_staff', tenantId: CASTELO_ID });
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'eventos', 'evento-staff'), {
        id: 'evento-staff', tenantId: CASTELO_ID, nome: 'ok', status: 'rascunho',
      })
    );
  });

  it('tenant_staff NÃO gerencia equipe (só owner)', async () => {
    const ctx = ctxAs('uid-staff-castelo', { role: 'tenant_staff', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(doc(ctx.firestore(), 'equipe', 'eq-nova'), {
        id: 'eq-nova', tenantId: CASTELO_ID, nome: 'Novo membro',
      })
    );
  });

  it('tenant_owner gerencia equipe (só owner)', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), 'equipe', 'eq-nova'), {
        id: 'eq-nova', tenantId: CASTELO_ID, nome: 'Novo membro',
      })
    );
  });
});
