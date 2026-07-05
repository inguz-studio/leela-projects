/**
 * onCreateUser.test.ts — trigger de criação de usuário (F2 — review S1600).
 *
 * Cobre RN-401 (papel vem do servidor, cliente nunca forja):
 *   - novo usuário recebe claim role='athlete', SEM tenantId
 *   - cria doc atletas/{uid}
 *   - displayName/email NÃO conseguem forjar role nem tenantId
 *
 * Fix re-review #8 (corrida onCreateUser × provisionTenant):
 *   - o trigger RE-LÊ as claims atuais (getUser) e NUNCA sobrescreve role
 *     existente — owner provisionado antes da entrega do trigger não é
 *     rebaixado a athlete; redelivery tardia (at-least-once) idem
 *   - sem role → default por MERGE (claims não relacionadas preservadas)
 *
 * Fix review Onda1-L2 #11 (verificação pós-escrita):
 *   - papel final 'athlete' + doc tenants/{slug} ownerUid==uid ATIVO →
 *     REPARO para tenant_owner+tenantId + WARN user_created_race_repaired
 *   - athlete legítimo (sem tenant) → nenhum reparo, 1 única escrita
 *   - marcador `demotedFromRole` (demoção deliberada, fix #12) → NUNCA repara
 *   - redelivery com role athlete já gravado + doc proven → repara (cura
 *     crash entre a escrita do default e o check)
 *
 * admin.auth()/admin.firestore() stubbados (sem emulator): valida a LÓGICA.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { onCreateUser } from '../auth/onCreateUser';

vi.mock('firebase-functions/logger', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

type AnyRec = Record<string, unknown>;

// Estado das claims no "Auth" stubbado: setCustomUserClaims grava aqui e a
// releitura via getUser enxerga a escrita — espelha o Auth real, essencial
// para a verificação pós-escrita do fix #11 (que re-lê após gravar).
let authClaims: AnyRec | undefined;
const setCustomUserClaims = vi.fn(async (_uid: string, claims: AnyRec | null) => {
  authClaims = claims ?? undefined;
});
const getUser = vi.fn(async (uid: string): Promise<AnyRec> => ({
  uid,
  customClaims: authClaims,
}));

// M5 (review E00): onCreateUser passou de set() a create() retry-safe — o stub
// expoe ambos apontando ao MESMO spy para nao alterar as assercoes originais.
const docSet = vi.fn(async () => undefined);
const docDelete = vi.fn(async () => undefined);
const docRef = { set: docSet, create: docSet, delete: docDelete };

// Fix #11: pós-escrita consulta tenants.where('ownerUid','==',uid).limit(1).
// Default: nenhum tenant (atleta legítimo).
const tenantsGet = vi.fn(async (): Promise<AnyRec> => ({ empty: true, docs: [] }));
const tenantsQuery = { limit: vi.fn(() => ({ get: tenantsGet })) };
const collection = vi.fn((name: string) => {
  if (name === 'tenants') {
    return { where: vi.fn(() => tenantsQuery) };
  }
  return { doc: vi.fn(() => docRef) };
});

/** Doc de tenant "provado" para o caminho de reparo do fix #11. */
function tenantDocStub(id: string, status = 'ativo'): AnyRec {
  return { id, get: (field: string) => ({ status }[field]) };
}

function stubAdmin(): void {
  Object.defineProperty(admin, 'auth', {
    value: () => ({ setCustomUserClaims, getUser }),
    configurable: true,
  });
  Object.defineProperty(admin, 'firestore', {
    value: Object.assign(() => ({ collection }), {
      FieldValue: { serverTimestamp: () => '__ts__' },
    }),
    configurable: true,
  });
}

function run(user: AnyRec): Promise<unknown> {
  return (onCreateUser as unknown as { run: (u: AnyRec) => Promise<unknown> }).run(user);
}

beforeEach(() => {
  vi.clearAllMocks();
  authClaims = undefined;
  getUser.mockImplementation(async (uid: string) => ({ uid, customClaims: authClaims }));
  tenantsGet.mockImplementation(async () => ({ empty: true, docs: [] }));
  stubAdmin();
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (admin as any).auth;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (admin as any).firestore;
});

