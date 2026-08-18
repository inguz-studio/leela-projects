/**
 * financeiroEvento.integration.test.ts — LEELA-S207-T2
 *
 * Integração REAL no Emulator (Firestore, Admin SDK): agregado financeiro
 * do evento (`eventos/{id}/financeiro/current`) por Function idempotente.
 *
 * Cobre (aceite E03-L2):
 *   - bruto/taxa/líquido derivados do TERMO do tenant (RN-406 — 10,5% da
 *     Castelo vem do termo, nunca de constante): 85.617 → 8.989,79 → 76.627,21
 *   - contagens recontadas da fonte (453 canônicos: 43/218/168/24 por kit)
 *   - IDEMPOTENTE: reprocessar produz o MESMO doc (full recompute, nada acumula)
 *   - ∑ `eventos.qtdInscritos` sincronizado pela Function (inscrição removida
 *     → 452 no doc do evento e no agregado)
 *   - tenant SEM termos → taxa/líquido null, SEM fallback (RN-406)
 *   - Rules: cliente NÃO escreve o agregado; leitura só do tenant dono
 *
 * Pré-requisito: Firestore Emulator via emulators:exec — honra
 * LEELA_FS_EMU_PORT (default 8080; a lane TAXAFLEX roda no r6 8480).
 */
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  computeFinanceiro,
  recomputarFinanceiroEvento,
} from '../eventos/agregarFinanceiro';
import { seedEventos, MEIA_FLORIPA_ID } from '../seed/eventos.seed';
import { gerarInscritosSeed, seedInscritos } from '../seed/inscritos.seed';
import {
  clearFirestoreDrained,
  seedVerified,
  withTriggersPaused,
} from './helpers/stability';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';
const PASSO_OWNER_UID = 'uid-passo-owner';

const EVENTO_SEM_TERMOS = 'trail-ratones-2026'; // tenant passo-certo, sem termos

