/**
 * crossTenantOverwrite.regression.test.ts — REGRESSÃO DE SEGURANÇA (origem: sf-qa-engineer)
 * Guarda contra a reintrodução do takeover cross-tenant por overwrite (ADR-009).
 * Bloqueado pelo fix LEELA-S1600 (commit 8d5d4fc). Se estes asserts voltarem a falhar,
 * as write rules perderam a checagem de dono atual + imutabilidade do tenantId.
 *
 * Vetor original: a write rule das coleções tenant-scoped só validava
 * request.resource.data.tenantId (doc NOVO), nunca resource.data.tenantId (doc
 * EXISTENTE). Logo o owner do tenant A pode SOBRESCREVER/HIJACK um doc do tenant B
 * conhecendo o docId, desde que carimbe o próprio tenantId (A) no payload.
 */
import {
  assertFails, initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { doc, setDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(RULES_PATH, 'utf8'), host: 'localhost', port: 8080 },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
});
afterAll(async () => { await testEnv?.cleanup(); });

beforeEach(async () => {
  await testEnv.clearFirestore();
  const now = admin.firestore.FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, status: 'ativo', ownerUid: MARINA_UID, criadoEm: now,
  });
  batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, status: 'ativo', ownerUid: 'uid-passo-owner', criadoEm: now,
  });
  // Evento do tenant B (Passo) — a vítima
  batch.set(adminDb.collection('eventos').doc('evento-passo-1'), {
    id: 'evento-passo-1', tenantId: PASSO_ID, nome: 'Passo Certo Run',
    status: 'publicado', receita: 99999, criadoEm: now,
  });
  // Comunicado do tenant B
  batch.set(adminDb.collection('comunicados').doc('com-passo-1'), {
    id: 'com-passo-1', tenantId: PASSO_ID, titulo: 'Aviso oficial Passo',
  });
  await batch.commit();
});

describe('EXPLOIT — takeover cross-tenant por overwrite', () => {
  it('owner de A SOBRESCREVE/HIJACK evento de B carimbando o próprio tenantId', async () => {
    const ctx = testEnv.authenticatedContext(MARINA_UID, {
      role: 'tenant_owner', tenantId: CASTELO_ID,
    });
    // Marina (A) reescreve o evento de B com tenantId=A. Se o gate tivesse
    // checado resource.data.tenantId (doc existente = B), isto DEVE falhar.
    await assertFails(
      setDoc(doc(ctx.firestore(), 'eventos', 'evento-passo-1'), {
        id: 'evento-passo-1', tenantId: CASTELO_ID,
        nome: 'HIJACKED por Castelo', status: 'rascunho',
      })
    );
  });

  it('owner de A HIJACK comunicado de B carimbando o próprio tenantId', async () => {
    const ctx = testEnv.authenticatedContext(MARINA_UID, {
      role: 'tenant_owner', tenantId: CASTELO_ID,
    });
    await assertFails(
      setDoc(doc(ctx.firestore(), 'comunicados', 'com-passo-1'), {
        id: 'com-passo-1', tenantId: CASTELO_ID, titulo: 'Comunicado falso',
      })
    );
  });
});
