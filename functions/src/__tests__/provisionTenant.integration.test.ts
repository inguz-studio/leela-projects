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
 *   - guarda de reuso de conta (fix review Onda1 #2): e-mail de athlete/
 *     platform_admin/owner de outro tenant → failed-precondition e conta
 *     INTACTA; e-mail novo → ok; mesmo owner re-provisionando → replay
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
import { onCreateUser } from '../auth/onCreateUser';
import { setTenantClaims } from '../platform/setTenantClaims';
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

// ── Ordem do rollback: claims ANTES de docs (fix re-review R1) ─────────────
//
// R1: o rollback antigo commitava o batch de docs ANTES de neutralizar as
// claims. Morte do processo entre os dois passos deixava claim stale SEM doc
// e SEM log (o alarme só cobre restore que LANÇA, não processo morto). Agora
// as claims são neutralizadas PRIMEIRO: o pior resíduo de morte parcial é
// doc órfão — que o retry do admin conclui como replay; nunca claim órfã
// (takeover). Estes testes "matam o processo" no passo de docs (batch()
// lança) e provam que as claims JÁ estavam neutralizadas — na ordem antiga
// o batch lançava primeiro e a claim tenant_owner sobrevivia (falhariam).
describe('provisionTenantCore — ordem do rollback: claims primeiro (fix re-review R1)', () => {
  /**
   * Firestore proxied: `batch()` LANÇA — simula a morte do processo no passo
   * de docs do rollback. Leituras e transações funcionam normalmente
   * (`batch()` só é usado pelo rollbackProvisioning).
   */
  function dbWithDeadBatch(realDb: admin.firestore.Firestore): admin.firestore.Firestore {
    return new Proxy(realDb, {
      get(target, prop, receiver) {
        if (prop === 'batch') {
          return () => {
            throw new Error('processo morto no passo de docs (falha injetada)');
          };
        }
        const value = Reflect.get(target, prop, receiver) as unknown;
        return typeof value === 'function'
          ? (value as (...args: unknown[]) => unknown).bind(target)
          : value;
      },
    }) as admin.firestore.Firestore;
  }

  /** Grava a claim de verdade e SÓ ENTÃO falha (mesma injeção do fix #1). */
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

  it('owner PRÉ-existente: morte no passo de docs NÃO deixa claim stale (claims restauradas antes)', async () => {
    const pre = await auth.createUser({ email: 'marina@castelo.com.br' });

    await expect(
      provisionTenantCore(
        dbWithDeadBatch(db),
        auth,
        input(),
        ADMIN_UID,
        failAfterSetDeps()
      )
    ).rejects.toThrow();

    // Claims foram restauradas ANTES do passo de docs (que "morreu"):
    const after = await auth.getUser(pre.uid);
    expect(after.customClaims ?? {}).toEqual({});

    // O doc órfão ficou (o passo de docs nunca rodou) — resíduo inócuo…
    expect((await db.doc('tenants/castelo-producoes').get()).exists).toBe(true);

    // …porque o retry do admin conclui como replay (doc é recuperável):
    const retry = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    expect(retry.replay).toBe(true);
    expect(retry.ownerUid).toBe(pre.uid);
    expect((await auth.getUser(pre.uid)).customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
  });

  it('owner CRIADO no run: morte no passo de docs deixa conta SEM role — nunca claim stale', async () => {
    await expect(
      provisionTenantCore(
        dbWithDeadBatch(db),
        auth,
        input(),
        ADMIN_UID,
        failAfterSetDeps()
      )
    ).rejects.toThrow();

    // A conta criada sobrevive (deleteUser viria DEPOIS dos docs), mas as
    // claims já foram limpas no passo 1 — sem claim órfã de tenant_owner.
    const orphan = await auth.getUserByEmail('marina@castelo.com.br');
    expect(orphan.customClaims ?? {}).toEqual({});

    // Retry do admin reaproveita a conta órfã e conclui como replay:
    const retry = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    expect(retry.replay).toBe(true);
    expect(retry.ownerUid).toBe(orphan.uid);
    expect((await auth.getUser(orphan.uid)).customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
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

// ── Corrida onCreateUser × provisionTenant (fix re-review #8) ──────────────
//
// O trigger Auth onCreate seta role default em TODO usuário novo — inclusive
// no owner que o provisionamento cria via auth.createUser(). A entrega do
// trigger é at-least-once, SEM ordem garantida com o fluxo chamador: se ele
// executar DEPOIS de setTenantClaimsAdmin, o owner era rebaixado a athlete —
// e o retry do admin era REJEITADO pela guarda de papel conflitante do fix #2
// (recuperação só manual, via setTenantClaims). A suíte roda com
// `--only firestore,auth` (triggers de Functions NÃO executam): a ordem
// adversa é simulada aqui invocando a função do trigger DIRETAMENTE, depois
// do provisionamento, contra o Emulator real.
describe('provisionTenantCore — corrida onCreateUser × provisionTenant (fix re-review #8)', () => {
  function runTrigger(user: AnyRec): Promise<unknown> {
    return (
      onCreateUser as unknown as { run: (u: AnyRec) => Promise<unknown> }
    ).run(user);
  }

  it('ordem ADVERSA: trigger executando DEPOIS do provisionamento NÃO rebaixa o owner', async () => {
    const res = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    const owner = await auth.getUser(res.ownerUid);

    // Entrega tardia do trigger, com o payload da criação (snapshot SEM claims)
    await runTrigger({
      uid: owner.uid,
      email: owner.email,
      displayName: owner.displayName,
    });

    // O trigger re-leu as claims atuais e preservou o papel do owner
    const after = await auth.getUser(res.ownerUid);
    expect(after.customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
  });

  it('corrida PERDIDA (owner rebaixado a athlete): retry do admin se AUTO-RECUPERA via replay', async () => {
    const res = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    // Estado pós-corrida no código antigo do trigger: athlete gravado por cima
    await auth.setCustomUserClaims(res.ownerUid, { role: 'athlete' });

    // Código antigo da guarda: failed-precondition (recuperação manual).
    // Agora: doc tenants/{slug}.ownerUid prova ownership → replay reaplica.
    const retry = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    expect(retry.replay).toBe(true);
    expect(retry.ownerUid).toBe(res.ownerUid);

    const healed = await auth.getUser(res.ownerUid);
    expect(healed.customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
  });

  it('exceção é ESTREITA: athlete que NÃO é o owner do doc continua rejeitado', async () => {
    await provisionTenantCore(db, auth, input(), ADMIN_UID); // castelo já tem owner

    const intruso = await auth.createUser({ email: 'intruso@leela.app' });
    await auth.setCustomUserClaims(intruso.uid, { role: 'athlete' });

    await expect(
      provisionTenantCore(
        db,
        auth,
        input({ ownerEmail: 'intruso@leela.app' }),
        ADMIN_UID
      )
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect((await auth.getUser(intruso.uid)).customClaims).toEqual({
      role: 'athlete',
    });
  });

  it('papel conflitante NÃO-athlete nunca entra na exceção (mesmo sendo o ownerUid do doc)', async () => {
    // Estado forjado: doc diz owner, claim diz platform_admin. Rebaixar um
    // admin silenciosamente seria pior que falhar — a exceção cobre SÓ o
    // valor que a corrida do trigger produz ('athlete').
    const res = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    await auth.setCustomUserClaims(res.ownerUid, { role: 'platform_admin' });

    await expect(
      provisionTenantCore(db, auth, input(), ADMIN_UID)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect((await auth.getUser(res.ownerUid)).customClaims).toEqual({
      role: 'platform_admin',
    });
  });

  // TOCTOU da prova doc-proven-owner (fix review L2 #29): a prova é lida
  // FORA da tx. O Proxy abaixo simula o delete concorrente do tenant por
  // OUTRO admin exatamente na janela guarda→tx: `runTransaction` primeiro
  // apaga tenants/{slug} no db real e só então delega à tx real. No código
  // antigo, a tx caía no branch de CRIAÇÃO e promovia o athlete a owner de
  // um tenant novo sobre prova stale (este teste falharia lá).
  it('TOCTOU: delete concorrente do tenant entre a guarda e a tx → rejeição, nunca promoção', async () => {
    function dbWithConcurrentTenantDelete(
      realDb: admin.firestore.Firestore,
      tenantPath: string
    ): admin.firestore.Firestore {
      return new Proxy(realDb, {
        get(target, prop, receiver) {
          if (prop === 'runTransaction') {
            return async (...args: unknown[]) => {
              await realDb.recursiveDelete(realDb.doc(tenantPath));
              return (
                target.runTransaction as (...a: unknown[]) => Promise<unknown>
              ).apply(target, args);
            };
          }
          const value = Reflect.get(target, prop, receiver) as unknown;
          return typeof value === 'function'
            ? (value as (...args: unknown[]) => unknown).bind(target)
            : value;
        },
      }) as admin.firestore.Firestore;
    }

    // Estado pós-corrida: owner rebaixado a athlete CRU (o que a corrida
    // produz) — a guarda entra na exceção athlete+doc com prova válida.
    const res = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    await auth.setCustomUserClaims(res.ownerUid, { role: 'athlete' });

    await expect(
      provisionTenantCore(
        dbWithConcurrentTenantDelete(db, 'tenants/castelo-producoes'),
        auth,
        input(),
        ADMIN_UID
      )
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    // NENHUM tenant recriado sobre a prova stale; athlete continua athlete
    expect((await db.doc('tenants/castelo-producoes').get()).exists).toBe(false);
    expect((await auth.getUser(res.ownerUid)).customClaims).toEqual({
      role: 'athlete',
    });
  });
});

// ── Demoção DELIBERADA não é re-elevada (fix review L2 #12) ────────────────
//
// O achado: a demoção deliberada do owner pelo admin (setTenantClaims
// {role:'athlete'}) produzia estado byte-idêntico ao da corrida do trigger —
// e a exceção athlete+doc re-elevava o owner rebaixado em QUALQUER
// provisionTenant futuro do slug, como "claim repair" com replay:true.
// Agora mergeTenantClaims grava `demotedFromRole` na demoção via superfície
// admin; a exceção exige a AUSÊNCIA do marcador. Ordem adversa simulada
// exercitando o CALLABLE real contra o Emulator, como no fix #8.
// Estes testes falhariam no código antigo (re-elevação silenciosa).
describe('provisionTenantCore — demoção deliberada × exceção athlete+doc (fix review L2 #12)', () => {
  const adminCtx = { auth: { uid: ADMIN_UID, token: { role: 'platform_admin' } } };

  function runSetClaims(data: AnyRec): Promise<unknown> {
    return (
      setTenantClaims as unknown as {
        run: (d: AnyRec, c: AnyRec) => Promise<unknown>;
      }
    ).run(data, adminCtx);
  }

  it('owner rebaixado DELIBERADAMENTE pelo admin NÃO é re-elevado por provisionTenant', async () => {
    const res = await provisionTenantCore(db, auth, input(), ADMIN_UID);

    // Demoção deliberada via callable real — grava o marcador
    await runSetClaims({ uid: res.ownerUid, role: 'athlete' });
    const demoted = await auth.getUser(res.ownerUid);
    expect(demoted.customClaims).toEqual({
      role: 'athlete',
      demotedFromRole: 'tenant_owner',
    });

    // provisionTenant futuro do slug (doc segue ativo com ownerUid intacto):
    // no código antigo era replay + re-elevação; agora REJEITA.
    await expect(
      provisionTenantCore(db, auth, input(), ADMIN_UID)
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    // Decisão administrativa preservada — claims intactas
    const after = await auth.getUser(res.ownerUid);
    expect(after.customClaims).toEqual({
      role: 'athlete',
      demotedFromRole: 'tenant_owner',
    });
  });

  it('re-elevação SUPORTADA (setTenantClaims) limpa o marcador → replay volta a funcionar', async () => {
    const res = await provisionTenantCore(db, auth, input(), ADMIN_UID);

    await runSetClaims({ uid: res.ownerUid, role: 'athlete' });
    await runSetClaims({
      uid: res.ownerUid,
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });

    const healed = await auth.getUser(res.ownerUid);
    expect(healed.customClaims).toEqual({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });

    // Marcador limpo → retry do admin conclui como replay normal
    const retry = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    expect(retry.replay).toBe(true);
    expect(retry.ownerUid).toBe(res.ownerUid);
  });

  it('corrida ACIDENTAL segue auto-recuperável: athlete SEM marcador → replay repara', async () => {
    // Gêmeo do teste do fix #8 — a corrida grava athlete CRU (sem marcador);
    // a exceção athlete+doc continua valendo para este estado.
    const res = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    await auth.setCustomUserClaims(res.ownerUid, { role: 'athlete' });

    const retry = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    expect(retry.replay).toBe(true);

    const healed = await auth.getUser(res.ownerUid);
    expect(healed.customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
  });
});

// ── Guarda de reuso de conta por e-mail (fix review Onda1 #2) ─────────────
//
// O achado: o caminho FELIZ reaproveitava qualquer conta Auth pelo e-mail e
// setTenantClaimsAdmin SUBSTITUÍA o claim inteiro — um athlete (ou admin)
// virava tenant_owner silenciosamente por typo/colisão de e-mail. Agora o
// papel conflitante é rejeitado com erro de negócio ANTES de qualquer
// escrita. Os testes de rejeição falhariam no código antigo (provisionava).
describe('provisionTenantCore — guarda de reuso de conta por e-mail (fix review #2)', () => {
  it('e-mail de ATHLETE → failed-precondition e conta intacta (sem conversão)', async () => {
    const athlete = await auth.createUser({ email: 'atleta@leela.app' });
    await auth.setCustomUserClaims(athlete.uid, { role: 'athlete' });

    await expect(
      provisionTenantCore(
        db,
        auth,
        input({ ownerEmail: 'atleta@leela.app' }),
        ADMIN_UID
      )
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    // Conta intacta: papel athlete preservado, NENHUM doc de tenant criado
    const after = await auth.getUser(athlete.uid);
    expect(after.customClaims).toEqual({ role: 'athlete' });
    expect((await db.doc('tenants/castelo-producoes').get()).exists).toBe(false);
    expect((await db.collection('profissionais').get()).size).toBe(0);
  });

  it('e-mail de PLATFORM_ADMIN → failed-precondition (nunca rebaixa admin)', async () => {
    const otherAdmin = await auth.createUser({ email: 'admin@leela.app' });
    await auth.setCustomUserClaims(otherAdmin.uid, { role: 'platform_admin' });

    await expect(
      provisionTenantCore(
        db,
        auth,
        input({ ownerEmail: 'admin@leela.app' }),
        ADMIN_UID
      )
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    const after = await auth.getUser(otherAdmin.uid);
    expect(after.customClaims).toEqual({ role: 'platform_admin' });
  });

  it('e-mail de tenant_owner de OUTRO tenant (só claim, sem doc) → failed-precondition', async () => {
    // Claims-only: sem doc profissionais/ — o código antigo passava pela
    // checagem de profissional e SOBRESCREVIA o claim (este teste o pegava)
    const dono = await auth.createUser({ email: 'dono@outra-marca.com' });
    await auth.setCustomUserClaims(dono.uid, {
      role: 'tenant_owner',
      tenantId: 'outra-marca',
    });

    await expect(
      provisionTenantCore(
        db,
        auth,
        input({ ownerEmail: 'dono@outra-marca.com' }),
        ADMIN_UID
      )
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    const after = await auth.getUser(dono.uid);
    expect(after.customClaims).toEqual({
      role: 'tenant_owner',
      tenantId: 'outra-marca',
    });
  });

  it('e-mail NOVO → provisiona normalmente (guarda não afeta o caminho feliz)', async () => {
    const res = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    expect(res.replay).toBe(false);
    const owner = await auth.getUser(res.ownerUid);
    expect(owner.customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
  });

  it('conta pré-existente SEM role → reusada (fluxo de conta pré-criada)', async () => {
    const pre = await auth.createUser({ email: 'marina@castelo.com.br' });
    const res = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    expect(res.ownerUid).toBe(pre.uid);
    const owner = await auth.getUser(pre.uid);
    expect(owner.customClaims).toMatchObject({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
  });

  it('tenant_owner do MESMO tenant re-provisionando → replay idempotente documentado', async () => {
    // Comportamento CANÔNICO: retry/replay do mesmo pedido devolve
    // replay:true, não duplica docs e reaplica exatamente as mesmas claims.
    // A prova de ownership é o doc tenants/{slug}.ownerUid — NÃO a claim.
    const r1 = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    const r2 = await provisionTenantCore(db, auth, input(), ADMIN_UID);

    expect(r2.replay).toBe(true);
    expect(r2.ownerUid).toBe(r1.ownerUid);
    const owner = await auth.getUser(r1.ownerUid);
    expect(owner.customClaims).toEqual({
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
  });
});

// ── Merge de claims no caminho FELIZ (fix re-review R3) ────────────────────
//
// R3: o rollback preservava claims não relacionadas, mas o caminho FELIZ as
// destruía (setTenantClaimsAdmin substituía o objeto inteiro). Este é o teste
// que o re-review provou falhar no Emulator com o código antigo.
describe('provisionTenantCore — merge de claims no caminho feliz (fix re-review R3)', () => {
  it('claims não relacionadas SOBREVIVEM ao provisionamento (merge, não replace)', async () => {
    const pre = await auth.createUser({ email: 'marina@castelo.com.br' });
    // Sem role — a guarda de reuso deixa passar; `beta` não é papel
    await auth.setCustomUserClaims(pre.uid, { beta: true });

    const res = await provisionTenantCore(db, auth, input(), ADMIN_UID);
    expect(res.ownerUid).toBe(pre.uid);

    const owner = await auth.getUser(pre.uid);
    expect(owner.customClaims).toEqual({
      beta: true,
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
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
