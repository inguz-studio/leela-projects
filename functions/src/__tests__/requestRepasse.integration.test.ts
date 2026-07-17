/**
 * requestRepasse.integration.test.ts — LEELA-E09s-L2-T3
 *
 * `requestRepasseCore` + `cancelRepasseCore` contra o Firestore Emulator.
 * Prova os aceites falsificáveis do brief:
 *   - sem `dadosBancarios/current` ⇒ failed-precondition, nada criado;
 *   - o servidor RELÊ o disponível e aplica RN-352 — valor > disponível ⇒
 *     rejeita, NUNCA cria;
 *   - criação em 'solicitado' com snapshot MASCARADO congelado + 1ª entrada
 *     de transicoes[]; comprometido sobe e disponível cai (RN-351);
 *   - ACEITE DA CORRIDA: dois requestRepasse concorrentes somando > que o
 *     disponível ⇒ exatamente UM passa, o outro FALHA (validação
 *     transacional) — 1 doc criado, saldo consistente;
 *   - trigger T1 posterior NO-OPA (saldo já recomputado na mesma tx);
 *   - decisão #7: tenant sem termo ⇒ failed-precondition;
 *   - payload forjado (estado:'pago', comprovanteNumero) é IGNORADO;
 *   - cancelRepasse: só owner, só 'solicitado' (decisão #11), devolve ao
 *     disponível, retry idempotente sem duplicar trilha; 'aprovado' não
 *     cancela; staff/athlete não solicitam.
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
  cancelRepasseCore,
  requestRepasseCore,
} from '../finance/requestRepasse';
import { recomputarSaldoRepasse } from '../finance/updateSaldoRepasse';
import type { FinanceCaller } from '../finance/atores';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const MARINA_UID = 'uid-marina-castelo';
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

function dadosBancariosMascarados() {
  return {
    tenantId: CASTELO_ID,
    banco: '260 — Nubank',
    agencia: '0001',
    contaMascarada: '****1234',
    tipo: 'corrente',
    pixMascarado: '***@g***.com',
    titular: 'Marina Castelo',
    cpfCnpjMascarado: '***.***.***-12',
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };
}

/** Cenário canônico: liquido 10000, retenção 15% ⇒ disponível 8500. */
async function seedCenario(opts: { comDados?: boolean; comTermo?: boolean } = {}) {
  const { comDados = true, comTermo = true } = opts;
  await db.collection('tenants').doc(CASTELO_ID).set({
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: new Date(), atualizadoEm: new Date(),
  });
  if (comTermo) {
    await db.doc(`tenants/${CASTELO_ID}/commercialTerms/current`).set({
      platformFeePct: 10.5,
      installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
      anticipation: { disponivel: false },
      communityMonthlyEnabled: false,
      saasMonthlyFee: 0,
      versao: 1,
      atualizadoPor: 'uid-platform-admin',
      atualizadoEm: new Date(),
    });
  }
  await db.collection('eventos').doc(EVENTO_ID).set({
    id: EVENTO_ID, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
    nome: 'Meia Maratona Floripa 2026', status: 'publicado',
    criadoEm: new Date(), atualizadoEm: new Date(),
  });
  await db.doc(`eventos/${EVENTO_ID}/financeiro/current`).set({
    tenantId: CASTELO_ID,
    receitaBruta: 12000,
    taxaPct: comTermo ? 10.5 : null,
    taxaValor: comTermo ? 2000 : null,
    receitaLiquida: comTermo ? 10000 : null,
    inscritos: { total: 0, porStatus: {}, porKit: {}, porModalidade: {} },
    atualizadoEm: new Date(),
  });
  if (comDados) {
    await db
      .doc(`tenants/${CASTELO_ID}/dadosBancarios/current`)
      .set(dadosBancariosMascarados());
  }
}

