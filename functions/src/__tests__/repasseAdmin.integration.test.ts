/**
 * repasseAdmin.integration.test.ts — LEELA-E09s-L2-T4
 *
 * Transições ADMIN + comprovante gapless + retenção contra o Emulator.
 * Prova os aceites falsificáveis do brief:
 *   - só platform_admin invoca (owner/staff ⇒ permission-denied);
 *   - transição inválida (solicitado→pago direto; saída de terminal) ⇒
 *     rejeita via transitionRepasse (RN-353);
 *   - rejectRepasse devolve o valor ao disponível (RN-351);
 *   - markRepassePago gera comprovante SEQUENCIAL GAPLESS por tenant:
 *     PROVA DE CONCORRÊNCIA — 2 pagos simultâneos ⇒ ...0007 e ...0008,
 *     sem buraco nem colisão (RN-355); retry do MESMO pago ⇒ replay com o
 *     MESMO número (contador não incrementa);
 *   - nenhuma transferência real (RN-356 — registro manual mock);
 *   - cada transição faz APPEND em transicoes[] (de→para/quando/quem);
 *   - setRetencaoRepasse: só admin; bump de versao + snapshot v{n}
 *     (RN-404); novo % refletido no recompute; range 0..100 travado;
 *     tenant sem termo ⇒ failed-precondition.
 *
 * Pré-requisito: Firestore Emulator na 8080 (via emulators:exec).
 */
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import type { AuthClaims } from '@leela/core';
import {
  approveRepasseCore,
  markRepassePagoCore,
  rejectRepasseCore,
  setRetencaoRepasseCore,
} from '../finance/transicoesRepasse';
import {
  clearFirestoreDrained,
  seedVerified,
  withTriggersPaused,
} from './helpers/stability';
import { requestRepasseCore } from '../finance/requestRepasse';
import { recomputarSaldoRepasse } from '../finance/updateSaldoRepasse';
import type { FinanceCaller } from '../finance/atores';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
const ADMIN_UID = 'uid-platform-admin';
const EVENTO_ID = 'meia-floripa-2026';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

const owner: FinanceCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: CASTELO_ID } as AuthClaims,
};
const staff: FinanceCaller = {
  uid: 'uid-staff',
  claims: { role: 'tenant_staff', tenantId: CASTELO_ID } as AuthClaims,
};
const platformAdmin: FinanceCaller = {
  uid: ADMIN_UID,
  claims: { role: 'platform_admin' } as AuthClaims,
};

/** Cenário canônico: liquido 10000, retenção 15% ⇒ disponível 8500. */
async function seedCenario(): Promise<void> {
  await db.collection('tenants').doc(CASTELO_ID).set({
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: new Date(), atualizadoEm: new Date(),
  });
  await db.doc(`tenants/${CASTELO_ID}/commercialTerms/current`).set({
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao: 1,
    atualizadoPor: ADMIN_UID,
    atualizadoEm: new Date(),
  });
  await db.collection('eventos').doc(EVENTO_ID).set({
    id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Meia Maratona Floripa 2026', status: 'publicado',
    criadoEm: new Date(), atualizadoEm: new Date(),
  });
  await db.doc(`eventos/${EVENTO_ID}/financeiro/current`).set({
    tenantId: CASTELO_ID, receitaBruta: 12000, taxaPct: 10.5,
    taxaValor: 2000, receitaLiquida: 10000,
    inscritos: { total: 0, porStatus: {}, porKit: {}, porModalidade: {} },
    atualizadoEm: new Date(),
  });
  await db.doc(`tenants/${CASTELO_ID}/dadosBancarios/current`).set({
    tenantId: CASTELO_ID, banco: '260 — Nubank', agencia: '0001',
    contaMascarada: '****1234', tipo: 'corrente',
    pixMascarado: '***@g***.com', titular: 'Marina Castelo',
    cpfCnpjMascarado: '***.***.***-12',
    criadoEm: new Date(), atualizadoEm: new Date(),
  });
}

async function solicitar(valor: number): Promise<string> {
  const { repasseId } = await requestRepasseCore(db, { valor }, owner);
  return repasseId;
}

const inputDe = (repasseId: string) => ({ tenantId: CASTELO_ID, repasseId });

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
  db = admin.firestore();
});

