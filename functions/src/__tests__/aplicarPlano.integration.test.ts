/**
 * aplicarPlano.integration.test.ts — LEELA-T2-L4 · CB-T2 (decisão #15)
 *
 * Integração (Firestore Emulator, Admin SDK — padrão callables v1): chama
 * aplicarPlanoCore direto com caller forjado.
 *
 * Aceites do brief (todos):
 *   - aplicar plano ≠ Padrão ⇒ current reflete taxaPorMetodo/tabela/saas
 *     COM bump de versão (versão nova > anterior; snapshot anterior
 *     arquivado — mesma asserção de versionamento de S1602);
 *   - EDITAR o plano DEPOIS de aplicado ⇒ current NÃO muda (sem vínculo
 *     vivo); só muda ao REAPLICAR;
 *   - REAPLICAR o mesmo plano com valores idênticos ⇒ NO-OP (sem bump);
 *   - edição fina campo-a-campo (S1602-T2) DEPOIS de aplicar ⇒ funciona,
 *     sobrescreve só o campo tocado e gera novo snapshot;
 *   - tenant_owner chamando aplicarPlano ⇒ NEGADO; tenant_owner escrevendo
 *     commercialTerms/current direto ⇒ negado (RN-404, Rule vigente).
 * Antagonistas extra: dupla aplicação concorrente-sequencial não infla
 * versão; cross-tenant (aplicar em A não toca B); plano inexistente;
 * tenant sem termo.
 */
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { doc, setDoc } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import type { AuthClaims } from '@leela/core';
import { aplicarPlanoCore } from '../platform/aplicarPlano';
import { seedPlanosCobranca } from '../seed/planosCobranca.seed';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

const AGORA = new Date('2026-07-13T12:00:00Z');
const ADMIN_UID = 'uid-platform-admin';
const MARINA_UID = 'uid-marina-castelo';
const TENANT_A = 'castelo-producoes';
const TENANT_B = 'passo-certo';

const ADMIN_CALLER = {
  uid: ADMIN_UID,
  claims: { role: 'platform_admin' } as unknown as AuthClaims,
};
const OWNER_CALLER = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: TENANT_A } as unknown as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

function termsV1() {
  return {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao: 1,
    atualizadoPor: ADMIN_UID,
    atualizadoEm: new Date(),
  };
}

function tabela(taxa: number): Record<string, number> {
  const t: Record<string, number> = {};
  for (let p = 2; p <= 12; p++) t[String(p)] = taxa;
  return t;
}

const PROMO = {
  id: 'promo-agressivo',
  nome: 'Promo Agressivo',
  tabelaTaxasParcela: tabela(1.25),
  taxaPix: 5,
  taxaCartaoAVista: 7.5,
  saasMonthlyFee: 149.9,
};