async function contarRepasses(): Promise<number> {
  const snap = await db.collection(`tenants/${CASTELO_ID}/repasses`).count().get();
  return snap.data().count;
}

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

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('requestRepasse — RN-352/354/357 (aceite T3)', () => {
  it('sem dadosBancarios ⇒ failed-precondition e NADA criado', async () => {
    await seedCenario({ comDados: false });
    await expect(requestRepasseCore(db, { valor: 100 }, owner)).rejects.toMatchObject(
      { code: 'failed-precondition' }
    );
    expect(await contarRepasses()).toBe(0);
  });

  it('happy path: cria solicitado com snapshot mascarado + trilha; saldo compromete na MESMA tx; trigger T1 no-opa', async () => {
    await seedCenario();
    const resultado = await requestRepasseCore(db, { valor: 5000 }, owner);

    expect(resultado.estado).toBe('solicitado');
    expect(resultado.valor).toBe(5000);
    expect(resultado.disponivel).toBe(3500); // 8500 − 5000

    const repasse = (
      await db.doc(`tenants/${CASTELO_ID}/repasses/${resultado.repasseId}`).get()
    ).data()!;
    expect(repasse['estado']).toBe('solicitado');
    expect(repasse['dadosBancariosSnapshot']).toMatchObject({
      contaMascarada: '****1234',
      pixMascarado: '***@g***.com',
    });
    const transicoes = repasse['transicoes'] as Record<string, unknown>[];
    expect(transicoes).toHaveLength(1);
    expect(transicoes[0]).toMatchObject({
      de: null, para: 'solicitado', por: MARINA_UID, papel: 'tenant_owner',
    });

    const saldoDoc = (await db.doc(`tenants/${CASTELO_ID}/saldo/current`).get()).data()!;
    expect(saldoDoc['comprometido']).toBe(5000);
    expect(saldoDoc['disponivel']).toBe(3500);

    // Trigger T1 (recompute posterior) NO-OPA — mesmos valores, sem rewrite
    const recomputado = await recomputarSaldoRepasse(db, CASTELO_ID);
    expect(recomputado.disponivel).toBe(3500);
    const saldoDoc2 = (await db.doc(`tenants/${CASTELO_ID}/saldo/current`).get()).data()!;
    expect(saldoDoc2['atualizadoEm']).toEqual(saldoDoc['atualizadoEm']);
  });

  it('valor > disponível ⇒ rejeita e NUNCA cria (RN-352)', async () => {
    await seedCenario();
    await expect(
      requestRepasseCore(db, { valor: 8500.01 }, owner)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(await contarRepasses()).toBe(0);
  });

  it('valores inválidos (0, negativo, 3 casas, não-número) ⇒ rejeita sem criar', async () => {
    await seedCenario();
    for (const valor of [0, -50, 10.005]) {
      await expect(requestRepasseCore(db, { valor }, owner)).rejects.toMatchObject({
        code: 'failed-precondition',
      });
    }
    await expect(
      requestRepasseCore(db, { valor: '5000' }, owner)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(await contarRepasses()).toBe(0);
  });

  it('ACEITE DA CORRIDA: 2 solicitações concorrentes somando > disponível ⇒ a 2ª FALHA', async () => {
    await seedCenario(); // disponível 8500; 5000 + 5000 > 8500
    const resultados = await Promise.allSettled([
      requestRepasseCore(db, { valor: 5000 }, owner),
      requestRepasseCore(db, { valor: 5000 }, owner),
    ]);

    const ok = resultados.filter((r) => r.status === 'fulfilled');
    const falhou = resultados.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(falhou).toHaveLength(1);
    expect(
      (falhou[0] as PromiseRejectedResult).reason
    ).toMatchObject({ code: 'failed-precondition' });

    // Estado final consistente: 1 doc, comprometido 5000, disponível 3500
    expect(await contarRepasses()).toBe(1);
    const saldo = await recomputarSaldoRepasse(db, CASTELO_ID);
    expect(saldo.comprometido).toBe(5000);
    expect(saldo.disponivel).toBe(3500);
  });

  it('decisão #7: tenant sem termo ⇒ failed-precondition (repasse bloqueado)', async () => {
    await seedCenario({ comTermo: false });
    await expect(requestRepasseCore(db, { valor: 10 }, owner)).rejects.toMatchObject({
      code: 'failed-precondition',
    });
    expect(await contarRepasses()).toBe(0);
  });

  it('ATAQUE — payload forjado (estado pago + comprovante) é IGNORADO', async () => {
    await seedCenario();
    const resultado = await requestRepasseCore(
      db,
      { valor: 100, estado: 'pago', comprovanteNumero: 'REP-2026-9999' },
      owner
    );
    const repasse = (
      await db.doc(`tenants/${CASTELO_ID}/repasses/${resultado.repasseId}`).get()
    ).data()!;
    expect(repasse['estado']).toBe('solicitado');
    expect(repasse['comprovanteNumero']).toBeUndefined();
  });

  it('ATAQUE — staff não solicita (owner-only)', async () => {
    await seedCenario();
    await expect(requestRepasseCore(db, { valor: 100 }, staff)).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });
});

describe('requestRepasse — eventoId (RN-349 · LEELA-BEPEND-T2)', () => {
  it('com eventoId do PRÓPRIO tenant: doc nasce com a associação exata', async () => {
    await seedCenario();
    const resultado = await requestRepasseCore(
      db,
      { valor: 1000, eventoId: EVENTO_ID },
      owner
    );
    expect(resultado.eventoId).toBe(EVENTO_ID);
    const repasse = (
      await db.doc(`tenants/${CASTELO_ID}/repasses/${resultado.repasseId}`).get()
    ).data()!;
    expect(repasse['eventoId']).toBe(EVENTO_ID);
  });

  it('sem eventoId: doc NÃO tem o campo (sem associação — retrocompat honesta)', async () => {
    await seedCenario();
    const resultado = await requestRepasseCore(db, { valor: 1000 }, owner);
    expect(resultado.eventoId).toBeNull();
    const repasse = (
      await db.doc(`tenants/${CASTELO_ID}/repasses/${resultado.repasseId}`).get()
    ).data()!;
    expect('eventoId' in repasse).toBe(false);
  });

  it('ATAQUE — eventoId inexistente ⇒ rejeita FAIL-CLOSED, nada criado', async () => {
    await seedCenario();
    await expect(
      requestRepasseCore(db, { valor: 100, eventoId: 'evento-fantasma' }, owner)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(await contarRepasses()).toBe(0);
  });

  it('ATAQUE — eventoId de OUTRO tenant ⇒ permission-denied, nada criado', async () => {
    await seedCenario();
    await db.collection('eventos').doc('evento-do-rival').set({
      id: 'evento-do-rival', tenantId: 'passo-certo', organizadorId: 'uid-rival',
      nome: 'Evento do Rival', status: 'publicado',
      criadoEm: new Date(), atualizadoEm: new Date(),
    });
    await expect(
      requestRepasseCore(db, { valor: 100, eventoId: 'evento-do-rival' }, owner)
    ).rejects.toMatchObject({ code: 'permission-denied' });
    expect(await contarRepasses()).toBe(0);
  });

  it('ATAQUE — eventoId malformado (vazio/não-string) ⇒ invalid-argument, nada criado', async () => {
    await seedCenario();
    for (const eventoId of ['', 42, { forjado: true }]) {
      await expect(
        requestRepasseCore(db, { valor: 100, eventoId }, owner)
      ).rejects.toMatchObject({ code: 'invalid-argument' });
    }
    expect(await contarRepasses()).toBe(0);
  });
});

describe('cancelRepasse — decisão #11 + RN-351/353', () => {
  it('owner cancela solicitado: devolve ao disponível, trilha com 2 entradas; retry = replay sem duplicar', async () => {
    await seedCenario();
    const { repasseId } = await requestRepasseCore(db, { valor: 5000 }, owner);

    const cancelado = await cancelRepasseCore(db, { repasseId }, owner);
    expect(cancelado).toEqual({ repasseId, estado: 'cancelado', replay: false });

    const repasse = (
      await db.doc(`tenants/${CASTELO_ID}/repasses/${repasseId}`).get()
    ).data()!;
    expect(repasse['estado']).toBe('cancelado');
    const transicoes = repasse['transicoes'] as Record<string, unknown>[];
    expect(transicoes).toHaveLength(2);
    expect(transicoes[1]).toMatchObject({
      de: 'solicitado', para: 'cancelado', por: MARINA_UID, papel: 'tenant_owner',
    });

    const saldo = (await db.doc(`tenants/${CASTELO_ID}/saldo/current`).get()).data()!;
    expect(saldo['comprometido']).toBe(0); // devolvido (RN-351)
    expect(saldo['disponivel']).toBe(8500);

    // retry idempotente — replay, e a trilha NÃO cresce
    const retry = await cancelRepasseCore(db, { repasseId }, owner);
    expect(retry.replay).toBe(true);
    const trilhaDepois = (
      await db.doc(`tenants/${CASTELO_ID}/repasses/${repasseId}`).get()
    ).get('transicoes') as unknown[];
    expect(trilhaDepois).toHaveLength(2);
  });

  it('repasse aprovado NÃO cancela (matriz RN-353)', async () => {
    await seedCenario();
    const { repasseId } = await requestRepasseCore(db, { valor: 1000 }, owner);
    await db.doc(`tenants/${CASTELO_ID}/repasses/${repasseId}`).update({
      estado: 'aprovado', // simula approveRepasse (T4)
    });
    await expect(cancelRepasseCore(db, { repasseId }, owner)).rejects.toMatchObject({
      code: 'failed-precondition',
    });
  });

  it('repasse inexistente ⇒ not-found; staff não cancela', async () => {
    await seedCenario();
    await expect(
      cancelRepasseCore(db, { repasseId: 'nao-existe' }, owner)
    ).rejects.toMatchObject({ code: 'not-found' });
    await expect(
      cancelRepasseCore(db, { repasseId: 'x' }, staff)
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
