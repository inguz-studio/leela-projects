/**
 * provisionTenant.integration.test.ts — LEELA-S1601-T1
 *
 * Integração REAL no Emulator (Firestore + Auth): provisionamento atômico.
 *
 * Cobre (RN-403/401/402/404/405):
 *   - happy path: tenants/{slug} ativo + profissionais/{owner} + termos v1
 *     + claims tenant_owner/tenantId — tudo criado de uma vez
 *   - idempotência: retry do MESMO pedido → replay (sem duplicar, sem erro)
 *   - aprovação: tenant `pending` (Passo Certo) → `ativo` com owner/termos
 *   - ROLLBACK: falha ao setar claim → nenhum doc sobrevive, usuário Auth
 *     criado é removido (não fica tenant meio-provisionado)
 *   - ROLLBACK pós-setCustomUserClaims (fix review Onda1 #1): falha DEPOIS
 *     da claim gravada (revoke caiu) → claims anteriores RESTAURADAS, sem
 *     claim órfã; re-provisionar o slug p/ outro owner NÃO dá takeover
 *   - rollback de aprovação: doc pending restaurado byte a byte
 *   - conflitos: slug ativo de outro owner; owner já de outro tenant;
 *     tenant suspenso
 *   - autorização do callable: só platform_admin
 *
 * Pré-requisito: Emulator Firestore (8080) + Auth (9099) via emulators:exec.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';
import {
  provisionTenantCore,
  provisionTenant,
  type ProvisionDeps,
} from '../platform/provisionTenant';
import type { ProvisionInput } from '@leela/core';

const PROJECT_ID = 'demo-leela';
const ADMIN_UID = 'uid-platform-admin';

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

type AnyRec = Record<string, unknown>;

function input(overrides: Partial<ProvisionInput> = {}): ProvisionInput {
  return {
    nome: 'Castelo Produções',
    slug: 'castelo-producoes',
    tipo: 'produtor',
    ownerEmail: 'marina@castelo.com.br',
    ownerNome: 'Marina Castelo',
    ...overrides,
  };
}

async function clearAll(): Promise<void> {
  // Limpa Firestore (coleções usadas) e usuários Auth do Emulator
  const collections = await db.listCollections();
  for (const col of collections) {
    const docs = await col.listDocuments();
    for (const ref of docs) {
      await db.recursiveDelete(ref);
    }
  }
  const users = await auth.listUsers(1000);
  await Promise.all(users.users.map((u) => auth.deleteUser(u.uid)));
}

beforeAll(() => {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= 'localhost:9099';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
  auth = admin.auth();
});

beforeEach(async () => {
  await clearAll();
});

// ── Happy path (RN-403) ────────────────────────────────────────────────────
describe('provisionTenantCore — happy path', () => {
  it('cria tenant ativo + profissional + termos v1 + claims atomicamente', async () => {
    const res = await provisionTenantCore(db, auth, input(), ADMIN_UID);

    expect(res.replay).toBe(false);
    expect(res.tenantId).toBe('castelo-producoes');

    // Tenant ativo
    const tenant = await db.doc('tenants/castelo-producoes').get();
    expect(tenant.exists).toBe(true);
    expect(tenant.get('status')).toBe('ativo');
    expect(tenant.get('ownerUid')).toBe(res.ownerUid);
    expect(tenant.get('gmvAcumulado')).toBe(0);

    // Profissional owner
    const prof = await db.doc(`profissionais/${res.ownerUid}`).get();
    expect(prof.exists).toBe(true);
    expect(prof.get('tenantId')).toBe('castelo-producoes');
    expect(prof.get('email')).toBe('marina@castelo.com.br');

    // Termos iniciais: current versao 1 + snapshot v1 (default canônico)
    const current = await db
      .doc('tenants/castelo-producoes/commercialTerms/current')
      .get();
    expect(current.exists).toBe(true);
    expect(current.get('versao')).toBe(1);
    expect(current.get('platformFeePct')).toBe(10.5);
    expect(current.get('saasMonthlyFee')).toBe(0); // RN-405
    const v1 = await db
      .doc('tenants/castelo-producoes/commercialTerms/v1')
      .get();
    expect(v1.exists).toBe(true);

    // Claims aplicadas (RN-401)
    const owner = await auth.getUser(res.ownerUid);
    expect(owner.customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
  });

  it('aceita termos iniciais custom (fee 8% / SaaS 199)', async () => {
    const res = await provisionTenantCore(
      db,
      auth,
      input({ slug: 'passo-certo', ownerEmail: 'owner@passo.com', platformFeePct: 8, saasMonthlyFee: 199 }),
      ADMIN_UID
    );
    const current = await db
      .doc(`tenants/${res.tenantId}/commercialTerms/current`)
      .get();
    expect(current.get('platformFeePct')).toBe(8);
    expect(current.get('saasMonthlyFee')).toBe(199);
  });
});

// ── Idempotência / retry-safe ──────────────────────────────────────────────
describe('provisionTenantCore — idempotência', () => {
  it('retry do mesmo pedido → replay sem duplicar nada', async () => {
    const r1 = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    const r2 = await provisionTenantCore(db, auth, input(), ADMIN_UID);

    expect(r2.replay).toBe(true);
    expect(r2.tenantId).toBe(r1.tenantId);
    expect(r2.ownerUid).toBe(r1.ownerUid);

    // Termos continuam na versao 1 (retry não infla versão)
    const current = await db
      .doc('tenants/castelo-producoes/commercialTerms/current')
      .get();
    expect(current.get('versao')).toBe(1);

    // Um único profissional
    const profs = await db
      .collection('profissionais')
      .where('tenantId', '==', 'castelo-producoes')
      .get();
    expect(profs.size).toBe(1);
  });

  it('replay reaplica claims (cobre falha pós-commit do run anterior)', async () => {
    const r1 = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    // Simula claims perdidas (run anterior morreu depois do commit)
    await auth.setCustomUserClaims(r1.ownerUid, null);

    const r2 = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    expect(r2.replay).toBe(true);

    const owner = await auth.getUser(r1.ownerUid);
    expect(owner.customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
  });
});

// ── Aprovação de pending (RN-402) ──────────────────────────────────────────
describe('provisionTenantCore — aprovação de tenant pending', () => {
  beforeEach(async () => {
    await db.doc('tenants/passo-certo').set({
      id: 'passo-certo',
      nome: 'Passo Certo Eventos',
      slug: 'passo-certo',
      status: 'pending',
      ownerUid: 'uid-placeholder',
      tipo: 'promotor',
      gmvAcumulado: 0,
      eventosAtivos: 0,
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  it('pending → ativo com owner real, termos e claims', async () => {
    const res = await provisionTenantCore(
      db,
      auth,
      input({ nome: 'Passo Certo Eventos', slug: 'passo-certo', tipo: 'promotor', ownerEmail: 'owner@passo.com' }),
      ADMIN_UID
    );

    const tenant = await db.doc('tenants/passo-certo').get();
    expect(tenant.get('status')).toBe('ativo');
    expect(tenant.get('ownerUid')).toBe(res.ownerUid);

    const current = await db
      .doc('tenants/passo-certo/commercialTerms/current')
      .get();
    expect(current.exists).toBe(true);
    expect(current.get('versao')).toBe(1);

    const owner = await auth.getUser(res.ownerUid);
    expect(owner.customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: 'passo-certo',
    });
  });
});

// ── Rollback total em falha de claims (RN-403) ────────────────────────────
describe('provisionTenantCore — rollback em falha de claims', () => {
  const failingDeps: ProvisionDeps = {
    setClaims: async () => {
      throw new Error('claims indisponíveis (falha injetada)');
    },
  };

  it('criação do zero: NENHUM doc sobrevive e usuário Auth criado é removido', async () => {
    await expect(
      provisionTenantCore(db, auth, input(), ADMIN_UID, failingDeps)
    ).rejects.toMatchObject({ code: 'internal' });

    expect((await db.doc('tenants/castelo-producoes').get()).exists).toBe(false);
    expect(
      (await db.doc('tenants/castelo-producoes/commercialTerms/current').get()).exists
    ).toBe(false);
    expect(
      (await db.doc('tenants/castelo-producoes/commercialTerms/v1').get()).exists
    ).toBe(false);

    const profs = await db.collection('profissionais').get();
    expect(profs.size).toBe(0);

    // Usuário Auth criado pelo provisionamento também foi revertido
    await expect(auth.getUserByEmail('marina@castelo.com.br')).rejects.toThrow();
  });

  it('usuário Auth PRÉ-existente é preservado no rollback (só desfaz o que criou)', async () => {
    const preexisting = await auth.createUser({
      email: 'marina@castelo.com.br',
      displayName: 'Marina Castelo',
    });

    await expect(
      provisionTenantCore(db, auth, input(), ADMIN_UID, failingDeps)
    ).rejects.toMatchObject({ code: 'internal' });

    // Docs revertidos, mas a conta Auth que já existia permanece
    expect((await db.doc('tenants/castelo-producoes').get()).exists).toBe(false);
    const still = await auth.getUser(preexisting.uid);
    expect(still.email).toBe('marina@castelo.com.br');
  });

  it('aprovação de pending: rollback restaura o doc pending original', async () => {
    await db.doc('tenants/passo-certo').set({
      id: 'passo-certo',
      nome: 'Passo Certo Eventos',
      slug: 'passo-certo',
      status: 'pending',
      ownerUid: 'uid-placeholder',
      tipo: 'promotor',
      gmvAcumulado: 0,
      eventosAtivos: 0,
    });

    await expect(
      provisionTenantCore(
        db,
        auth,
        input({ nome: 'Passo Certo Eventos', slug: 'passo-certo', tipo: 'promotor', ownerEmail: 'owner@passo.com' }),
        ADMIN_UID,
        failingDeps
      )
    ).rejects.toMatchObject({ code: 'internal' });

    const tenant = await db.doc('tenants/passo-certo').get();
    expect(tenant.exists).toBe(true);
    expect(tenant.get('status')).toBe('pending'); // restaurado
    expect(tenant.get('ownerUid')).toBe('uid-placeholder');
    // Termos criados na aprovação foram revertidos
    expect(
      (await db.doc('tenants/passo-certo/commercialTerms/current').get()).exists
    ).toBe(false);
  });
});

// ── Rollback com falha PÓS-setCustomUserClaims (fix review Onda1 #1) ──────
//
// O achado: setTenantClaimsAdmin roda em 2 etapas (setCustomUserClaims →
// revokeRefreshTokens). Se a 1ª grava e a 2ª falha, a claim tenant_owner JÁ
// está no usuário quando o rollback roda. O rollback antigo (só delete de
// docs) deixava a claim órfã → re-provisionar o slug para OUTRO owner dava
// ao usuário da falha acesso de writer ao tenant novo (takeover cross-owner).
// Estes testes injetam a falha DEPOIS do set — falhariam no código antigo.
describe('provisionTenantCore — falha PÓS-setCustomUserClaims (fix review #1)', () => {
  /** Grava a claim de verdade e SÓ ENTÃO falha (simula revoke caindo). */
  function failAfterSetDeps(): ProvisionDeps {
    return {
      setClaims: async (uid, role, tenantId) => {
        await auth.setCustomUserClaims(
          uid,
          tenantId ? { role, tenantId } : { role }
        );
        throw new Error('revokeRefreshTokens caiu (falha injetada PÓS-set)');
      },
    };
  }

  it('owner pré-existente NÃO fica com claim stale de tenant_owner', async () => {
    const pre = await auth.createUser({ email: 'marina@castelo.com.br' });

    await expect(
      provisionTenantCore(db, auth, input(), ADMIN_UID, failAfterSetDeps())
    ).rejects.toMatchObject({ code: 'internal' });

    // Docs revertidos E claims limpas — nada de claim órfã
    expect((await db.doc('tenants/castelo-producoes').get()).exists).toBe(false);
    const after = await auth.getUser(pre.uid);
    expect(after.customClaims ?? {}).toEqual({});
  });

  it('claims ANTERIORES são RESTAURADAS (snapshot, não apenas delete)', async () => {
    const pre = await auth.createUser({ email: 'marina@castelo.com.br' });
    // Claims prévias SEM role (não conflitam com a guarda de reuso)
    await auth.setCustomUserClaims(pre.uid, { beta: true });

    await expect(
      provisionTenantCore(db, auth, input(), ADMIN_UID, failAfterSetDeps())
    ).rejects.toMatchObject({ code: 'internal' });

    const after = await auth.getUser(pre.uid);
    expect(after.customClaims).toEqual({ beta: true }); // estado anterior, intacto
  });

  it('EXPLOIT do review: re-provisionar o slug para OUTRO owner não dá acesso ao usuário da falha', async () => {
    // 1. U pré-existe no Auth; provisionamento de castelo-producoes p/ U
    //    falha APÓS setCustomUserClaims (claim chegou a ser gravada)
    const u = await auth.createUser({ email: 'marina@castelo.com.br' });
    await expect(
      provisionTenantCore(db, auth, input(), ADMIN_UID, failAfterSetDeps())
    ).rejects.toMatchObject({ code: 'internal' });

    // 2. Mais tarde o admin re-provisiona o MESMO slug para V (outro owner)
    const res = await provisionTenantCore(
      db,
      auth,
      input({ ownerEmail: 'victor@vencedor.com', ownerNome: 'Victor' }),
      ADMIN_UID
    );
    expect(res.replay).toBe(false);
    expect(res.ownerUid).not.toBe(u.uid);

    // 3. V é o único com claims do tenant; U NÃO carrega role/tenantId
    //    (sem takeover cross-owner — eixo RBAC do handoff)
    const v = await auth.getUser(res.ownerUid);
    expect(v.customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
    const uAfter = await auth.getUser(u.uid);
    expect(uAfter.customClaims?.['role']).toBeUndefined();
    expect(uAfter.customClaims?.['tenantId']).toBeUndefined();
  });
});

