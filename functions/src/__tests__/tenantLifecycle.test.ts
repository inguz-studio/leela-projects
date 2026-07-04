/**
 * tenantLifecycle.test.ts — Function transitionTenant (F7 — review S1600).
 *
 * Prova que canTransition é finalmente chamada num write path (RN-402):
 *   - caller não-admin → permission-denied
 *   - tenant inexistente → not-found
 *   - transição inválida (pending→suspenso) → failed-precondition
 *   - transição válida (ativo→suspenso) → aplica status
 *
 * admin.firestore().runTransaction stubbado (sem emulator).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as admin from 'firebase-admin';
import { transitionTenant } from '../platform/tenantLifecycle';

type AnyRec = Record<string, unknown>;

const txUpdate = vi.fn();
const txSet = vi.fn();
let currentStatus = 'ativo';
let docExists = true;

const txGet = vi.fn(async () => ({
  exists: docExists,
  get: (_field: string) => currentStatus,
}));

const runTransaction = vi.fn(
  async (fn: (tx: AnyRec) => Promise<unknown>) => {
    return fn({ get: txGet, update: txUpdate, set: txSet });
  }
);

// Ref do tenant precisa expor .collection('lifecycleAudit').doc() — trilha
// de auditoria da S1601-T2 é gravada na mesma transação.
const tenantRef = {
  collection: () => ({ doc: () => ({ __audit: true }) }),
};

function stubFirestore(): void {
  Object.defineProperty(admin, 'firestore', {
    value: Object.assign(
      () => ({
        collection: () => ({ doc: () => tenantRef }),
        runTransaction,
      }),
      { FieldValue: { serverTimestamp: () => '__ts__' } }
    ),
    configurable: true,
  });
}

const adminCtx = { auth: { uid: 'admin-1', token: { role: 'platform_admin' } } };

function run(data: AnyRec, ctx: AnyRec = adminCtx): Promise<unknown> {
  return (transitionTenant as unknown as { run: (d: AnyRec, c: AnyRec) => Promise<unknown> }).run(
    data,
    ctx
  );
}

beforeEach(() => {
  txUpdate.mockClear();
  txSet.mockClear();
  txGet.mockClear();
  runTransaction.mockClear();
  currentStatus = 'ativo';
  docExists = true;
  stubFirestore();
});

afterEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (admin as any).firestore;
});

describe('transitionTenant — autorização e validação (RN-402)', () => {
  it('nega caller não-admin', async () => {
    await expect(
      run({ tenantId: 'castelo-producoes', to: 'suspenso' }, { auth: { uid: 'x', token: { role: 'tenant_owner' } } })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('status de destino inválido → invalid-argument', async () => {
    await expect(run({ tenantId: 'castelo-producoes', to: 'zumbi' })).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('tenant inexistente → not-found', async () => {
    docExists = false;
    await expect(run({ tenantId: 'ghost', to: 'suspenso' })).rejects.toMatchObject({
      code: 'not-found',
    });
  });

  it('transição inválida pending→suspenso → failed-precondition', async () => {
    currentStatus = 'pending';
    await expect(run({ tenantId: 'passo-certo', to: 'suspenso' })).rejects.toMatchObject({
      code: 'failed-precondition',
    });
    expect(txUpdate).not.toHaveBeenCalled();
  });

  it('transição válida ativo→suspenso → aplica status + auditoria (quem/quando)', async () => {
    currentStatus = 'ativo';
    const res = (await run({ tenantId: 'castelo-producoes', to: 'suspenso' })) as AnyRec;
    expect(res).toMatchObject({ success: true, status: 'suspenso' });
    expect(txUpdate).toHaveBeenCalledWith(expect.anything(), {
      status: 'suspenso',
      atualizadoEm: '__ts__',
      atualizadoPor: 'admin-1',
    });
    // Trilha lifecycleAudit gravada na MESMA transação (S1601-T2)
    expect(txSet).toHaveBeenCalledWith(expect.anything(), {
      from: 'ativo',
      to: 'suspenso',
      por: 'admin-1',
      em: '__ts__',
    });
  });

  it('transição válida pending→ativo → aplica status', async () => {
    currentStatus = 'pending';
    const res = (await run({ tenantId: 'passo-certo', to: 'ativo' })) as AnyRec;
    expect(res).toMatchObject({ success: true, status: 'ativo' });
  });
});
