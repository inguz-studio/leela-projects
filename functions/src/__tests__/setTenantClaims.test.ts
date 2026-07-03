/**
 * setTenantClaims.test.ts — integração da Function de claims (F2 — review S1600).
 *
 * Cobre RN-401/RN-403 no write path de claims:
 *   - caller não-admin → permission-denied
 *   - role fora do enum → invalid-argument
 *   - tenantId ausente para tenant_owner → invalid-argument
 *   - tenantId presente para athlete/platform_admin → invalid-argument
 *   - usuário-alvo inexistente → not-found
 *   - caminho feliz: grava claims + revoga refresh tokens
 *
 * admin.auth() é stubbado (sem Auth Emulator): valida a LÓGICA de autorização
 * e validação da Function, não o SDK. A propagação de token é lado do cliente.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as admin from 'firebase-admin';
import { setTenantClaims } from '../platform/setTenantClaims';

type AnyRec = Record<string, unknown>;

const setCustomUserClaims = vi.fn(async () => undefined);
const revokeRefreshTokens = vi.fn(async () => undefined);
const getUser = vi.fn(async (_uid: string) => ({ uid: _uid }));

function stubAdminAuth(): void {
  Object.defineProperty(admin, 'auth', {
    value: () => ({ setCustomUserClaims, revokeRefreshTokens, getUser }),
    configurable: true,
  });
}

const adminCtx = { auth: { uid: 'admin-1', token: { role: 'platform_admin' } } };

function run(data: AnyRec, ctx: AnyRec = adminCtx): Promise<unknown> {
  return (setTenantClaims as unknown as { run: (d: AnyRec, c: AnyRec) => Promise<unknown> }).run(
    data,
    ctx
  );
}

beforeEach(() => {
  setCustomUserClaims.mockClear();
  revokeRefreshTokens.mockClear();
  getUser.mockClear();
  getUser.mockImplementation(async (uid: string) => ({ uid }));
  stubAdminAuth();
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (admin as any).auth;
});

describe('setTenantClaims — autorização (RN-401)', () => {
  it('nega caller não autenticado', async () => {
    await expect(run({ uid: 'u1', role: 'athlete' }, {})).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('nega caller não-admin', async () => {
    await expect(
      run({ uid: 'u1', role: 'athlete' }, { auth: { uid: 'x', token: { role: 'tenant_owner' } } })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });
});

describe('setTenantClaims — validação de input', () => {
  it('role fora do enum → invalid-argument', async () => {
    await expect(run({ uid: 'u1', role: 'super_hacker' })).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('tenant_owner sem tenantId → invalid-argument', async () => {
    await expect(run({ uid: 'u1', role: 'tenant_owner' })).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('athlete COM tenantId → invalid-argument', async () => {
    await expect(
      run({ uid: 'u1', role: 'athlete', tenantId: 'castelo-producoes' })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('platform_admin COM tenantId → invalid-argument', async () => {
    await expect(
      run({ uid: 'u1', role: 'platform_admin', tenantId: 'x' })
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('uid ausente → invalid-argument', async () => {
    await expect(run({ role: 'athlete' })).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });
});

describe('setTenantClaims — alvo e caminho feliz', () => {
  it('usuário-alvo inexistente → not-found', async () => {
    getUser.mockImplementationOnce(async () => {
      throw new Error('no user');
    });
    await expect(run({ uid: 'ghost', role: 'athlete' })).rejects.toMatchObject({
      code: 'not-found',
    });
  });

  it('tenant_owner válido → grava claims + revoga tokens', async () => {
    const res = (await run({
      uid: 'u-owner',
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    })) as AnyRec;

    expect(res).toMatchObject({
      success: true,
      uid: 'u-owner',
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
    expect(setCustomUserClaims).toHaveBeenCalledWith('u-owner', {
      role: 'tenant_owner',
      tenantId: 'castelo-producoes',
    });
    expect(revokeRefreshTokens).toHaveBeenCalledWith('u-owner');
  });

  it('athlete válido (sem tenantId) → grava só role', async () => {
    await run({ uid: 'u-ath', role: 'athlete' });
    expect(setCustomUserClaims).toHaveBeenCalledWith('u-ath', { role: 'athlete' });
  });
});