// SUITE-STAB: clear+seed com triggers pausados + canários verificados
// (full5: "Repasse 'X' não existe" — cenário engolido sob backlog).
beforeEach(async () => {
  await withTriggersPaused(async () => {
    await clearFirestoreDrained(testEnv);
    await seedVerified(db, testEnv, seedCenario, [
      `tenants/${CASTELO_ID}`,
      `tenants/${CASTELO_ID}/commercialTerms/current`,
      `tenants/${CASTELO_ID}/dadosBancarios/current`,
      `eventos/${EVENTO_ID}`,
      `eventos/${EVENTO_ID}/financeiro/current`,
    ]);
  });
}, 30_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('autorização — só platform_admin (aceite T4)', () => {
  it('owner e staff tentando transição admin ⇒ permission-denied (nada muda)', async () => {
    const repasseId = await solicitar(1000);
    for (const caller of [owner, staff]) {
      await expect(
        approveRepasseCore(db, inputDe(repasseId), caller)
      ).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(
        rejectRepasseCore(db, inputDe(repasseId), caller)
      ).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(
        markRepassePagoCore(db, inputDe(repasseId), caller)
      ).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(
        setRetencaoRepasseCore(
          db,
          { tenantId: CASTELO_ID, retencaoRepassePct: 0 },
          caller
        )
      ).rejects.toMatchObject({ code: 'permission-denied' });
    }
    const doc = await db.doc(`tenants/${CASTELO_ID}/repasses/${repasseId}`).get();
    expect(doc.get('estado')).toBe('solicitado');
  });
});

describe('máquina RN-353 — matriz fechada', () => {
  it('solicitado→pago DIRETO rejeita; aprovado→pago passa; trilha faz append de→para/quem', async () => {
    const repasseId = await solicitar(1000);

    await expect(
      markRepassePagoCore(db, inputDe(repasseId), platformAdmin)
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    const aprovado = await approveRepasseCore(db, inputDe(repasseId), platformAdmin);
    expect(aprovado).toEqual({ repasseId, estado: 'aprovado', replay: false });

    const pago = await markRepassePagoCore(db, inputDe(repasseId), platformAdmin);
    expect(pago.estado).toBe('pago');
    expect(pago.comprovanteNumero).toMatch(/^REP-\d{4}-0001$/);

    const transicoes = (
      await db.doc(`tenants/${CASTELO_ID}/repasses/${repasseId}`).get()
    ).get('transicoes') as Record<string, unknown>[];
    expect(transicoes).toHaveLength(3); // criação + aprovado + pago
    expect(transicoes[1]).toMatchObject({
      de: 'solicitado', para: 'aprovado', por: ADMIN_UID, papel: 'platform_admin',
    });
    expect(transicoes[2]).toMatchObject({ de: 'aprovado', para: 'pago', por: ADMIN_UID });
  });

  it('estado terminal não transita: recusado não aprova; retry de aprovado ⇒ replay sem append', async () => {
    const repasseId = await solicitar(1000);
    await rejectRepasseCore(db, inputDe(repasseId), platformAdmin);
    await expect(
      approveRepasseCore(db, inputDe(repasseId), platformAdmin)
    ).rejects.toMatchObject({ code: 'failed-precondition' });

    const outroId = await solicitar(500);
    await approveRepasseCore(db, inputDe(outroId), platformAdmin);
    const retry = await approveRepasseCore(db, inputDe(outroId), platformAdmin);
    expect(retry.replay).toBe(true);
    const trilha = (
      await db.doc(`tenants/${CASTELO_ID}/repasses/${outroId}`).get()
    ).get('transicoes') as unknown[];
    expect(trilha).toHaveLength(2); // criação + aprovado (replay não duplica)
  });

  it('rejectRepasse DEVOLVE o valor ao disponível (RN-351)', async () => {
    const repasseId = await solicitar(5000); // disponível cai p/ 3500
    await rejectRepasseCore(db, inputDe(repasseId), platformAdmin);

    const saldo = (await db.doc(`tenants/${CASTELO_ID}/saldo/current`).get()).data()!;
    expect(saldo['comprometido']).toBe(0);
    expect(saldo['disponivel']).toBe(8500);
  });
});

describe('comprovante GAPLESS (RN-355/356)', () => {
  it('PROVA DE CONCORRÊNCIA: 2 pagos simultâneos ⇒ 0007 e 0008, sem buraco/colisão', async () => {
    // Contador pré-semeado em 6 (cenário do brief: próximo = 0007)
    await db.doc(`tenants/${CASTELO_ID}/repasseSeq/current`).set({
      tenantId: CASTELO_ID, ultimaSeq: 6, atualizadoEm: new Date(),
    });
    const repA = await solicitar(1000);
    const repB = await solicitar(2000);
    await approveRepasseCore(db, inputDe(repA), platformAdmin);
    await approveRepasseCore(db, inputDe(repB), platformAdmin);

    const [pagoA, pagoB] = await Promise.all([
      markRepassePagoCore(db, inputDe(repA), platformAdmin),
      markRepassePagoCore(db, inputDe(repB), platformAdmin),
    ]);

    const numeros = [pagoA.comprovanteNumero, pagoB.comprovanteNumero].sort();
    expect(numeros[0]).toMatch(/^REP-\d{4}-0007$/);
    expect(numeros[1]).toMatch(/^REP-\d{4}-0008$/);
    expect(numeros[0]).not.toBe(numeros[1]); // sem colisão

    const seq = (await db.doc(`tenants/${CASTELO_ID}/repasseSeq/current`).get()).data()!;
    expect(seq['ultimaSeq']).toBe(8); // sem buraco
  });

  it('retry do MESMO pago ⇒ replay com o MESMO número; contador intocado', async () => {
    const repasseId = await solicitar(1000);
    await approveRepasseCore(db, inputDe(repasseId), platformAdmin);
    const primeiro = await markRepassePagoCore(db, inputDe(repasseId), platformAdmin);
    const retry = await markRepassePagoCore(db, inputDe(repasseId), platformAdmin);

    expect(retry.replay).toBe(true);
    expect(retry.comprovanteNumero).toBe(primeiro.comprovanteNumero);
    const seq = (await db.doc(`tenants/${CASTELO_ID}/repasseSeq/current`).get()).data()!;
    expect(seq['ultimaSeq']).toBe(1);
  });

  it('pago permanece comprometido (dinheiro saiu — nunca volta ao disponível)', async () => {
    const repasseId = await solicitar(3000);
    await approveRepasseCore(db, inputDe(repasseId), platformAdmin);
    await markRepassePagoCore(db, inputDe(repasseId), platformAdmin);
    const saldo = await recomputarSaldoRepasse(db, CASTELO_ID);
    expect(saldo.comprometido).toBe(3000);
    expect(saldo.disponivel).toBe(5500);
  });
});

describe('setRetencaoRepasse (decisão #4 · RN-404)', () => {
  it('admin grava: bump de versao + snapshot v{n}; novo % refletido no saldo', async () => {
    await recomputarSaldoRepasse(db, CASTELO_ID); // saldo base 15% ⇒ retido 1500
    const resultado = await setRetencaoRepasseCore(
      db,
      { tenantId: CASTELO_ID, retencaoRepassePct: 20 },
      platformAdmin
    );
    expect(resultado).toEqual({
      tenantId: CASTELO_ID, retencaoRepassePct: 20, versao: 2,
    });

    const current = (
      await db.doc(`tenants/${CASTELO_ID}/commercialTerms/current`).get()
    ).data()!;
    expect(current['retencaoRepassePct']).toBe(20);
    expect(current['versao']).toBe(2);
    const snapshot = await db
      .doc(`tenants/${CASTELO_ID}/commercialTerms/v2`)
      .get();
    expect(snapshot.exists).toBe(true); // snapshot imutável (RN-404)

    // Recompute já disparado pela Function — retido agora 20% de 10000
    const saldo = (await db.doc(`tenants/${CASTELO_ID}/saldo/current`).get()).data()!;
    expect(saldo['retido']).toBe(2000);
    expect(saldo['disponivel']).toBe(8000);
  });

  it('range travado (150 / -5 / NaN) ⇒ invalid-argument; tenant sem termo ⇒ failed-precondition', async () => {
    for (const pct of [150, -5, Number.NaN]) {
      await expect(
        setRetencaoRepasseCore(
          db,
          { tenantId: CASTELO_ID, retencaoRepassePct: pct },
          platformAdmin
        )
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    }
    await db.recursiveDelete(
      db.doc(`tenants/${CASTELO_ID}/commercialTerms/current`)
    );
    await expect(
      setRetencaoRepasseCore(
        db,
        { tenantId: CASTELO_ID, retencaoRepassePct: 10 },
        platformAdmin
      )
    ).rejects.toMatchObject({ code: 'failed-precondition' });
  });
});