describe.skipIf(!hasEmulator)('aplicarPlano — estampa versionada sem vínculo vivo (CB-T2)', () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf8'),
        host: 'localhost',
        port: 8080,
      },
    });
    if (!admin.apps.length) {
      process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
      admin.initializeApp({ projectId: PROJECT_ID });
    }
    adminDb = admin.firestore();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
    const batch = adminDb.batch();
    for (const [tenant, owner] of [[TENANT_A, MARINA_UID], [TENANT_B, 'uid-passo-owner']] as const) {
      batch.set(adminDb.collection('tenants').doc(tenant), {
        id: tenant, nome: tenant, slug: tenant, status: 'ativo',
        ownerUid: owner, tipo: 'produtor',
      });
      batch.set(
        adminDb.collection('tenants').doc(tenant).collection('commercialTerms').doc('current'),
        termsV1()
      );
      batch.set(
        adminDb.collection('tenants').doc(tenant).collection('commercialTerms').doc('v1'),
        termsV1()
      );
    }
    batch.set(adminDb.collection('planosCobranca').doc(PROMO.id), {
      ...PROMO, criadoEm: new Date(), atualizadoEm: new Date(),
    });
    await batch.commit();
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  function termsRef(tenant: string, docId = 'current') {
    return adminDb.collection('tenants').doc(tenant)
      .collection('commercialTerms').doc(docId);
  }

  function aplicar(tenantId: string, planoId: string, caller = ADMIN_CALLER) {
    return aplicarPlanoCore(adminDb, { tenantId, planoId }, caller, AGORA);
  }

  it('aplicar plano ≠ Padrão ⇒ current reflete o plano COM bump; anterior arquivado', async () => {
    const r = await aplicar(TENANT_A, PROMO.id);
    expect(r.replay).toBe(false);
    expect(r.versao).toBe(2); // bump 1→2

    const current = (await termsRef(TENANT_A).get()).data()!;
    expect(current['versao']).toBe(2);
    expect(current['taxaPorMetodo']).toEqual({ credit_card: 7.5, pix: 5 });
    expect(current['tabelaTaxasParcela']).toEqual(tabela(1.25));
    expect(current['saasMonthlyFee']).toBe(149.9);
    expect(current['planoAplicadoId']).toBe(PROMO.id);
    // campos legados preservados (aplicar não zera o resto do termo)
    expect(current['platformFeePct']).toBe(10.5);

    // snapshot v2 criado; v1 (anterior) segue arquivado — asserção S1602
    expect((await termsRef(TENANT_A, 'v2').get()).exists).toBe(true);
    const v1 = (await termsRef(TENANT_A, 'v1').get()).data()!;
    expect(v1['versao']).toBe(1);
    expect(v1['taxaPorMetodo']).toBeUndefined(); // histórico intacto
  });

  it('EDITAR o plano depois NÃO retroage (sem vínculo vivo); só reaplicar re-estampa', async () => {
    await aplicar(TENANT_A, PROMO.id);
    const antes = (await termsRef(TENANT_A).get()).data()!;

    // admin edita o plano DEPOIS da aplicação
    await adminDb.collection('planosCobranca').doc(PROMO.id).update({
      taxaPix: 3, taxaCartaoAVista: 4,
    });

    const depois = (await termsRef(TENANT_A).get()).data()!;
    expect(depois).toEqual(antes); // tenant intocado — cópia, não assinatura

    // reaplicar ⇒ agora sim re-estampa (novo bump)
    const r = await aplicar(TENANT_A, PROMO.id);
    expect(r.replay).toBe(false);
    expect(r.versao).toBe(3);
    const reaplicado = (await termsRef(TENANT_A).get()).data()!;
    expect(reaplicado['taxaPorMetodo']).toEqual({ credit_card: 4, pix: 3 });
  });

  it('REAPLICAR o mesmo plano com valores idênticos ⇒ NO-OP (sem novo bump)', async () => {
    const primeira = await aplicar(TENANT_A, PROMO.id);
    expect(primeira.versao).toBe(2);

    const segunda = await aplicar(TENANT_A, PROMO.id); // dupla aplicação
    expect(segunda.replay).toBe(true);
    expect(segunda.versao).toBe(2); // versão NÃO anda

    const current = (await termsRef(TENANT_A).get()).data()!;
    expect(current['versao']).toBe(2);
    expect((await termsRef(TENANT_A, 'v3').get()).exists).toBe(false); // sem v3
  });

  it('edição fina S1602-T2 DEPOIS de aplicar: sobrescreve só o campo tocado + novo snapshot', async () => {
    await aplicar(TENANT_A, PROMO.id); // v2

    // editor do admin (client SDK, passa pela Rule) salva v3 mexendo SÓ na
    // retenção — demais campos (inclusive a estampa do plano) preservados
    const current = (await termsRef(TENANT_A).get()).data()!;
    const db = testEnv.authenticatedContext(ADMIN_UID, { role: 'platform_admin' }).firestore();
    const { atualizadoEm: _ts, ...semTs } = current;
    const editado = {
      ...semTs,
      retencaoRepassePct: 20, // único campo tocado
      versao: 3,
      atualizadoPor: ADMIN_UID,
      atualizadoEm: new Date(),
      planoAplicadoEm: (current['planoAplicadoEm'] as admin.firestore.Timestamp).toDate(),
    };
    await setDoc(doc(db, 'tenants', TENANT_A, 'commercialTerms', 'current'), editado);
    await setDoc(doc(db, 'tenants', TENANT_A, 'commercialTerms', 'v3'), editado);

    const v3 = (await termsRef(TENANT_A).get()).data()!;
    expect(v3['versao']).toBe(3);
    expect(v3['retencaoRepassePct']).toBe(20);
    expect(v3['taxaPorMetodo']).toEqual({ credit_card: 7.5, pix: 5 }); // estampa preservada
    expect((await termsRef(TENANT_A, 'v3').get()).exists).toBe(true);

    // e aplicar plano de novo depois da edição fina também segue (v4)
    await adminDb.collection('planosCobranca').doc(PROMO.id).update({ taxaPix: 6 });
    const r = await aplicar(TENANT_A, PROMO.id);
    expect(r.versao).toBe(4);
    expect(((await termsRef(TENANT_A).get()).data()!)['retencaoRepassePct']).toBe(20);
  });

  it('ANTAGONISTA cross-tenant: aplicar em A NÃO toca os termos de B', async () => {
    const antesB = (await termsRef(TENANT_B).get()).data()!;
    await aplicar(TENANT_A, PROMO.id);
    const depoisB = (await termsRef(TENANT_B).get()).data()!;
    expect(depoisB).toEqual(antesB);
    expect(depoisB['versao']).toBe(1);
  });

  it('tenant_owner chamando aplicarPlano ⇒ permission-denied (RN-404)', async () => {
    await expect(aplicar(TENANT_A, PROMO.id, OWNER_CALLER)).rejects.toMatchObject({
      code: 'permission-denied',
    });
    // e os termos não mudaram
    expect(((await termsRef(TENANT_A).get()).data()!)['versao']).toBe(1);
  });

  it('tenant_owner escrevendo commercialTerms/current DIRETO ⇒ negado (Rule RN-404)', async () => {
    const db = testEnv.authenticatedContext(MARINA_UID, {
      role: 'tenant_owner', tenantId: TENANT_A,
    }).firestore();
    await assertFails(
      setDoc(doc(db, 'tenants', TENANT_A, 'commercialTerms', 'current'), {
        ...termsV1(), versao: 2, taxaPorMetodo: { credit_card: 0, pix: 0 },
      })
    );
  });

  it('plano inexistente ⇒ not-found; tenant sem termo ⇒ failed-precondition', async () => {
    await expect(aplicar(TENANT_A, 'nao-existe')).rejects.toMatchObject({
      code: 'not-found',
    });
    await adminDb.collection('tenants').doc('tenant-sem-termo').set({
      id: 'tenant-sem-termo', nome: 'X', slug: 'tenant-sem-termo',
      status: 'ativo', ownerUid: 'u', tipo: 'produtor',
    });
    await expect(aplicar('tenant-sem-termo', PROMO.id)).rejects.toMatchObject({
      code: 'failed-precondition',
    });
  });

  it('plano "Padrão" do seed aplica com os defaults 10/8', async () => {
    await seedPlanosCobranca(adminDb);
    const r = await aplicar(TENANT_A, 'padrao');
    expect(r.versao).toBe(2);
    const current = (await termsRef(TENANT_A).get()).data()!;
    expect(current['taxaPorMetodo']).toEqual({ credit_card: 10, pix: 8 });
    expect(current['saasMonthlyFee']).toBe(0);
  });
});