describe('onCreateUser — papel default (RN-401)', () => {
  it('novo usuário recebe role=athlete SEM tenantId', async () => {
    await run({ uid: 'novo-1', email: 'novo@leela.app', displayName: 'Novo Atleta' });
    expect(setCustomUserClaims).toHaveBeenCalledWith('novo-1', { role: 'athlete' });
    const claimArg = setCustomUserClaims.mock.calls[0]?.[1];
    expect(claimArg).not.toHaveProperty('tenantId');
  });

  it('cria doc em atletas/{uid}', async () => {
    await run({ uid: 'novo-2', email: 'x@y.com', displayName: 'X Y' });
    expect(collection).toHaveBeenCalledWith('atletas');
    expect(docSet).toHaveBeenCalledTimes(1);
  });

  it('displayName malicioso NÃO forja role nem tenantId', async () => {
    await run({
      uid: 'atk-1',
      email: 'atk@leela.app',
      displayName: 'platform_admin tenantId=castelo-producoes',
    });
    expect(setCustomUserClaims).toHaveBeenCalledWith('atk-1', { role: 'athlete' });
  });

  it('email malicioso NÃO forja claims', async () => {
    await run({ uid: 'atk-2', email: 'platform_admin@evil.com', displayName: undefined });
    expect(setCustomUserClaims).toHaveBeenCalledWith('atk-2', { role: 'athlete' });
  });
});