let testEnv: RulesTestEnvironment;
let adminDb: admin.firestore.Firestore;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(RULES_PATH, 'utf8'),
      host: 'localhost',
      port: Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080),
    },
  });
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] =
      `localhost:${Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080)}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  adminDb = admin.firestore();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

async function seedBase(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = adminDb.batch();
  batch.set(adminDb.collection('tenants').doc(CASTELO_ID), {
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  // Termo vigente da Castelo (RN-406): 10,5% VEM DO TERMO, não de constante
  batch.set(
    adminDb.doc(`tenants/${CASTELO_ID}/commercialTerms/current`),
    {
      platformFeePct: 10.5,
      installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 20 },
      anticipation: { disponivel: false },
      communityMonthlyEnabled: false,
      saasMonthlyFee: 0,
      versao: 1,
      atualizadoPor: 'seed',
      atualizadoEm: now,
    }
  );
  batch.set(adminDb.collection('tenants').doc(PASSO_ID), {
    id: PASSO_ID, nome: 'Passo Certo Eventos', slug: PASSO_ID,
    status: 'ativo', ownerUid: PASSO_OWNER_UID, tipo: 'promotor',
    criadoEm: now, atualizadoEm: now,
  });
  // Evento de tenant SEM termos (RN-406 — sem fallback)
  batch.set(adminDb.collection('eventos').doc(EVENTO_SEM_TERMOS), {
    id: EVENTO_SEM_TERMOS, tenantId: PASSO_ID,
    organizadorId: PASSO_OWNER_UID, nome: 'Trail Run Ratones 2026',
    data: Timestamp.fromDate(new Date('2026-05-15T07:00:00-03:00')),
    local: 'Ratones, Florianópolis/SC', modalidades: ['11k'],
    slug: EVENTO_SEM_TERMOS, status: 'publicado', usaChip: false,
    qtdInscritos: 1, receitaConfirmada: 1200,
    criadoEm: now, atualizadoEm: now,
  });
  await batch.commit();

  await adminDb
    .collection('eventos').doc(EVENTO_SEM_TERMOS)
    .collection('inscritos').doc('insc-trail-1')
    .set({
      id: 'insc-trail-1', tenantId: PASSO_ID, atletaId: 'a1',
      atletaNome: 'Atleta Trail', kit: 'sem_kit', chipNumero: null,
      status: 'confirmado', modalidade: '11k',
      criadoEm: now, atualizadoEm: now,
    });

  await seedEventos(adminDb);
  await seedInscritos(adminDb); // 453 canônicos na meia-floripa
}

// SUITE-STAB: 453 inscritos por beforeEach = fonte pesada do storm de
// triggers; pausa no clear+seed + canários verificados (full5: evento sumia
// no meio — "expected undefined to be 452/1200"). Os testes chamam o core
// recomputarFinanceiroEvento DIRETO — nenhum depende de trigger do seed.
const SEED_CANARIES = [
  `tenants/${CASTELO_ID}`,
  `tenants/${CASTELO_ID}/commercialTerms/current`,
  `eventos/${MEIA_FLORIPA_ID}`,
  `eventos/${MEIA_FLORIPA_ID}/inscritos/insc-0453`,
  `eventos/${EVENTO_SEM_TERMOS}`,
  `eventos/${EVENTO_SEM_TERMOS}/inscritos/insc-trail-1`,
];

beforeEach(async () => {
  await withTriggersPaused(async () => {
    await clearFirestoreDrained(testEnv);
    await seedVerified(adminDb, testEnv, seedBase, SEED_CANARIES);
  });
}, 120_000);

/** Distribuição esperada, derivada do PRÓPRIO seed (sem número mágico). */
function distribuicaoEsperada() {
  const seeds = gerarInscritosSeed();
  const porStatus = { confirmado: 0, pendente: 0, cancelado: 0, estornado: 0 };
  const porKit = { kit_ouro: 0, kit_prata: 0, kit_basico: 0, sem_kit: 0 };
  const porModalidade: Record<string, number> = { '5k': 0, '10k': 0, '21k': 0 };
  for (const s of seeds) {
    porStatus[s.status] += 1;
    porKit[s.kit] += 1;
    porModalidade[s.modalidade] = (porModalidade[s.modalidade] ?? 0) + 1;
  }
  return { total: seeds.length, porStatus, porKit, porModalidade };
}

// ── Pura ───────────────────────────────────────────────────────────────────

describe('computeFinanceiro (pura — RN-406)', () => {
  it('deriva taxa e líquido do % do termo (canônico 85.617 · 10,5%)', () => {
    expect(computeFinanceiro(85617, 10.5)).toEqual({
      taxaPct: 10.5,
      taxaValor: 8989.79,
      receitaLiquida: 76627.21,
    });
  });

  it('sem termo (null) → tudo null, SEM fallback para default', () => {
    expect(computeFinanceiro(85617, null)).toEqual({
      taxaPct: null,
      taxaValor: null,
      receitaLiquida: null,
    });
  });

  it('taxa 0% (produtor-sócio, RN-405) é TERMO VÁLIDO — não "sem termo" (review #41)', () => {
    // Mata o mutante `taxaPct === null` → falsy: com 0%, taxa/líquido são
    // NÚMEROS (0 e o próprio bruto), nunca null — a tela não pode exibir o
    // falso alerta "sem termo" para tenant com fee zerado.
    expect(computeFinanceiro(85617, 0)).toEqual({
      taxaPct: 0,
      taxaValor: 0,
      receitaLiquida: 85617,
    });
  });
});

// ── Recomputação (integração) ──────────────────────────────────────────────

describe('recomputarFinanceiroEvento — agregado por Function (S207-T2)', () => {
  it('canônico: bruto 85.617, taxa 8.989,79, líquido 76.627,21, 453 inscritos', async () => {
    const fin = await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);
    const esperado = distribuicaoEsperada();

    expect(fin).not.toBeNull();
    expect(fin?.tenantId).toBe(CASTELO_ID);
    expect(fin?.receitaBruta).toBe(85617);
    expect(fin?.taxaPct).toBe(10.5);
    expect(fin?.taxaValor).toBe(8989.79);
    expect(fin?.receitaLiquida).toBe(76627.21);
    expect(fin?.inscritos.total).toBe(453);
    expect(fin?.inscritos.porKit).toEqual(esperado.porKit);
    expect(fin?.inscritos.porStatus).toEqual(esperado.porStatus);
    expect(fin?.inscritos.porModalidade).toEqual(esperado.porModalidade);

    // bruto = taxa + líquido (fecha exato em centavos)
    expect((fin?.taxaValor ?? 0) + (fin?.receitaLiquida ?? 0)).toBeCloseTo(
      fin?.receitaBruta ?? 0,
      2
    );

    // persistido em eventos/{id}/financeiro/current
    const docSnap = await adminDb
      .doc(`eventos/${MEIA_FLORIPA_ID}/financeiro/current`)
      .get();
    expect(docSnap.exists).toBe(true);
    expect(docSnap.get('receitaLiquida')).toBe(76627.21);
    expect(docSnap.get('atualizadoEm')).toBeTruthy();
  }, 30_000);

  it('IDEMPOTENTE: reprocessar produz o MESMO agregado (nada acumula)', async () => {
    const fin1 = await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);
    const fin2 = await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);
    expect(fin2).toEqual(fin1);

    const evento = await adminDb.doc(`eventos/${MEIA_FLORIPA_ID}`).get();
    expect(evento.get('qtdInscritos')).toBe(453); // sem drift
    expect(evento.get('receitaConfirmada')).toBe(85617); // fonte intocada
  }, 30_000);

  it('sincroniza ∑ qtdInscritos quando a fonte muda (inscrição removida)', async () => {
    await adminDb
      .doc(`eventos/${MEIA_FLORIPA_ID}/inscritos/insc-0001`)
      .delete();

    const fin = await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);
    expect(fin?.inscritos.total).toBe(452);

    const evento = await adminDb.doc(`eventos/${MEIA_FLORIPA_ID}`).get();
    expect(evento.get('qtdInscritos')).toBe(452);
  }, 30_000);

  it('CORRIDA (review #07): recomputes concorrentes + writes de inscrito nunca persistem doc inconsistente', async () => {
    const now = FieldValue.serverTimestamp();
    // Writes de inscrito interleaved com dois recomputes em paralelo — o
    // cenário do achado #07 (dois onInscritoWrite em corrida).
    const writesConcorrentes = (async () => {
      await adminDb.doc(`eventos/${MEIA_FLORIPA_ID}/inscritos/insc-0002`).delete();
      await adminDb.doc(`eventos/${MEIA_FLORIPA_ID}/inscritos/insc-race-1`).set({
        id: 'insc-race-1', tenantId: CASTELO_ID, atletaId: 'atl-race',
        atletaNome: 'Atleta Corrida', kit: 'kit_basico', chipNumero: null,
        status: 'confirmado', modalidade: '5k',
        criadoEm: now, atualizadoEm: now,
      });
    })();
    await Promise.all([
      recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID),
      recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID),
      writesConcorrentes,
    ]);

    // Invariante do doc persistido (tx snapshot): total = Σ porStatus SEMPRE,
    // mesmo que este retrato ainda não seja o estado final da subcoleção.
    const parcial = await adminDb
      .doc(`eventos/${MEIA_FLORIPA_ID}/financeiro/current`)
      .get();
    const porStatusParcial = parcial.get('inscritos.porStatus') as Record<string, number>;
    const somaParcial = Object.values(porStatusParcial).reduce((a, b) => a + b, 0);
    expect(parcial.get('inscritos.total')).toBe(somaParcial);

    // Convergência: o recompute seguinte (gatilho at-least-once) fecha com a fonte.
    const fin = await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);
    const real = (
      await adminDb.collection(`eventos/${MEIA_FLORIPA_ID}/inscritos`).count().get()
    ).data().count;
    expect(fin?.inscritos.total).toBe(real);
    const evento = await adminDb.doc(`eventos/${MEIA_FLORIPA_ID}`).get();
    expect(evento.get('qtdInscritos')).toBe(real);
  }, 30_000);

  it('tenant SEM termos: taxa/líquido null e bruto preservado (RN-406)', async () => {
    const fin = await recomputarFinanceiroEvento(adminDb, EVENTO_SEM_TERMOS);
    expect(fin?.receitaBruta).toBe(1200);
    expect(fin?.taxaPct).toBeNull();
    expect(fin?.taxaValor).toBeNull();
    expect(fin?.receitaLiquida).toBeNull();
    expect(fin?.inscritos.total).toBe(1);
    expect(fin?.inscritos.porModalidade).toEqual({ '11k': 1 });
  });

  it('evento inexistente → null (inscrito órfão não cria agregado)', async () => {
    expect(await recomputarFinanceiroEvento(adminDb, 'nao-existe')).toBeNull();
  });
});

// ── Rules: agregado financeiro fora do alcance do cliente ──────────────────

describe('Rules — financeiro/current é escrita exclusiva de Function', () => {
  function dbAs(uid: string, claims: Record<string, unknown>): Firestore {
    return testEnv
      .authenticatedContext(uid, claims)
      .firestore() as unknown as Firestore;
  }

  it('tenant_owner do PRÓPRIO evento NÃO escreve o agregado', async () => {
    const db = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertFails(
      setDoc(doc(db, 'eventos', MEIA_FLORIPA_ID, 'financeiro', 'current'), {
        receitaBruta: 999999, receitaLiquida: 999999,
      })
    );
  });

  it('tenant dono LÊ o agregado; outro tenant NÃO (RN-400)', async () => {
    await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);

    const marina = dbAs(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID });
    await assertSucceeds(
      getDoc(doc(marina, 'eventos', MEIA_FLORIPA_ID, 'financeiro', 'current'))
    );

    const passo = dbAs(PASSO_OWNER_UID, { role: 'tenant_owner', tenantId: PASSO_ID });
    await assertFails(
      getDoc(doc(passo, 'eventos', MEIA_FLORIPA_ID, 'financeiro', 'current'))
    );
  }, 30_000);
});

// ===========================================================================
// S825-T1 · a série por forma de pagamento e o dinheiro parado (E11 · leva 25)
//
// Integração REAL: os docs de `pagamentos` entram no Emulator e a série sai do
// mesmo laço que já apurava os carimbos TAXAFLEX. É aqui que se prova que a
// rosca do dono soma o que os pagamentos dizem — e não o que a tela supõe.
// ===========================================================================

describe('recomputarFinanceiroEvento — série por forma de pagamento (S825-T1)', () => {
  const TS = (): FirebaseFirestore.FieldValue => FieldValue.serverTimestamp();

  /** Escreve um pagamento cru do evento canônico (Function é a única escritora). */
  async function pagamento(
    id: string,
    forma: 'pix' | 'cartao_credito',
    status: string,
    valorFinal: number,
    extra: Record<string, unknown> = {}
  ): Promise<void> {
    await adminDb.collection('pagamentos').doc(id).set({
      id,
      tenantId: CASTELO_ID,
      eventoId: MEIA_FLORIPA_ID,
      pedidoRef: `ped-${id}`,
      status,
      forma,
      valorBase: valorFinal,
      desconto: 0,
      valorFinal,
      criadoEm: TS(),
      atualizadoEm: TS(),
      ...extra,
    });
  }

  it('soma contagem E valor por forma, só dos CONFIRMADOS', async () => {
    await pagamento('pag-pix-1', 'pix', 'confirmado', 200);
    await pagamento('pag-pix-2', 'pix', 'confirmado', 300);
    await pagamento('pag-card-1', 'cartao_credito', 'confirmado', 500);
    // Os três abaixo NÃO entram: pendente ainda não é dinheiro, cancelado
    // nunca foi, e estorno integral flipa o status e sai do Σ inteiro.
    await pagamento('pag-pix-pend', 'pix', 'pendente', 900);
    await pagamento('pag-pix-canc', 'pix', 'cancelado', 900);
    await pagamento('pag-card-est', 'cartao_credito', 'estornado', 900);

    const fin = await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);

    expect(fin?.formasPagamento).toEqual([
      { forma: 'cartao_credito', vendas: 1, valor: 500 },
      { forma: 'pix', vendas: 2, valor: 500 },
    ]);
  }, 30_000);

  it('estorno PARCIAL desconta do valor mas mantém a venda na contagem', async () => {
    // O pagamento segue confirmado; o que voltou ao comprador saiu do face.
    // Somar face cheio aqui faria a rosca somar mais que a receita da mesma
    // tela — é o desvio que esta asserção existe para pegar.
    await pagamento('pag-parcial', 'pix', 'confirmado', 1000, {
      estornadoTotal: 400,
    });

    const fin = await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);
    const pix = fin?.formasPagamento.find((f) => f.forma === 'pix');

    expect(pix).toEqual({ forma: 'pix', vendas: 1, valor: 600 });
  }, 30_000);

  it('nasce COMPLETA e na ordem canônica mesmo sem venda nenhuma', async () => {
    // Evento sem pagamento não devolve lista curta nem lista vazia: devolve a
    // resposta "zero em cada forma". É o que separa vazio honesto de "em
    // breve" lá na tela.
    const fin = await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);

    expect(fin?.formasPagamento).toEqual([
      { forma: 'cartao_credito', vendas: 0, valor: 0 },
      { forma: 'pix', vendas: 0, valor: 0 },
    ]);
  }, 30_000);

  it('pagamento de OUTRO tenant no mesmo evento fica fora (ADR-009)', async () => {
    await pagamento('pag-ok', 'pix', 'confirmado', 100);
    await adminDb.collection('pagamentos').doc('pag-invasor').set({
      id: 'pag-invasor',
      tenantId: PASSO_ID, // divergente do evento — isolamento multi-tenant
      eventoId: MEIA_FLORIPA_ID,
      pedidoRef: 'ped-invasor',
      status: 'confirmado',
      forma: 'pix',
      valorBase: 7777,
      desconto: 0,
      valorFinal: 7777,
      criadoEm: TS(),
      atualizadoEm: TS(),
    });

    const fin = await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);
    const pix = fin?.formasPagamento.find((f) => f.forma === 'pix');

    expect(pix).toEqual({ forma: 'pix', vendas: 1, valor: 100 });
  }, 30_000);

  it('doc com forma fora do enum não derruba o agregado — é ignorado', async () => {
    await pagamento('pag-bom', 'pix', 'confirmado', 100);
    await adminDb.collection('pagamentos').doc('pag-lixo').set({
      id: 'pag-lixo',
      tenantId: CASTELO_ID,
      eventoId: MEIA_FLORIPA_ID,
      pedidoRef: 'ped-lixo',
      status: 'confirmado',
      forma: 'boleto', // fora do domínio (decisão 2026-07-05)
      valorBase: 50,
      desconto: 0,
      valorFinal: 50,
      criadoEm: TS(),
      atualizadoEm: TS(),
    });

    // Um doc corrompido não pode travar o rollup do evento inteiro: o
    // agregado roda em lote e lançar aqui cegaria a tela por causa de um doc.
    const fin = await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);
    expect(fin?.formasPagamento.find((f) => f.forma === 'pix')?.valor).toBe(100);
  }, 30_000);

  it('IDEMPOTENTE: reprocessar produz a MESMA série (nada acumula)', async () => {
    await pagamento('pag-idem', 'cartao_credito', 'confirmado', 250);

    const primeira = await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);
    const segunda = await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);

    expect(segunda?.formasPagamento).toEqual(primeira?.formasPagamento);
    expect(
      segunda?.formasPagamento.find((f) => f.forma === 'cartao_credito')
    ).toEqual({ forma: 'cartao_credito', vendas: 1, valor: 250 });
  }, 30_000);

  it('pendências em R$ contam PAGAMENTOS pendentes, não inscritos (VG-INSIGHTS-3)', async () => {
    // Denominador próprio, de propósito: o alerta de pendências conta gente,
    // este número conta cobrança. O seed canônico tem 45 inscritos pendentes
    // e aqui existem 2 cobranças — os dois números são certos e diferentes.
    await pagamento('pag-pend-1', 'pix', 'pendente', 180);
    await pagamento('pag-pend-2', 'cartao_credito', 'pendente', 320);
    await pagamento('pag-conf', 'pix', 'confirmado', 400);

    const fin = await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);

    expect(fin?.pendentes).toEqual({ qtd: 2, valor: 500 });
    // O dinheiro parado NUNCA entra na série de confirmados.
    expect(fin?.formasPagamento.find((f) => f.forma === 'pix')?.valor).toBe(400);
  }, 30_000);

  it('sem cobrança pendente, o dinheiro parado é zero — nunca ausente', async () => {
    const fin = await recomputarFinanceiroEvento(adminDb, MEIA_FLORIPA_ID);
    expect(fin?.pendentes).toEqual({ qtd: 0, valor: 0 });
  }, 30_000);
});
