/**
 * commercialTermsRules.integration.test.ts — LEELA-S1602-T1
 *
 * Suite de integração: Security Rules de `tenants/{id}/commercialTerms/*`
 * no Firestore Emulator (RN-404/405 + versionamento).
 *
 * Cobre:
 *   - tenant_owner LÊ os próprios termos (read-only), NÃO escreve (RN-404)
 *   - tenant_owner de outro tenant NÃO lê (RN-400)
 *   - athlete / anônimo negados
 *   - platform_admin escreve; payload fora dos ranges é negado (defesa em
 *     profundidade — a validação pura do core roda antes no cliente)
 *   - saasMonthlyFee = 0 aceito na Rule (RN-405)
 *   - versionamento: create exige versao 1; update exige versao anterior + 1;
 *     snapshots v* são create-only (update/delete negados)
 *
 * Pré-requisito: Firestore Emulator na porta 8080 (via emulators:exec).
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
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';
const ADMIN_UID = 'uid-platform-admin';
const ATHLETE_UID = 'uid-atleta-global';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

/** Payload válido de termos (shape completo exigido pela Rule). */
function validTerms(versao: number, overrides: Record<string, unknown> = {}) {
  return {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao,
    atualizadoPor: ADMIN_UID,
    atualizadoEm: new Date(),
    ...overrides,
  };
}

function termsPath(tenantId: string, docId: string): [string, string, string, string] {
  return ['tenants', tenantId, 'commercialTerms', docId];
}

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

  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo Eventos', slug: PASSO_ID,
    status: 'pending', ownerUid: PASSO_OWNER_UID, tipo: 'promotor',
    criadoEm: now, atualizadoEm: now,
  });
  // Termo vigente do Castelo (versao 1) — seed via Admin SDK (bypassa Rules)
  batch.set(
    adminDb.collection('tenants').doc(CASTELO_ID)
      .collection('commercialTerms').doc('current'),
    validTerms(1)
  );
  batch.set(
    adminDb.collection('tenants').doc(CASTELO_ID)
      .collection('commercialTerms').doc('v1'),
    validTerms(1)
  );
  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

function ctxAs(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}

// ── Leitura (RN-404: tenant lê read-only; RN-400: outro tenant não) ───────
describe('commercialTerms — leitura', () => {
  it('tenant_owner LÊ os próprios termos (read-only)', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertSucceeds(getDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current'))));
  });

  it('tenant_staff do mesmo tenant também lê', async () => {
    const ctx = ctxAs('uid-staff', { role: 'tenant_staff', tenantId: CASTELO_ID });
    await assertSucceeds(getDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current'))));
  });

  it('tenant_owner de OUTRO tenant NÃO lê (RN-400)', async () => {
    const ctx = ctxAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
    await assertFails(getDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current'))));
  });

  it('athlete NÃO lê termos de tenant', async () => {
    const ctx = ctxAs(ATHLETE_UID, { role: 'athlete' });
    await assertFails(getDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current'))));
  });

  it('anônimo NÃO lê', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current'))));
  });

  it('platform_admin lê termos de qualquer tenant', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(getDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current'))));
    await assertSucceeds(getDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'v1'))));
  });
});

// ── Escrita: SÓ platform_admin (RN-404) ───────────────────────────────────
describe('commercialTerms — escrita exclusiva do platform_admin (RN-404)', () => {
  it('tenant_owner NÃO escreve os próprios termos', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current')), validTerms(2))
    );
  });

  it('tenant_staff NÃO escreve', async () => {
    const ctx = ctxAs('uid-staff', { role: 'tenant_staff', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current')), validTerms(2))
    );
  });

  it('platform_admin ATUALIZA current com bump correto (versao 2)', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      setDoc(
        doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current')),
        validTerms(2, { platformFeePct: 12 })
      )
    );
  });

  it('platform_admin CRIA current de tenant sem termos (versao 1)', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), ...termsPath(PASSO_ID, 'current')), validTerms(1))
    );
  });

  it('saasMonthlyFee = 0 é aceito pela Rule (RN-405)', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      setDoc(
        doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current')),
        validTerms(2, { saasMonthlyFee: 0 })
      )
    );
  });

  it('delete de current é negado até para admin (termo vigente nunca some)', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(deleteDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current'))));
  });
});

// ── Validação de ranges na Rule (defesa em profundidade) ─────────────────
describe('commercialTerms — validação de payload na Rule', () => {
  it('platformFeePct > 100 é negado mesmo para admin', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      setDoc(
        doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current')),
        validTerms(2, { platformFeePct: 150 })
      )
    );
  });

  it('saasMonthlyFee negativo é negado', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      setDoc(
        doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current')),
        validTerms(2, { saasMonthlyFee: -5 })
      )
    );
  });

  it('maxParcelas 0 é negado', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      setDoc(
        doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current')),
        validTerms(2, {
          installmentRules: { maxParcelas: 0, jurosAoMes: 0, parcelaMinima: 10 },
        })
      )
    );
  });

  it('payload sem shape (campos faltando) é negado', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      setDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current')), {
        platformFeePct: 10.5,
        versao: 2,
      })
    );
  });
});

// ── Versionamento enforçado pela Rule ─────────────────────────────────────
describe('commercialTerms — versionamento (current + snapshots v*)', () => {
  it('create de current com versao != 1 é negado', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      setDoc(doc(ctx.firestore(), ...termsPath(PASSO_ID, 'current')), validTerms(5))
    );
  });

  it('update de current sem bump (mesma versao) é negado', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      setDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current')), validTerms(1))
    );
  });

  it('update de current pulando versão (1 → 3) é negado', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      setDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'current')), validTerms(3))
    );
  });

  it('snapshot v2 é criável pelo admin (histórico)', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      setDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'v2')), validTerms(2))
    );
  });

  it('snapshot v1 existente é IMUTÁVEL (update negado até para admin)', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      setDoc(
        doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'v1')),
        validTerms(1, { platformFeePct: 99 })
      )
    );
  });

  it('delete de snapshot v1 é negado (auditoria preservada)', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(deleteDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'v1'))));
  });

  it('tenant_owner NÃO cria snapshot (escrita é toda do admin)', async () => {
    const ctx = ctxAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(doc(ctx.firestore(), ...termsPath(CASTELO_ID, 'v2')), validTerms(2))
    );
  });
});
