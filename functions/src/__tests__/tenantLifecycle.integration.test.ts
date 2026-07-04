/**
 * tenantLifecycle.integration.test.ts — LEELA-S1601-T2
 *
 * Integração REAL no Firestore Emulator (sem stub): transitionTenant.
 *
 * Cobre (RN-402/401):
 *   - ativo → suspenso → ativo (ciclo completo de suspensão/reativação)
 *   - pending → ativo (aprovação)
 *   - transição inválida (pending → suspenso) rejeitada E status intacto
 *   - suspensão PRESERVA dados de domínio (eventos/termos continuam lá)
 *   - auditoria: atualizadoPor no doc + trilha lifecycleAudit (from/to/por)
 *   - tenant inexistente → not-found
 *
 * Complementa tenantLifecycle.test.ts (unit com stub — validação/authz).
 * Pré-requisito: Firestore Emulator 8080 (via emulators:exec).
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';
import { transitionTenant } from '../platform/tenantLifecycle';

const PROJECT_ID = 'demo-leela';
const ADMIN_UID = 'uid-platform-admin';
const TENANT_ID = 'castelo-producoes';

type AnyRec = Record<string, unknown>;

let db: admin.firestore.Firestore;

const adminCtx = { auth: { uid: ADMIN_UID, token: { role: 'platform_admin' } } };

function run(data: AnyRec, ctx: AnyRec = adminCtx): Promise<unknown> {
  return (
    transitionTenant as unknown as {
      run: (d: AnyRec, c: AnyRec) => Promise<unknown>;
    }
  ).run(data, ctx);
}

async function seedTenant(status: string): Promise<void> {
  await db.recursiveDelete(db.doc(`tenants/${TENANT_ID}`));
  await db.doc(`tenants/${TENANT_ID}`).set({
    id: TENANT_ID,
    nome: 'Castelo Produções',
    slug: TENANT_ID,
    status,
    ownerUid: 'uid-marina-castelo',
    tipo: 'produtor',
    gmvAcumulado: 1500,
    eventosAtivos: 2,
  });
  // Dados de domínio que DEVEM sobreviver à suspensão (RN-402)
  await db.doc('eventos/evento-castelo-1').set({
    id: 'evento-castelo-1',
    tenantId: TENANT_ID,
    nome: 'Corrida Castelo 2026',
    status: 'publicado',
  });
  await db.doc(`tenants/${TENANT_ID}/commercialTerms/current`).set({
    platformFeePct: 10.5,
    versao: 1,
  });
}

beforeAll(() => {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
});

beforeEach(async () => {
  await seedTenant('ativo');
});

describe('transitionTenant — transições reais no Emulator (RN-402)', () => {
  it('ativo → suspenso: status muda e NENHUM dado de domínio é apagado', async () => {
    const res = (await run({ tenantId: TENANT_ID, to: 'suspenso' })) as AnyRec;
    expect(res).toMatchObject({ success: true, status: 'suspenso' });

    const tenant = await db.doc(`tenants/${TENANT_ID}`).get();
    expect(tenant.get('status')).toBe('suspenso');

    // Preservação (RN-402): evento, termos e ∑ de saúde intactos
    expect((await db.doc('eventos/evento-castelo-1').get()).exists).toBe(true);
    expect(
      (await db.doc(`tenants/${TENANT_ID}/commercialTerms/current`).get()).exists
    ).toBe(true);
    expect(tenant.get('gmvAcumulado')).toBe(1500);
    expect(tenant.get('eventosAtivos')).toBe(2);
  });

  it('suspenso → ativo (reativação) completa o ciclo', async () => {
    await run({ tenantId: TENANT_ID, to: 'suspenso' });
    const res = (await run({ tenantId: TENANT_ID, to: 'ativo' })) as AnyRec;
    expect(res).toMatchObject({ success: true, status: 'ativo' });

    const tenant = await db.doc(`tenants/${TENANT_ID}`).get();
    expect(tenant.get('status')).toBe('ativo');
  });

  it('pending → ativo (aprovação) é aceita', async () => {
    await seedTenant('pending');
    const res = (await run({ tenantId: TENANT_ID, to: 'ativo' })) as AnyRec;
    expect(res).toMatchObject({ success: true, status: 'ativo' });
  });

  it('pending → suspenso é rejeitada E o status permanece pending', async () => {
    await seedTenant('pending');
    await expect(run({ tenantId: TENANT_ID, to: 'suspenso' })).rejects.toMatchObject({
      code: 'failed-precondition',
    });
    const tenant = await db.doc(`tenants/${TENANT_ID}`).get();
    expect(tenant.get('status')).toBe('pending');
  });

  it('ativo → ativo (transição nula) é rejeitada', async () => {
    await expect(run({ tenantId: TENANT_ID, to: 'ativo' })).rejects.toMatchObject({
      code: 'failed-precondition',
    });
  });

  it('tenant inexistente → not-found', async () => {
    await expect(run({ tenantId: 'fantasma', to: 'suspenso' })).rejects.toMatchObject({
      code: 'not-found',
    });
  });
});

describe('transitionTenant — auditoria mínima (quem/quando)', () => {
  it('grava atualizadoPor no doc do tenant', async () => {
    await run({ tenantId: TENANT_ID, to: 'suspenso' });
    const tenant = await db.doc(`tenants/${TENANT_ID}`).get();
    expect(tenant.get('atualizadoPor')).toBe(ADMIN_UID);
    expect(tenant.get('atualizadoEm')).toBeTruthy();
  });

  it('acumula trilha em lifecycleAudit (from/to/por) por transição', async () => {
    await run({ tenantId: TENANT_ID, to: 'suspenso' });
    await run({ tenantId: TENANT_ID, to: 'ativo' });

    const audit = await db
      .collection(`tenants/${TENANT_ID}/lifecycleAudit`)
      .orderBy('em', 'asc')
      .get();
    expect(audit.size).toBe(2);

    const entries = audit.docs.map((d) => d.data());
    expect(entries[0]).toMatchObject({ from: 'ativo', to: 'suspenso', por: ADMIN_UID });
    expect(entries[1]).toMatchObject({ from: 'suspenso', to: 'ativo', por: ADMIN_UID });
    expect(entries[0]?.['em']).toBeTruthy();
  });

  it('transição rejeitada NÃO gera entrada de auditoria', async () => {
    await seedTenant('pending');
    await expect(run({ tenantId: TENANT_ID, to: 'suspenso' })).rejects.toBeTruthy();
    const audit = await db.collection(`tenants/${TENANT_ID}/lifecycleAudit`).get();
    expect(audit.size).toBe(0);
  });
});
