/**
 * convitesOrganizadorRules.integration.test.ts — LEELA-S1608-T1
 *
 * ATAQUE às Security Rules de `convitesOrganizador` (RN-413/414) no Firestore
 * Emulator. O critério de pronto do pacote exige que a tranca seja provada
 * por Rules, não por tela: um cliente comum não pode ler nem escrever a
 * coleção de códigos, e nem o platform_admin pode forjar o carimbo de uso.
 *
 * Cobre:
 *   - leitura NEGADA a tenant_owner, tenant_staff, promoter, athlete e
 *     anônimo — a coleção inteira é o dicionário de códigos válidos
 *     (enumeração em uma query se vazasse);
 *   - escrita NEGADA a qualquer papel que não seja platform_admin;
 *   - platform_admin gera código `ativo` com shape válido; código fora do
 *     alfabeto/tamanho, nota gigante ou `expiraEm` de tipo errado negados;
 *   - carimbo de uso (`status: 'usado'`, `usadoPor`, `usadoEm`, `tenantId`)
 *     NEGADO pelo cliente — é exclusivo da Function (Admin SDK);
 *   - revogação só alcança código `ativo`; código `usado` é imutável;
 *   - delete negado para todos (o convite queimado é auditoria de acesso).
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
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { COLECAO_CONVITES_ORGANIZADOR } from '@leela/core';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const ADMIN_UID = 'uid-platform-admin';
const OUTRO_ADMIN_UID = 'uid-platform-admin-2';
const OWNER_UID = 'uid-marina-castelo';
const CASTELO_ID = 'castelo-producoes';

/** Códigos de fixture (8 chars, alfabeto RN-413). */
const CODIGO_ATIVO = 'AB23CD45';
const CODIGO_USADO = 'EF67GH89';
const CODIGO_NOVO = 'JK23MN45';

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function ctxAs(uid: string, claims: Record<string, unknown>) {
  return testEnv.authenticatedContext(uid, claims);
}

function conviteRef(db: ReturnType<ReturnType<typeof ctxAs>['firestore']>, codigo: string) {
  return doc(db, COLECAO_CONVITES_ORGANIZADOR, codigo);
}

/** Payload mínimo válido de geração (o que a tela do super-admin manda). */
function novoConvite(codigo: string, overrides: Record<string, unknown> = {}) {
  return {
    codigo,
    status: 'ativo',
    criadoPor: ADMIN_UID,
    criadoEm: new Date(),
    ...overrides,
  };
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
  const col = adminDb.collection(COLECAO_CONVITES_ORGANIZADOR);
  batch.set(col.doc(CODIGO_ATIVO), {
    codigo: CODIGO_ATIVO,
    status: 'ativo',
    nota: 'Para o Francisco',
    criadoPor: ADMIN_UID,
    criadoEm: now,
  });
  batch.set(col.doc(CODIGO_USADO), {
    codigo: CODIGO_USADO,
    status: 'usado',
    criadoPor: ADMIN_UID,
    criadoEm: now,
    usadoPor: OWNER_UID,
    usadoEm: now,
    tenantId: CASTELO_ID,
  });
  await batch.commit();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

// ── Leitura: só platform_admin (RN-414 · anti-enumeração) ────────────────
describe('convitesOrganizador — leitura', () => {
  it('platform_admin lê', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(getDoc(conviteRef(ctx.firestore(), CODIGO_ATIVO)));
  });

  it('tenant_owner NÃO lê', async () => {
    const ctx = ctxAs(OWNER_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(getDoc(conviteRef(ctx.firestore(), CODIGO_ATIVO)));
  });

  it('tenant_staff NÃO lê', async () => {
    const ctx = ctxAs('uid-staff', { role: 'tenant_staff', tenantId: CASTELO_ID });
    await assertFails(getDoc(conviteRef(ctx.firestore(), CODIGO_ATIVO)));
  });

  it('promoter NÃO lê', async () => {
    const ctx = ctxAs('uid-promoter', { role: 'promoter', tenantId: CASTELO_ID });
    await assertFails(getDoc(conviteRef(ctx.firestore(), CODIGO_ATIVO)));
  });

  it('athlete NÃO lê', async () => {
    const ctx = ctxAs('uid-atleta', { role: 'athlete' });
    await assertFails(getDoc(conviteRef(ctx.firestore(), CODIGO_ATIVO)));
  });

  it('conta recém-cadastrada (sem claim de papel) NÃO lê', async () => {
    const ctx = ctxAs('uid-candidato', {});
    await assertFails(getDoc(conviteRef(ctx.firestore(), CODIGO_ATIVO)));
  });

  it('anônimo NÃO lê', async () => {
    const ctx = testEnv.unauthenticatedContext();
    await assertFails(getDoc(conviteRef(ctx.firestore(), CODIGO_ATIVO)));
  });
});

// ── Geração: só platform_admin, e o código nasce limpo (RN-413) ──────────
describe('convitesOrganizador — geração', () => {
  it('platform_admin gera código ativo', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      setDoc(conviteRef(ctx.firestore(), CODIGO_NOVO), novoConvite(CODIGO_NOVO))
    );
  });

  it('platform_admin gera com nota e validade', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      setDoc(
        conviteRef(ctx.firestore(), CODIGO_NOVO),
        novoConvite(CODIGO_NOVO, {
          nota: 'Beta do Francisco',
          expiraEm: new Date(Date.now() + 86_400_000),
        })
      )
    );
  });

  it('conta sem papel NÃO gera', async () => {
    const ctx = ctxAs('uid-candidato', {});
    await assertFails(
      setDoc(conviteRef(ctx.firestore(), CODIGO_NOVO), novoConvite(CODIGO_NOVO))
    );
  });

  it('tenant_owner NÃO gera', async () => {
    const ctx = ctxAs(OWNER_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(conviteRef(ctx.firestore(), CODIGO_NOVO), novoConvite(CODIGO_NOVO))
    );
  });

  it('docId fora do alfabeto/tamanho é negado', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    for (const ruim of ['AB23CD4', 'AB23CD456', 'ab23cd45', 'AB23CD4O', 'AB23CD41']) {
      await assertFails(setDoc(conviteRef(ctx.firestore(), ruim), novoConvite(ruim)));
    }
  });

  it('campo `codigo` divergente do docId é negado', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      setDoc(conviteRef(ctx.firestore(), CODIGO_NOVO), novoConvite('PQ23RS45'))
    );
  });

  it('nascer com carimbo de uso é negado (auditoria falsa)', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    for (const forjado of [
      { status: 'usado' },
      { usadoPor: OWNER_UID },
      { usadoEm: new Date() },
      { tenantId: CASTELO_ID },
    ]) {
      await assertFails(
        setDoc(conviteRef(ctx.firestore(), CODIGO_NOVO), novoConvite(CODIGO_NOVO, forjado))
      );
    }
  });

  it('criadoPor de OUTRA pessoa é negado', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      setDoc(
        conviteRef(ctx.firestore(), CODIGO_NOVO),
        novoConvite(CODIGO_NOVO, { criadoPor: OUTRO_ADMIN_UID })
      )
    );
  });

  it('nota acima do teto e expiraEm de tipo errado são negados', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      setDoc(
        conviteRef(ctx.firestore(), CODIGO_NOVO),
        novoConvite(CODIGO_NOVO, { nota: 'x'.repeat(201) })
      )
    );
    await assertFails(
      setDoc(
        conviteRef(ctx.firestore(), CODIGO_NOVO),
        novoConvite(CODIGO_NOVO, { expiraEm: '2026-12-31' })
      )
    );
  });

  it('status fora do enum é negado', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      setDoc(
        conviteRef(ctx.firestore(), CODIGO_NOVO),
        novoConvite(CODIGO_NOVO, { status: 'liberado' })
      )
    );
  });
});

