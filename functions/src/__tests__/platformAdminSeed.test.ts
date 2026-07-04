/**
 * platformAdminSeed.test.ts — bootstrap do platform_admin (decisão #4 Onda 1).
 *
 * Cobre:
 *   - Guard anti-produção: sem FIREBASE_AUTH_EMULATOR_HOST e sem projectId
 *     demo-* → lança (NUNCA roda contra prod).
 *   - Bootstrap real no Auth Emulator: cria usuário + claim platform_admin.
 *   - Idempotência: rerun reaproveita o mesmo uid e mantém a claim.
 *   - platform_admin NÃO carrega tenantId (papel cross-tenant, RN-401).
 *
 * Pré-requisito: Auth Emulator (via emulators:exec — env já setada).
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import * as admin from 'firebase-admin';
import {
  assertAuthEmulatorOnly,
  seedPlatformAdmin,
  DEFAULT_PLATFORM_ADMIN_EMAIL,
} from '../seed/platformAdmin.seed';

const PROJECT_ID = 'demo-leela';

beforeAll(() => {
  if (!admin.apps.length) {
    admin.initializeApp({ projectId: PROJECT_ID });
  }
});

describe('assertAuthEmulatorOnly — guard anti-produção', () => {
  const saved: Record<string, string | undefined> = {};
  const KEYS = [
    'FIREBASE_AUTH_EMULATOR_HOST',
    'GCLOUD_PROJECT',
    'GOOGLE_CLOUD_PROJECT',
  ] as const;

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  function clearEnv(): void {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  }

  it('bloqueia quando não há emulator nem projectId demo-*', () => {
    clearEnv();
    process.env['GCLOUD_PROJECT'] = 'leela-prod';
    expect(() => assertAuthEmulatorOnly()).toThrow(/BLOQUEADO/);
  });

  it('permite com FIREBASE_AUTH_EMULATOR_HOST setado', () => {
    clearEnv();
    process.env['FIREBASE_AUTH_EMULATOR_HOST'] = 'localhost:9099';
    expect(() => assertAuthEmulatorOnly()).not.toThrow();
  });

  it('permite com projectId demo-* mesmo sem env de emulator', () => {
    clearEnv();
    process.env['GCLOUD_PROJECT'] = 'demo-leela';
    expect(() => assertAuthEmulatorOnly()).not.toThrow();
  });
});

describe('seedPlatformAdmin — bootstrap no Auth Emulator', () => {
  it('cria o usuário com claim platform_admin (sem tenantId)', async () => {
    const uid = await seedPlatformAdmin(admin.auth());

    const user = await admin.auth().getUser(uid);
    expect(user.email).toBe(DEFAULT_PLATFORM_ADMIN_EMAIL);
    expect(user.customClaims).toMatchObject({ role: 'platform_admin' });
    // Cross-tenant: claim NUNCA carrega tenantId (RN-401)
    expect(user.customClaims).not.toHaveProperty('tenantId');
  });

  it('é idempotente: rerun devolve o mesmo uid e preserva a claim', async () => {
    const uid1 = await seedPlatformAdmin(admin.auth());
    const uid2 = await seedPlatformAdmin(admin.auth());
    expect(uid2).toBe(uid1);

    const user = await admin.auth().getUser(uid2);
    expect(user.customClaims).toMatchObject({ role: 'platform_admin' });
  });

  it('aceita e-mail custom via parâmetro', async () => {
    const uid = await seedPlatformAdmin(admin.auth(), 'vitor@demo-leela.dev');
    const user = await admin.auth().getUser(uid);
    expect(user.email).toBe('vitor@demo-leela.dev');
    expect(user.customClaims).toMatchObject({ role: 'platform_admin' });
  });
});