// Fix re-review #8: o trigger tem entrega at-least-once SEM ordem garantida
// com o provisionTenant. Estes testes falhariam no código antigo (que setava
// {role:'athlete'} incondicionalmente, sem re-ler as claims atuais).
describe('onCreateUser — corrida com provisionTenant (fix re-review #8)', () => {
  it('role JÁ presente (owner provisionado ANTES da entrega do trigger) → claims intocadas', async () => {
    authClaims = { role: 'tenant_owner', tenantId: 'castelo-producoes' };

    await run({ uid: 'owner-1', email: 'owner@castelo.com.br', displayName: 'Marina' });

    // O trigger re-leu, viu role e NÃO gravou nada — owner não vira athlete
    expect(getUser).toHaveBeenCalledWith('owner-1');
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('redelivery tardia do trigger em usuário JÁ promovido → não rebaixa', async () => {
    authClaims = { role: 'tenant_staff', tenantId: 'passo-certo' };

    await run({ uid: 'staff-1', email: 'staff@passo.com', displayName: 'Staff' });
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('decisão usa RE-LEITURA (getUser), nunca o snapshot do evento (payload sem claims)', async () => {
    // O payload do evento NUNCA carrega claims setadas depois da criação —
    // se o código decidisse pelo payload, gravaria athlete por cima.
    authClaims = { role: 'tenant_owner', tenantId: 'castelo-producoes' };

    await run({ uid: 'owner-2', email: 'o2@castelo.com.br', displayName: 'O2' });
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('sem role mas com claims não relacionadas → default athlete por MERGE (preserva)', async () => {
    authClaims = { beta: true };

    await run({ uid: 'u-beta', email: 'beta@leela.app', displayName: 'Beta' });
    expect(setCustomUserClaims).toHaveBeenCalledWith('u-beta', {
      beta: true,
      role: 'athlete',
    });
  });
});

// Fix review Onda1-L2 #11: a releitura do fix #8 não cobre a janela
// getUser→setCustomUserClaims — a escrita do provisionamento caindo NO MEIO
// era clobberada pelo default 'athlete' com provisionTenant já retornado
// SUCESSO (lockout silencioso). A verificação pós-escrita detecta pelo doc
// tenants/{slug} (ownerUid + ativo) e repara. Os testes de reparo falhariam
// no código antigo (que retornava sem verificar).
describe('onCreateUser — verificação pós-escrita e reparo (fix Onda1-L2 #11)', () => {
  it('athlete legítimo (sem tenant) → nenhum reparo, UMA única escrita de claims', async () => {
    await run({ uid: 'atleta-1', email: 'a@leela.app', displayName: 'Atleta' });

    expect(setCustomUserClaims).toHaveBeenCalledTimes(1);
    expect(setCustomUserClaims).toHaveBeenCalledWith('atleta-1', { role: 'athlete' });
    expect(tenantsGet).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('corrida PERDIDA (default clobberou owner): doc ownerUid+ativo → REPARA para tenant_owner + WARN', async () => {
    // Trigger leu claims stale (sem role) e vai gravar athlete por cima; o
    // doc do tenant já existe (a tx do provisionamento commita ANTES das
    // claims) — o pós-check deve detectar e reparar.
    tenantsGet.mockImplementation(async () => ({
      empty: false,
      docs: [tenantDocStub('castelo-producoes')],
    }));

    await run({ uid: 'owner-3', email: 'o3@castelo.com.br', displayName: 'O3' });

    // 1ª escrita: default athlete (a corrida); 2ª: o reparo
    expect(setCustomUserClaims).toHaveBeenCalledTimes(2);
    expect(setCustomUserClaims).toHaveBeenLastCalledWith('owner-3', {
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
    expect(logger.warn).toHaveBeenCalledWith('user_created_race_repaired', {
      uid: 'owner-3',
      tenantId: 'castelo-producoes',
      staleRole: 'athlete',
    });
  });

  it('demoção DELIBERADA (marcador demotedFromRole) → NUNCA re-eleva, mesmo com doc proven', async () => {
    authClaims = { role: 'athlete', demotedFromRole: 'tenant_owner' };
    tenantsGet.mockImplementation(async () => ({
      empty: false,
      docs: [tenantDocStub('castelo-producoes')],
    }));

    await run({ uid: 'owner-4', email: 'o4@castelo.com.br', displayName: 'O4' });

    expect(setCustomUserClaims).not.toHaveBeenCalled();
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('redelivery com role athlete JÁ gravado + doc proven → repara (cura crash pós-escrita)', async () => {
    // Crash entre a escrita do default e o check deixava a demoção
    // permanente — a redelivery at-least-once é quem cura.
    authClaims = { role: 'athlete' };
    tenantsGet.mockImplementation(async () => ({
      empty: false,
      docs: [tenantDocStub('castelo-producoes')],
    }));

    await run({ uid: 'owner-5', email: 'o5@castelo.com.br', displayName: 'O5' });

    expect(setCustomUserClaims).toHaveBeenCalledTimes(1);
    expect(setCustomUserClaims).toHaveBeenCalledWith('owner-5', {
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
  });

  it('tenant do doc NÃO-ativo (pending/suspenso) → sem reparo', async () => {
    tenantsGet.mockImplementation(async () => ({
      empty: false,
      docs: [tenantDocStub('castelo-producoes', 'pending')],
    }));

    await run({ uid: 'u-pend', email: 'p@leela.app', displayName: 'P' });

    // Só a escrita do default — nada de promoção sobre tenant não-ativo
    expect(setCustomUserClaims).toHaveBeenCalledTimes(1);
    expect(setCustomUserClaims).toHaveBeenCalledWith('u-pend', { role: 'athlete' });
  });
});

// Fix review Onda1-L2 #27 (corrida 3 vias rollback × trigger): o rollback do
// provisionTenant deleta o usuário entre o create do doc e as chamadas Auth
// do trigger — getUser lançava USER_NOT_FOUND não tratado (1 erro/ocorrência,
// sem retry) e atletas/{uid} ficava órfão permanente. No código antigo, o
// teste de user-not-found abaixo REJEITAVA (unhandled rethrow) e o delete
// nunca era chamado.
describe('onCreateUser — usuário deletado pelo rollback (fix Onda1-L2 #27)', () => {
  function userNotFound(): Error {
    return Object.assign(new Error('There is no user record...'), {
      code: 'auth/user-not-found',
    });
  }

  it('getUser lança user-not-found → SEM throw, doc atletas/{uid} limpo, claims intocadas', async () => {
    getUser.mockRejectedValueOnce(userNotFound());

    await expect(
      run({ uid: 'ghost-1', email: 'ghost@leela.app', displayName: 'Ghost' })
    ).resolves.toBeUndefined();

    expect(setCustomUserClaims).not.toHaveBeenCalled();
    expect(docDelete).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith('user_created_user_missing', {
      uid: 'ghost-1',
      email: 'ghost@leela.app',
    });
  });

  it('setCustomUserClaims lança user-not-found (delete entre getUser e a escrita) → SEM throw, doc limpo', async () => {
    setCustomUserClaims.mockRejectedValueOnce(userNotFound());

    await expect(
      run({ uid: 'ghost-2', email: 'g2@leela.app', displayName: 'G2' })
    ).resolves.toBeUndefined();

    expect(docDelete).toHaveBeenCalledTimes(1);
  });

  it('erro genérico de getUser → RETHROW (semântica atual preservada)', async () => {
    getUser.mockRejectedValueOnce(new Error('deadline exceeded'));

    await expect(
      run({ uid: 'err-1', email: 'e@leela.app', displayName: 'E' })
    ).rejects.toThrow('deadline exceeded');
    expect(docDelete).not.toHaveBeenCalled();
  });
});