// ── Revogação e imutabilidade do carimbo (RN-413/414) ───────────────────
describe('convitesOrganizador — revogação e carimbo', () => {
  it('platform_admin revoga código ativo', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertSucceeds(
      updateDoc(conviteRef(ctx.firestore(), CODIGO_ATIVO), {
        status: 'revogado',
        revogadoPor: ADMIN_UID,
        revogadoEm: new Date(),
      })
    );
  });

  it('revogar código JÁ USADO é negado (não desfaz tenant — RN-413)', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      updateDoc(conviteRef(ctx.firestore(), CODIGO_USADO), {
        status: 'revogado',
        revogadoPor: ADMIN_UID,
        revogadoEm: new Date(),
      })
    );
  });

  it('cliente NÃO marca `usado` (exclusivo da Function — RN-414)', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      updateDoc(conviteRef(ctx.firestore(), CODIGO_ATIVO), {
        status: 'usado',
        usadoPor: OWNER_UID,
        usadoEm: new Date(),
        tenantId: CASTELO_ID,
      })
    );
  });

  it('revogação que tenta carimbar tenantId de brinde é negada', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      updateDoc(conviteRef(ctx.firestore(), CODIGO_ATIVO), {
        status: 'revogado',
        revogadoPor: ADMIN_UID,
        revogadoEm: new Date(),
        tenantId: CASTELO_ID,
      })
    );
  });

  it('revogar em nome de OUTRO admin é negado', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      updateDoc(conviteRef(ctx.firestore(), CODIGO_ATIVO), {
        status: 'revogado',
        revogadoPor: OUTRO_ADMIN_UID,
        revogadoEm: new Date(),
      })
    );
  });

  it('reescrever `criadoPor` na revogação é negado', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(
      updateDoc(conviteRef(ctx.firestore(), CODIGO_ATIVO), {
        status: 'revogado',
        revogadoPor: ADMIN_UID,
        revogadoEm: new Date(),
        criadoPor: OUTRO_ADMIN_UID,
      })
    );
  });

  it('tenant_owner NÃO revoga', async () => {
    const ctx = ctxAs(OWNER_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      updateDoc(conviteRef(ctx.firestore(), CODIGO_ATIVO), { status: 'revogado' })
    );
  });

  it('delete é negado até para platform_admin (auditoria de acesso)', async () => {
    const ctx = ctxAs(ADMIN_UID, { role: 'platform_admin' });
    await assertFails(deleteDoc(conviteRef(ctx.firestore(), CODIGO_ATIVO)));
    await assertFails(deleteDoc(conviteRef(ctx.firestore(), CODIGO_USADO)));
  });
});