// ── Conflitos ──────────────────────────────────────────────────────────────
describe('provisionTenantCore — conflitos', () => {
  it('slug ativo com OUTRO owner → already-exists', async () => {
    await provisionTenantCore(db, auth, input(), ADMIN_UID);
    await expect(
      provisionTenantCore(
        db,
        auth,
        input({ ownerEmail: 'outra@pessoa.com' }),
        ADMIN_UID
      )
    ).rejects.toMatchObject({ code: 'already-exists' });
  });

  it('owner que já pertence a OUTRO tenant → failed-precondition', async () => {
    await provisionTenantCore(db, auth, input(), ADMIN_UID);
    await expect(
      provisionTenantCore(
        db,
        auth,
        input({ slug: 'segunda-marca', nome: 'Segunda Marca' }),
        ADMIN_UID
      )
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('tenant suspenso → failed-precondition (reativação é via transitionTenant)', async () => {
    await db.doc('tenants/castelo-producoes').set({
      id: 'castelo-producoes',
      nome: 'Castelo Produções',
      slug: 'castelo-producoes',
      status: 'suspenso',
      ownerUid: 'uid-antigo',
      tipo: 'produtor',
    });
    await expect(
      provisionTenantCore(db, auth, input(), ADMIN_UID)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });

  it('input inválido → invalid-argument (sem tocar Auth/Firestore)', async () => {
    await expect(
      provisionTenantCore(db, auth, input({ slug: 'Slug Inválido' }), ADMIN_UID)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    const users = await auth.listUsers(10);
    expect(users.users.length).toBe(0);
  });
});

// ── Autorização do callable (RN-401) ──────────────────────────────────────
describe('provisionTenant (callable) — autorização', () => {
  function runCallable(data: AnyRec, ctx: AnyRec): Promise<unknown> {
    return (
      provisionTenant as unknown as {
        run: (d: AnyRec, c: AnyRec) => Promise<unknown>;
      }
    ).run(data, ctx);
  }

  it('caller não autenticado → unauthenticated', async () => {
    await expect(runCallable(input() as unknown as AnyRec, {})).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('caller tenant_owner → permission-denied', async () => {
    await expect(
      runCallable(input() as unknown as AnyRec, {
        auth: { uid: 'x', token: { role: 'tenant_owner', tenantId: 'castelo-producoes' } },
      })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('caller athlete → permission-denied', async () => {
    await expect(
      runCallable(input() as unknown as AnyRec, {
        auth: { uid: 'y', token: { role: 'athlete' } },
      })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('caller platform_admin → provisiona de ponta a ponta', async () => {
    const res = (await runCallable(input() as unknown as AnyRec, {
      auth: { uid: ADMIN_UID, token: { role: 'platform_admin' } },
    })) as AnyRec;
    expect(res).toMatchObject({ tenantId: 'castelo-producoes', replay: false });
  });
});
