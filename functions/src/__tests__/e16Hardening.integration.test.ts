/**
 * e16Hardening.integration.test.ts — FIX-E16 (achado #32, eixo Emulator)
 *
 * Fecha o eixo "falha do CLEAR de claims no ramo ownerCreated" do rollback
 * compensatório do provisionTenant — nunca provado com injeção de falha.
 *
 * O contrato (fix re-review R1): quando o owner foi CRIADO neste run
 * (ownerCreated), o rollback neutraliza as claims com
 * auth.setCustomUserClaims(uid, null) ANTES de apagar os docs. Se esse clear
 * LANÇA, o hardening manda LOGAR (provision_tenant_rollback_claims_clear_failed)
 * e SEGUIR o rollback — nunca aborta no meio deixando docs/conta órfãos.
 *
 * Este teste injeta a falha do clear (Proxy sobre o auth real: só o clear com
 * `null` lança) e prova que o rollback continua até o fim: docs do tenant/
 * profissional/termos somem E a conta Auth criada é deletada.
 *
 * Não assere o code do erro rejeitado (só rejects.toThrow) — outro agente E16
 * pode padronizá-lo; o que importa aqui é o estado do mundo pós-rollback.
 *
 * Emulator: Firestore (8080) + Auth (9099) via emulators:exec.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';
import { provisionTenantCore, type ProvisionDeps } from '../platform/provisionTenant';
import type { ProvisionInput } from '@leela/core';

const PROJECT_ID = 'demo-leela';
const ADMIN_UID = 'uid-platform-admin';

let db: admin.firestore.Firestore;
let auth: admin.auth.Auth;

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

describe('provisionTenantCore — rollback: clear de claims falha no ramo ownerCreated (achado #32)', () => {
  // deps.setClaims que LANÇA → dispara o rollback compensatório.
  const failingSetClaims: ProvisionDeps = {
    setClaims: async () => {
      throw new Error('setClaims indisponível (falha injetada — dispara rollback)');
    },
  };

  it('clear de claims LANÇA → hardening loga e SEGUE: docs somem + conta Auth criada é deletada', async () => {
    let nullClearAttempted = false;

    // Proxy sobre o auth REAL: setCustomUserClaims(uid, null) LANÇA — mas SÓ
    // quando claims === null (o clear do ramo ownerCreated), para não
    // interferir em nenhum outro set. Demais métodos (createUser,
    // getUserByEmail, deleteUser) passam direto ao auth real.
    const authClearFails = new Proxy(auth, {
      get(target, prop, receiver) {
        if (prop === 'setCustomUserClaims') {
          return (uid: string, claims: object | null): Promise<void> => {
            if (claims === null) {
              nullClearAttempted = true;
              return Promise.reject(
                new Error('clear de claims caiu no rollback (falha injetada)')
              );
            }
            return target.setCustomUserClaims(uid, claims);
          };
        }
        const value = Reflect.get(target, prop, receiver) as unknown;
        return typeof value === 'function'
          ? (value as (...args: unknown[]) => unknown).bind(target)
          : value;
      },
    }) as admin.auth.Auth;

    // Owner NOVO (e-mail inexistente após clearAll) → ownerCreated = true.
    await expect(
      provisionTenantCore(db, authClearFails, input(), ADMIN_UID, failingSetClaims)
    ).rejects.toThrow();

    // O clear com `null` foi de fato tentado e falhou — prova que o eixo do
    // achado (ramo ownerCreated) foi exercido, não um caminho lateral.
    expect(nullClearAttempted).toBe(true);

    // O rollback CONTINUOU além da falha do clear: nenhum doc sobrevive…
    expect((await db.doc('tenants/castelo-producoes').get()).exists).toBe(false);
    expect(
      (await db.doc('tenants/castelo-producoes/commercialTerms/current').get()).exists
    ).toBe(false);
    expect(
      (await db.doc('tenants/castelo-producoes/commercialTerms/v1').get()).exists
    ).toBe(false);
    expect((await db.collection('profissionais').get()).size).toBe(0);

    // …e a conta Auth criada neste run foi deletada (o rollback chegou ao fim).
    await expect(auth.getUserByEmail('marina@castelo.com.br')).rejects.toThrow();
  });
});
