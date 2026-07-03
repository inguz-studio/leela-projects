/**
 * onCreateUser.test.ts — trigger de criação de usuário (F2 — review S1600).
 *
 * Cobre RN-401 (papel vem do servidor, cliente nunca forja):
 *   - novo usuário recebe claim role='athlete', SEM tenantId
 *   - cria doc atletas/{uid}
 *   - displayName/email NÃO conseguem forjar role nem tenantId
 *
 * admin.auth()/admin.firestore() stubbados (sem emulator): valida a LÓGICA.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as admin from 'firebase-admin';
import { onCreateUser } from '../auth/onCreateUser';

type AnyRec = Record<string, unknown>;

const setCustomUserClaims = vi.fn(async (_uid: string, _claims: AnyRec) => undefined);
const docSet = vi.fn(async () => undefined);
const docRef = { set: docSet };
const collection = vi.fn(() => ({ doc: vi.fn(() => docRef) }));

function stubAdmin(): void {
  Object.defineProperty(admin, 'auth', {
    value: () => ({ setCustomUserClaims }),
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
