/**
 * platformRollups.integration.test.ts — LEELA-S1605-T2
 *
 * Integração REAL no Firestore Emulator: recomputePlatformRollupsCore.
 *
 * Cobre (RN-409/406):
 *   - agregação macro: gmvTotal, receitaLeelaTotal, tenantsAtivos e saúde
 *     por tenant computados de `tenants/*` + termos
 *   - RN-406: 2 tenants com taxas distintas (10,5% × 8%) → receita Leela de
 *     CADA um usa a SUA taxa (isolamento econômico)
 *   - tenant sem termos → receitaLeela 0 e platformFeePct null (sem fallback)
 *   - suspenso: aparece na saúde (critico) mas NÃO conta em tenantsAtivos
 *   - IDEMPOTÊNCIA: recomputar 2× sobre a mesma fonte → mesmo doc
 *   - autorização do callable: só platform_admin
 *
 * Pré-requisito: Firestore Emulator 8080 (via emulators:exec).
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import * as admin from 'firebase-admin';
import {
  recomputePlatformRollupsCore,
  recomputePlatformRollups,
} from '../platform/rollups';

const PROJECT_ID = 'demo-leela';
const ADMIN_UID = 'uid-platform-admin';

type AnyRec = Record<string, unknown>;

let db: admin.firestore.Firestore;

async function seedTenant(
  id: string,
  data: AnyRec,
  feePct?: number
): Promise<void> {
  await db.doc(`tenants/${id}`).set({
    id,
    nome: data['nome'] ?? id,
    slug: id,
    status: 'ativo',
    ownerUid: `uid-${id}`,
    tipo: 'produtor',
    gmvAcumulado: 0,
    eventosAtivos: 0,
    ...data,
  });
  if (feePct !== undefined) {
    await db.doc(`tenants/${id}/commercialTerms/current`).set({
      platformFeePct: feePct,
      installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
      anticipation: { disponivel: false },
      communityMonthlyEnabled: false,
      saasMonthlyFee: 0,
      versao: 1,
      atualizadoPor: ADMIN_UID,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

beforeAll(() => {
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] ??= 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
});

beforeEach(async () => {
  const collections = await db.listCollections();
  for (const col of collections) {
    const docs = await col.listDocuments();
    for (const ref of docs) {
      await db.recursiveDelete(ref);
    }
  }
});

describe('recomputePlatformRollupsCore — agregação macro (RN-409/406)', () => {
  it('2 tenants com taxas distintas → cada receita Leela usa a SUA taxa', async () => {
    await seedTenant('castelo-producoes', { nome: 'Castelo Produções', gmvAcumulado: 1000, eventosAtivos: 2 }, 10.5);
    await seedTenant('passo-certo', { nome: 'Passo Certo Eventos', gmvAcumulado: 1000, eventosAtivos: 1 }, 8);

    const res = await recomputePlatformRollupsCore(db);

    expect(res.gmvTotal).toBe(2000);
    // 10,5% de 1000 (105) + 8% de 1000 (80) — NÃO 2 × constante
    expect(res.receitaLeelaTotal).toBe(185);
    expect(res.tenantsAtivos).toBe(2);

    const rollups = await db.doc('platform/rollups').get();
    expect(rollups.exists).toBe(true);
    const tenants = rollups.get('tenants') as AnyRec;
    expect(tenants['castelo-producoes']).toMatchObject({
      gmv: 1000,
      receitaLeela: 105,
      platformFeePct: 10.5,
      health: 'saudavel',
    });
    expect(tenants['passo-certo']).toMatchObject({
      gmv: 1000,
      receitaLeela: 80,
      platformFeePct: 8,
      health: 'saudavel',
    });
  });

  it('tenant sem termos → receitaLeela 0 e platformFeePct null (sem fallback — RN-406)', async () => {
    await seedTenant('sem-termos', { status: 'pending', gmvAcumulado: 500 }); // sem fee

    const res = await recomputePlatformRollupsCore(db);

    expect(res.gmvTotal).toBe(500);
    expect(res.receitaLeelaTotal).toBe(0);
    expect(res.tenantsAtivos).toBe(0);

    const rollups = await db.doc('platform/rollups').get();
    expect((rollups.get('tenants') as AnyRec)['sem-termos']).toMatchObject({
      receitaLeela: 0,
      platformFeePct: null,
      health: 'atencao', // pending
    });
  });

  it('suspenso: entra na saúde como critico mas NÃO conta em tenantsAtivos', async () => {
    await seedTenant('castelo-producoes', { gmvAcumulado: 1500, eventosAtivos: 2 }, 10.5);
    await seedTenant('suspenso-x', { status: 'suspenso', gmvAcumulado: 300, eventosAtivos: 1 }, 10.5);

    const res = await recomputePlatformRollupsCore(db);

    expect(res.tenantsAtivos).toBe(1);
    expect(res.gmvTotal).toBe(1800); // GMV histórico preservado no macro

    const rollups = await db.doc('platform/rollups').get();
    expect((rollups.get('tenants') as AnyRec)['suspenso-x']).toMatchObject({
      status: 'suspenso',
      health: 'critico',
    });
  });

  it('IDEMPOTENTE: recomputar 2× sobre a mesma fonte produz o mesmo doc', async () => {
    await seedTenant('castelo-producoes', { gmvAcumulado: 1000, eventosAtivos: 2 }, 10.5);
    await seedTenant('passo-certo', { gmvAcumulado: 750.5, eventosAtivos: 0 }, 8);

    const r1 = await recomputePlatformRollupsCore(db);
    const snap1 = (await db.doc('platform/rollups').get()).data() as AnyRec;

    const r2 = await recomputePlatformRollupsCore(db);
    const snap2 = (await db.doc('platform/rollups').get()).data() as AnyRec;

    expect(r2).toEqual(r1);
    // Tudo idêntico exceto o carimbo de atualização
    delete snap1['atualizadoEm'];
    delete snap2['atualizadoEm'];
    expect(snap2).toEqual(snap1);
  });

  it('plataforma vazia → rollup zerado (sem erro)', async () => {
    const res = await recomputePlatformRollupsCore(db);
    expect(res).toEqual({
      gmvTotal: 0,
      receitaLeelaTotal: 0,
      tenantsAtivos: 0,
      tenantsTotal: 0,
    });
  });
});

describe('recomputePlatformRollups (callable) — autorização (RN-409)', () => {
  function runCallable(ctx: AnyRec): Promise<unknown> {
    return (
      recomputePlatformRollups as unknown as {
        run: (d: AnyRec, c: AnyRec) => Promise<unknown>;
      }
    ).run({}, ctx);
  }

  it('não autenticado → unauthenticated', async () => {
    await expect(runCallable({})).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('tenant_owner → permission-denied', async () => {
    await expect(
      runCallable({
        auth: { uid: 'x', token: { role: 'tenant_owner', tenantId: 'castelo-producoes' } },
      })
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('platform_admin → recomputa e devolve números', async () => {
    await seedTenant('castelo-producoes', { gmvAcumulado: 1000, eventosAtivos: 1 }, 10.5);
    const res = (await runCallable({
      auth: { uid: ADMIN_UID, token: { role: 'platform_admin' } },
    })) as AnyRec;
    expect(res).toMatchObject({
      success: true,
      gmvTotal: 1000,
      receitaLeelaTotal: 105,
      tenantsAtivos: 1,
    });
  });
});
