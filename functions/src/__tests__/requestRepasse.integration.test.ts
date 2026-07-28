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
import {
  clearFirestoreDrained,
  seedVerified,
  withTriggersPaused,
} from './helpers/stability';
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
// SUITE-STAB: seed roda com triggers pausados + canários verificados —
// full5: financeiro/current do seed era CLOBBERADO por recompute tardio do
// backlog de triggers do arquivo vizinho (disponível 60138.11 vs 3500) e
// dadosBancarios sumia ("Cadastre os dados bancários" — RN-354).
async function seedCenario(opts: { comDados?: boolean; comTermo?: boolean } = {}) {
  const { comDados = true, comTermo = true } = opts;
  const canaries = [
    `tenants/${CASTELO_ID}`,
    `eventos/${EVENTO_ID}`,
    `eventos/${EVENTO_ID}/financeiro/current`,
    ...(comTermo ? [`tenants/${CASTELO_ID}/commercialTerms/current`] : []),
    ...(comDados ? [`tenants/${CASTELO_ID}/dadosBancarios/current`] : []),
  ];
  await withTriggersPaused(() =>
    seedVerified(db, testEnv, () => seedCenarioRaw({ comDados, comTermo }), canaries)
  );
}

async function seedCenarioRaw(opts: { comDados: boolean; comTermo: boolean }) {
  const { comDados, comTermo } = opts;
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
  await withTriggersPaused(() => clearFirestoreDrained(testEnv));
}, 30_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('requestRepasse — RN-352/354/357 (aceite T3)', () => {
  it('sem dadosBancarios ⇒ failed-precondition e NADA criado', async () => {
    await seedCenario({ comDados: false });
    await expect(requestRepasseCore(db, { valor: 100, eventoId: EVENTO_ID }, owner)).rejects.toMatchObject(
      { code: 'failed-precondition' }
    );
    expect(await contarRepasses()).toBe(0);
  });

  it('happy path: cria solicitado com snapshot mascarado + trilha; saldo compromete na MESMA tx; trigger T1 no-opa', async () => {
    await seedCenario();
    const resultado = await requestRepasseCore(db, { valor: 5000, eventoId: EVENTO_ID }, owner);

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
      requestRepasseCore(db, { valor: 8500.01, eventoId: EVENTO_ID }, owner)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(await contarRepasses()).toBe(0);
  });

  it('valores inválidos (0, negativo, 3 casas, não-número) ⇒ rejeita sem criar', async () => {
    await seedCenario();
    for (const valor of [0, -50, 10.005]) {
      await expect(requestRepasseCore(db, { valor, eventoId: EVENTO_ID }, owner)).rejects.toMatchObject({
        code: 'failed-precondition',
      });
    }
    await expect(
      requestRepasseCore(db, { valor: '5000', eventoId: EVENTO_ID }, owner)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(await contarRepasses()).toBe(0);
  });

  it('ACEITE DA CORRIDA: 2 solicitações concorrentes somando > disponível ⇒ a 2ª FALHA', async () => {
    await seedCenario(); // disponível 8500; 5000 + 5000 > 8500
    const resultados = await Promise.allSettled([
      requestRepasseCore(db, { valor: 5000, eventoId: EVENTO_ID }, owner),
      requestRepasseCore(db, { valor: 5000, eventoId: EVENTO_ID }, owner),
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
    await expect(requestRepasseCore(db, { valor: 10, eventoId: EVENTO_ID }, owner)).rejects.toMatchObject({
      code: 'failed-precondition',
    });
    expect(await contarRepasses()).toBe(0);
  });

  it('ATAQUE — payload forjado (estado pago + comprovante) é IGNORADO', async () => {
    await seedCenario();
    const resultado = await requestRepasseCore(
      db,
      {
        valor: 100,
        eventoId: EVENTO_ID,
        estado: 'pago',
        comprovanteNumero: 'REP-2026-9999',
      },
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
    await expect(requestRepasseCore(db, { valor: 100, eventoId: EVENTO_ID }, staff)).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });
});

describe('requestRepasse — eventoId (RN-349 · RN-369/DEC-0727C)', () => {
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

  // RN-369 (DEC-0727C): a asserção anterior cravava o oposto — "sem eventoId, o
  // doc NÃO tem o campo, retrocompat honesta". Aquele caminho era o DEFAULT do
  // modal e devolvia inteiro o repasse-fantasma do §P-IAMENU-2 (o escalado E-2
  // da review CAIXADISP-REV). O dono fechou o item 38: repasse SEMPRE amarrado
  // a um evento. A asserção substituta é mais forte — não só o doc não nasce
  // sem o campo, a solicitação inteira é recusada, e nada é criado.
  it('SEM eventoId ⇒ invalid-argument e NADA criado (RN-369)', async () => {
    await seedCenario();
    await expect(
      requestRepasseCore(db, { valor: 1000 }, owner)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(
      requestRepasseCore(db, { valor: 1000, eventoId: undefined }, owner)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(await contarRepasses()).toBe(0);
  });

  it('LEGADO: repasse antigo sem eventoId continua contando no saldo do tenant', async () => {
    await seedCenario();
    // Doc como os criados ANTES da RN-369 — sem o campo. Nenhuma migração o
    // reescreve; a leitura tem de aguentá-lo.
    await db.collection(`tenants/${CASTELO_ID}/repasses`).doc('legado-1').set({
      id: 'legado-1',
      tenantId: CASTELO_ID,
      valor: 1000,
      estado: 'solicitado',
      dadosBancariosSnapshot: dadosBancariosMascarados(),
      transicoes: [],
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    });

    // Ele compromete o saldo do TENANT (RN-351) …
    const saldo = await recomputarSaldoRepasse(db, CASTELO_ID);
    expect(saldo.comprometido).toBe(1000);
    expect(saldo.disponivel).toBe(7500);

    // … e NÃO abate o evento, porque nunca foi atribuído a nenhum: o teto do
    // evento segue 8500. Adivinhar a associação seria inventar dado.
    const resultado = await requestRepasseCore(
      db,
      { valor: 7500, eventoId: EVENTO_ID },
      owner
    );
    expect(resultado.disponivelDoEvento).toBe(1000); // 8500 − 7500
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

// ---------------------------------------------------------------------------
// RN-368 (DEC-0727C) — evento não repassa mais do que está liberado
// ---------------------------------------------------------------------------

const EVENTO_B = 'trail-serra-2026';

/** 2º evento com agregado próprio — o tenant passa a ter folga que o evento não tem. */
async function seedSegundoEvento(opts: { encerrado?: boolean } = {}) {
  await withTriggersPaused(() =>
    seedVerified(
      db,
      testEnv,
      async () => {
        await db.collection('eventos').doc(EVENTO_B).set({
          id: EVENTO_B, tenantId: CASTELO_ID, organizadorId: MARINA_UID,
          nome: 'Trail da Serra 2026',
          status: opts.encerrado === true ? 'encerrado' : 'publicado',
          criadoEm: new Date(), atualizadoEm: new Date(),
        });
        await db.doc(`eventos/${EVENTO_B}/financeiro/current`).set({
          tenantId: CASTELO_ID,
          receitaBruta: 12000,
          taxaPct: 10.5,
          taxaValor: 2000,
          receitaLiquida: 10000,
          inscritos: { total: 0, porStatus: {}, porKit: {}, porModalidade: {} },
          atualizadoEm: new Date(),
        });
      },
      [`eventos/${EVENTO_B}`, `eventos/${EVENTO_B}/financeiro/current`]
    )
  );
}

describe('requestRepasse — teto POR EVENTO (RN-368)', () => {
  it('O FURO FECHADO: com folga no TENANT, o evento ainda recusa acima do liberado dele', async () => {
    await seedCenario();
    await seedSegundoEvento();

    // Tenant: 8.500 + 8.500 = 17.000 disponíveis. O evento: 8.500.
    const saldo = await recomputarSaldoRepasse(db, CASTELO_ID);
    expect(saldo.disponivel).toBe(17000);

    // 9.000 CABE no tenant (a validação de RN-352 passaria) e NÃO cabe no
    // evento — era exatamente assim que um repasse consumia o liberado do
    // vizinho e a Caixa mostrava disponível 0 com a soma não fechando
    // (review CAIXADISP-REV, vetor 1).
    await expect(
      requestRepasseCore(db, { valor: 9000, eventoId: EVENTO_ID }, owner)
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      details: {
        motivo: 'repasse_excede_evento',
        eventoId: EVENTO_ID,
        disponivelDoEvento: 8500,
        valorSolicitado: 9000,
      },
    });
    expect(await contarRepasses()).toBe(0);
  });

  it('no limite exato do evento PASSA; um centavo acima não', async () => {
    await seedCenario();
    await seedSegundoEvento();

    await expect(
      requestRepasseCore(db, { valor: 8500.01, eventoId: EVENTO_ID }, owner)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    expect(await contarRepasses()).toBe(0);

    const ok = await requestRepasseCore(db, { valor: 8500, eventoId: EVENTO_ID }, owner);
    expect(ok.disponivelDoEvento).toBe(0);
    expect(await contarRepasses()).toBe(1);
  });

  it('o teto é POR EVENTO: esgotar um não impede o outro', async () => {
    await seedCenario();
    await seedSegundoEvento();

    await requestRepasseCore(db, { valor: 8500, eventoId: EVENTO_ID }, owner);
    // O evento A está zerado …
    await expect(
      requestRepasseCore(db, { valor: 1, eventoId: EVENTO_ID }, owner)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    // … e o B, intacto.
    const noB = await requestRepasseCore(db, { valor: 8500, eventoId: EVENTO_B }, owner);
    expect(noB.disponivelDoEvento).toBe(0);
    expect(await contarRepasses()).toBe(2);
  });

  it('repasses VIVOS do evento abatem o teto; cancelado devolve (RN-351/353)', async () => {
    await seedCenario();
    // O 2º evento dá folga ao TENANT: sem ela as duas validações barrariam no
    // mesmo número e este teste não isolaria o guard por evento.
    await seedSegundoEvento();
    const primeiro = await requestRepasseCore(
      db,
      { valor: 5000, eventoId: EVENTO_ID },
      owner
    );
    expect(primeiro.disponivelDoEvento).toBe(3500);

    // 4.000 já não cabe: 8.500 − 5.000 vivos.
    await expect(
      requestRepasseCore(db, { valor: 4000, eventoId: EVENTO_ID }, owner)
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      details: { disponivelDoEvento: 3500 },
    });

    // Cancelar tira o doc do conjunto vivo — o teto volta por construção.
    await cancelRepasseCore(db, { repasseId: primeiro.repasseId }, owner);
    const depois = await requestRepasseCore(
      db,
      { valor: 8500, eventoId: EVENTO_ID },
      owner
    );
    expect(depois.disponivelDoEvento).toBe(0);
  });

  it('o teto do evento usa a MESMA base do saque: encerrar libera a retenção (RN-350/367)', async () => {
    await seedCenario();
    await seedSegundoEvento(); // folga no tenant — o teto testado é o do evento
    // Em andamento, 10.000 (o líquido inteiro) excede o liberado de 8.500 …
    await expect(
      requestRepasseCore(db, { valor: 10000, eventoId: EVENTO_ID }, owner)
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      details: { disponivelDoEvento: 8500 },
    });

    // … encerrado, o mesmo valor passa: a retenção liberou nos DOIS lados.
    await db.doc(`eventos/${EVENTO_ID}`).update({ status: 'encerrado' });
    const ok = await requestRepasseCore(
      db,
      { valor: 10000, eventoId: EVENTO_ID },
      owner
    );
    expect(ok.valor).toBe(10000);
    expect(ok.disponivelDoEvento).toBe(0);
  });

  it('evento SEM agregado financeiro: teto 0 — nada confirmado, nada a repassar', async () => {
    await seedCenario();
    await db.collection('eventos').doc('evento-vazio').set({
      id: 'evento-vazio', tenantId: CASTELO_ID, organizadorId: MARINA_UID,
      nome: 'Evento sem venda', status: 'publicado',
      criadoEm: new Date(), atualizadoEm: new Date(),
    });
    await expect(
      requestRepasseCore(db, { valor: 1, eventoId: 'evento-vazio' }, owner)
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      details: { motivo: 'repasse_excede_evento', disponivelDoEvento: 0 },
    });
    expect(await contarRepasses()).toBe(0);
  });
});

describe('cancelRepasse — decisão #11 + RN-351/353', () => {
  it('owner cancela solicitado: devolve ao disponível, trilha com 2 entradas; retry = replay sem duplicar', async () => {
    await seedCenario();
    const { repasseId } = await requestRepasseCore(db, { valor: 5000, eventoId: EVENTO_ID }, owner);

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
    const { repasseId } = await requestRepasseCore(db, { valor: 1000, eventoId: EVENTO_ID }, owner);
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

// ---------------------------------------------------------------------------
// REVIEW CAIXASIMPLES-REV — ataques de contexto fresco ao guard da DEC-0727C.
//
// O que a lane CAIXA-SIMPLES declarou SEM prova, e o que esta bateria cobra:
//   V1 — a corrida no MESMO evento COM folga no tenant. A prova da lane
//        (`ACEITE DA CORRIDA`) roda sem folga: quem barra o 2º pedido lá é a
//        validação de TENANT (RN-352), não o guard novo. Com um 2º evento
//        dando folga ao consolidado, só o teto por evento (RN-368) sobra — e é
//        ele que precisa serializar dentro da transação, ou dois pedidos de
//        5.000 nascem num evento de 8.500 e o dinheiro sai duas vezes;
//   V6 — a ORDEM documentada das validações (tenant ANTES do evento) tem de
//        chegar ao painel com a mensagem CERTA nos dois casos: genérica quando
//        o consolidado barra, TIPADA com número quando o evento barra;
//   V4 — Σ dos disponíveis por evento × disponível do tenant: o card da Caixa
//        é por EVENTO e não conhece a janela D+N, que é do tenant. O resíduo
//        E-2 deixa de ser hipótese e vira número medido.
// ---------------------------------------------------------------------------

/** Σ dos repasses VIVOS de um evento — a grandeza que o teto RN-368 limita. */
async function somaVivosDoEvento(eventoId: string): Promise<number> {
  const snap = await db.collection(`tenants/${CASTELO_ID}/repasses`).get();
  return snap.docs
    .filter((d) => d.get('eventoId') === eventoId)
    .filter((d) => ['solicitado', 'aprovado', 'pago'].includes(d.get('estado') as string))
    .reduce((acc, d) => acc + (d.get('valor') as number), 0);
}

describe('CAIXASIMPLES-REV V1 — corrida no MESMO evento com folga no TENANT', () => {
  it('dois pedidos simultâneos que somam acima do teto do EVENTO: só um nasce', async () => {
    await seedCenario();
    await seedSegundoEvento(); // tenant 17.000 — a validação RN-352 NÃO barra
    expect((await recomputarSaldoRepasse(db, CASTELO_ID)).disponivel).toBe(17000);

    // 5.000 + 5.000 = 10.000 > 8.500 (teto do evento A) e < 17.000 (tenant).
    const resultados = await Promise.allSettled([
      requestRepasseCore(db, { valor: 5000, eventoId: EVENTO_ID }, owner),
      requestRepasseCore(db, { valor: 5000, eventoId: EVENTO_ID }, owner),
    ]);

    const ok = resultados.filter((r) => r.status === 'fulfilled');
    const falhou = resultados.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(falhou).toHaveLength(1);
    expect((falhou[0] as PromiseRejectedResult).reason).toMatchObject({
      code: 'failed-precondition',
      details: { motivo: 'repasse_excede_evento', eventoId: EVENTO_ID },
    });

    // A INVARIANTE de dinheiro: a Σ dos vivos do evento nunca passa do liberado.
    expect(await somaVivosDoEvento(EVENTO_ID)).toBeLessThanOrEqual(8500);
    expect(await contarRepasses()).toBe(1);
  });

  it('três pedidos simultâneos: entram só os que cabem no liberado do evento', async () => {
    await seedCenario();
    await seedSegundoEvento();

    // 3 × 4.000 = 12.000 contra 8.500 liberados: no máximo DOIS cabem.
    const resultados = await Promise.allSettled([
      requestRepasseCore(db, { valor: 4000, eventoId: EVENTO_ID }, owner),
      requestRepasseCore(db, { valor: 4000, eventoId: EVENTO_ID }, owner),
      requestRepasseCore(db, { valor: 4000, eventoId: EVENTO_ID }, owner),
    ]);
    const ok = resultados.filter((r) => r.status === 'fulfilled');
    expect(ok.length).toBeLessThanOrEqual(2);
    expect(await somaVivosDoEvento(EVENTO_ID)).toBeLessThanOrEqual(8500);
  });
});

describe('CAIXASIMPLES-REV V6 — a ordem das validações chega ao painel', () => {
  it('excede o TENANT mas cabe no evento ⇒ erro GENÉRICO, sem details tipado', async () => {
    await seedCenario();
    // Repasse LEGADO (sem eventoId) consome o consolidado sem abater evento
    // nenhum: tenant 8.500 − 8.000 = 500; teto do evento continua 8.500.
    await db.collection(`tenants/${CASTELO_ID}/repasses`).doc('legado-tenant').set({
      id: 'legado-tenant', tenantId: CASTELO_ID, valor: 8000, estado: 'solicitado',
      dadosBancariosSnapshot: dadosBancariosMascarados(), transicoes: [],
      criadoEm: new Date(), atualizadoEm: new Date(),
    });
    expect((await recomputarSaldoRepasse(db, CASTELO_ID)).disponivel).toBe(500);

    const erro = await requestRepasseCore(db, { valor: 1000, eventoId: EVENTO_ID }, owner)
      .then(() => null)
      .catch((e: unknown) => e as { code?: string; message?: string; details?: unknown });
    expect(erro?.code).toBe('failed-precondition');
    expect(erro?.message).toContain('excede o disponível');
    // O painel só monta a frase COM número quando o motivo é do evento — aqui
    // ele tem de cair na genérica, ou diria "este evento tem R$ X" para um
    // estouro que foi da CONTA.
    expect(erro?.details).toBeUndefined();
    expect(await contarRepasses()).toBe(1); // só o legado
  });

  it('cabe no tenant e excede o EVENTO ⇒ details tipado com o número certo', async () => {
    await seedCenario();
    await seedSegundoEvento();
    const erro = await requestRepasseCore(db, { valor: 9000, eventoId: EVENTO_ID }, owner)
      .then(() => null)
      .catch((e: unknown) => e as { code?: string; details?: unknown });
    expect(erro?.details).toMatchObject({
      motivo: 'repasse_excede_evento',
      eventoId: EVENTO_ID,
      disponivelDoEvento: 8500,
      valorSolicitado: 9000,
    });
  });
});

describe('CAIXASIMPLES-REV V3 — bordas adversariais da convergência', () => {
  it('termo NEGOCIADO (30%, não o default 15) move os DOIS lados juntos', async () => {
    await seedCenario();
    await db
      .doc(`tenants/${CASTELO_ID}/commercialTerms/current`)
      .update({ retencaoRepassePct: 30 });

    // Líquido 10.000, retenção 30% ⇒ liberado 7.000 nos dois cálculos.
    expect((await recomputarSaldoRepasse(db, CASTELO_ID)).disponivel).toBe(7000);
    await expect(
      requestRepasseCore(db, { valor: 7000.01, eventoId: EVENTO_ID }, owner)
    ).rejects.toMatchObject({ code: 'failed-precondition' });
    const ok = await requestRepasseCore(db, { valor: 7000, eventoId: EVENTO_ID }, owner);
    expect(ok.disponivelDoEvento).toBe(0);
  });

  it('CENTAVOS: o teto do evento é cent-exato, e um centavo acima não passa', async () => {
    await seedCenario();
    await seedSegundoEvento(); // folga no tenant — isola o teto do evento
    // Líquido 10.000,01 · 15% = 1.500,00 (half-up sobre 1.500,0015) ⇒ 8.500,01.
    await db
      .doc(`eventos/${EVENTO_ID}/financeiro/current`)
      .update({ receitaBruta: 12000.01, receitaLiquida: 10000.01 });

    await expect(
      requestRepasseCore(db, { valor: 8500.02, eventoId: EVENTO_ID }, owner)
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      details: { disponivelDoEvento: 8500.01 },
    });
    const ok = await requestRepasseCore(db, { valor: 8500.01, eventoId: EVENTO_ID }, owner);
    expect(ok.disponivelDoEvento).toBe(0);
  });

  it('LEGADO no MEIO dos vivos do MESMO evento: só o associado abate o teto', async () => {
    await seedCenario();
    await seedSegundoEvento();
    // Um vivo associado (2.000) e um LEGADO (3.000, sem eventoId) convivendo.
    await requestRepasseCore(db, { valor: 2000, eventoId: EVENTO_ID }, owner);
    await db.collection(`tenants/${CASTELO_ID}/repasses`).doc('legado-meio').set({
      id: 'legado-meio', tenantId: CASTELO_ID, valor: 3000, estado: 'solicitado',
      dadosBancariosSnapshot: dadosBancariosMascarados(), transicoes: [],
      criadoEm: new Date(), atualizadoEm: new Date(),
    });
    // Teto do evento = 8.500 − 2.000 = 6.500 (o legado NÃO abate o evento).
    await expect(
      requestRepasseCore(db, { valor: 6500.01, eventoId: EVENTO_ID }, owner)
    ).rejects.toMatchObject({ details: { disponivelDoEvento: 6500 } });
  });
});

// ---------------------------------------------------------------------------
// V4 — RESÍDUO E-2 MEDIDO: o card da Caixa é POR EVENTO e não conhece a janela
// D+N (RN-348), que é grandeza do TENANT. Com fundos recém-confirmados presos
// na janela, o número que a Caixa exibe como "Disponível para Repasse" fica
// ACIMA do que o saque aceita — a MESMA classe de defeito que a DEC-0727C
// fechou (item 37), agora por outra porta e sem depender de repasse legado.
//
// Este teste MEDE o resíduo; não o abençoa. Se alguém decidir que a Caixa passa
// a exibir min(teto do evento, saldo do tenant), ele fica vermelho e força a
// decisão explícita em vez de deixar a mudança passar calada.
// ---------------------------------------------------------------------------
describe('CAIXASIMPLES-REV V4 — Σ por evento × disponível do tenant', () => {
  it('janela D+N segura fundos do TENANT e o teto do EVENTO não enxerga', async () => {
    await seedCenario();
    // Pagamento confirmado HOJE: dentro da janela D+2 úteis (RN-348).
    await db.collection('pagamentos').doc('pg-recente').set({
      id: 'pg-recente', tenantId: CASTELO_ID, eventoId: EVENTO_ID,
      status: 'confirmado', valorFinal: 5000,
      pagoEm: admin.firestore.Timestamp.fromDate(new Date()),
      criadoEm: new Date(), atualizadoEm: new Date(),
    });

    // Tenant: 8.500 − 4.475 (líquido de 5.000 a 10,5%) = 4.025.
    const saldo = await recomputarSaldoRepasse(db, CASTELO_ID);
    expect(saldo.dentroJanelaDN).toBe(4475);
    expect(saldo.disponivel).toBe(4025);

    // O teto do EVENTO segue 8.500 — é o número que a Caixa pinta no card.
    // Pedir 5.000 passa no evento e é RECUSADO pelo consolidado, com a frase
    // genérica: a tela prometeu mais do que o saque aceita.
    const erro = await requestRepasseCore(db, { valor: 5000, eventoId: EVENTO_ID }, owner)
      .then(() => null)
      .catch((e: unknown) => e as { code?: string; details?: unknown });
    expect(erro?.code).toBe('failed-precondition');
    expect(erro?.details).toBeUndefined(); // barrou no TENANT, não no evento
    expect(await contarRepasses()).toBe(0);

    // A medida do resíduo: 8.500 exibidos × 4.025 sacáveis = R$ 4.475 de gap.
    const ok = await requestRepasseCore(db, { valor: 4025, eventoId: EVENTO_ID }, owner);
    expect(ok.disponivelDoEvento).toBe(4475); // 8.500 − 4.025 "sobra" inalcançável
  });
});
