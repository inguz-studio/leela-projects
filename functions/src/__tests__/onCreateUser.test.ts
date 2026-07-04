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
 * admin.auth()/admin.firestore() stubbados (sem emulator): valida a LÓGICA.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as admin from 'firebase-admin';
import { onCreateUser } from '../auth/onCreateUser';

type AnyRec = Record<string, unknown>;

const setCustomUserClaims = vi.fn(async (_uid: string, _claims: AnyRec) => undefined);
// Fix #8: o trigger re-lê as claims atuais via getUser antes de decidir.
// Default: usuário recém-criado sem claims (comportamento pré-corrida).
const getUser = vi.fn(async (uid: string): Promise<AnyRec> => ({ uid, customClaims: undefined }));
// M5 (review E00): onCreateUser passou de set() a create() retry-safe — o stub
// expoe ambos apontando ao MESMO spy para nao alterar as assercoes originais.
const docSet = vi.fn(async () => undefined);
const docRef = { set: docSet, create: docSet };
const collection = vi.fn(() => ({ doc: vi.fn(() => docRef) }));

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
  setCustomUserClaims.mockClear();
  getUser.mockClear();
  getUser.mockImplementation(async (uid: string) => ({ uid, customClaims: undefined }));
  docSet.mockClear();
  collection.mockClear();
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
    getUser.mockImplementationOnce(async (uid: string) => ({
      uid,
      customClaims: { role: 'tenant_owner', tenantId: 'castelo-producoes' },
    }));

    await run({ uid: 'owner-1', email: 'owner@castelo.com.br', displayName: 'Marina' });

    // O trigger re-leu, viu role e NÃO gravou nada — owner não vira athlete
    expect(getUser).toHaveBeenCalledWith('owner-1');
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('redelivery tardia do trigger em usuário JÁ promovido → não rebaixa', async () => {
    getUser.mockImplementationOnce(async (uid: string) => ({
      uid,
      customClaims: { role: 'tenant_staff', tenantId: 'passo-certo' },
    }));

    await run({ uid: 'staff-1', email: 'staff@passo.com', displayName: 'Staff' });
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('decisão usa RE-LEITURA (getUser), nunca o snapshot do evento (payload sem claims)', async () => {
    // O payload do evento NUNCA carrega claims setadas depois da criação —
    // se o código decidisse pelo payload, gravaria athlete por cima.
    getUser.mockImplementationOnce(async (uid: string) => ({
      uid,
      customClaims: { role: 'tenant_owner', tenantId: 'castelo-producoes' },
    }));

    await run({ uid: 'owner-2', email: 'o2@castelo.com.br', displayName: 'O2' });
    expect(setCustomUserClaims).not.toHaveBeenCalled();
  });

  it('sem role mas com claims não relacionadas → default athlete por MERGE (preserva)', async () => {
    getUser.mockImplementationOnce(async (uid: string) => ({
      uid,
      customClaims: { beta: true },
    }));

    await run({ uid: 'u-beta', email: 'beta@leela.app', displayName: 'Beta' });
    expect(setCustomUserClaims).toHaveBeenCalledWith('u-beta', {
      beta: true,
      role: 'athlete',
    });
  });
});
