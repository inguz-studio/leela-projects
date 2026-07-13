/**
 * repasseSaldo.integration.test.ts — LEELA-E09s-L2-T1
 *
 * `recomputarSaldoRepasse` (núcleo do trigger updateSaldoRepasse) contra o
 * Firestore Emulator com docs REAIS. Prova os aceites falsificáveis do brief:
 *   - evento NÃO encerrado, líquido 10.000, retenção 15% ⇒ retido=1500,
 *     disponivel=8500, vendidoBruto=bruto confirmado (RN-350/351);
 *   - evento.status='encerrado' ⇒ próximo recompute leva retido→0 e
 *     disponivel→10000 − comprometido;
 *   - IDEMPOTÊNCIA: recomputar 2× com o mesmo estado não muda o saldo e
 *     NÃO reescreve o doc (atualizadoEm intocado — no-op de verdade);
 *   - comprometido = Σ {solicitado,aprovado,pago}; recusado/cancelado
 *     DEVOLVEM ao disponível (RN-351/353);
 *   - janela D+N (RN-348) com fonte REAL: pagamento confirmado com pagoEm
 *     recente segura o líquido; antigo libera; outro tenant/pendente não
 *     contam; sem pagamentos (seed) ⇒ janela 0;
 *   - decisão #7: financeiro com receitaLiquida=null ⇒ eventosSemTermo,
 *     nada libera;
 *   - ATAQUE (regressão RN-357): cliente não escreve saldo/current.
 *
 * Pré-requisito: Firestore Emulator na 8080 (via emulators:exec).
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
import { Timestamp } from 'firebase-admin/firestore';
import { computeLiquidoProdutor } from '@leela/core';
import { recomputarSaldoRepasse } from '../finance/updateSaldoRepasse';

const PROJECT_ID = 'demo-leela';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');

const CASTELO_ID = 'castelo-producoes';
const PASSO_ID = 'passo-certo';
const MARINA_UID = 'uid-marina-castelo';
const EVENTO_ID = 'meia-floripa-2026';

const DIA_MS = 24 * 60 * 60 * 1000;

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

function termoValido(overrides: Record<string, unknown> = {}) {
  return {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao: 1,
    atualizadoPor: 'uid-platform-admin',
    atualizadoEm: new Date(),
    ...overrides,
  };
}

/** Evento mínimo + financeiro/current (E03 é quem escreve — seed direto). */
async function seedEvento(
  eventoId: string,
  tenantId: string,
  status: string,
  financeiro: { receitaBruta: number; receitaLiquida: number | null }
): Promise<void> {
  await db.collection('eventos').doc(eventoId).set({
    id: eventoId,
    tenantId,
    organizadorId: MARINA_UID,
    nome: 'Meia Maratona Floripa 2026',
    status,
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  });
  await db.doc(`eventos/${eventoId}/financeiro/current`).set({
    tenantId,
    receitaBruta: financeiro.receitaBruta,
    taxaPct: financeiro.receitaLiquida === null ? null : 10.5,
    taxaValor:
      financeiro.receitaLiquida === null
        ? null
        : financeiro.receitaBruta - financeiro.receitaLiquida,
    receitaLiquida: financeiro.receitaLiquida,
    inscritos: { total: 0, porStatus: {}, porKit: {}, porModalidade: {} },
    atualizadoEm: new Date(),
  });
}

async function seedRepasse(
  tenantId: string,
  id: string,
  valor: number,
  estado: string
): Promise<void> {
  await db.doc(`tenants/${tenantId}/repasses/${id}`).set({
    id,
    tenantId,
    valor,
    estado,
    dadosBancariosSnapshot: { contaMascarada: '****1234' },
    transicoes: [],
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  });
}

async function seedPagamento(
  id: string,
  tenantId: string,
  status: string,
  valorFinal: number,
  pagoEm: Date | null
): Promise<void> {
  await db.collection('pagamentos').doc(id).set({
    id,
    tenantId,
    eventoId: EVENTO_ID,
    status,
    valorFinal,
    ...(pagoEm !== null ? { pagoEm: Timestamp.fromDate(pagoEm) } : {}),
    criadoEm: new Date(),
  });
}

async function lerSaldo(tenantId: string) {
  const snap = await db.doc(`tenants/${tenantId}/saldo/current`).get();
  return snap.exists ? snap.data() : undefined;
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
  await db.collection('tenants').doc(CASTELO_ID).set({
    id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
    status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
    criadoEm: new Date(), atualizadoEm: new Date(),
  });
  await db.doc(`tenants/${CASTELO_ID}/commercialTerms/current`).set(termoValido());
});

afterAll(async () => {
  await testEnv?.cleanup();
});

describe('recomputarSaldoRepasse — RN-350/351 (aceite T1)', () => {
  it('evento não encerrado, líquido 10000, retenção 15% ⇒ retido 1500 / disponivel 8500 / vendidoBruto = bruto', async () => {
    await seedEvento(EVENTO_ID, CASTELO_ID, 'publicado', {
      receitaBruta: 12000,
      receitaLiquida: 10000,
    });

    const saldo = await recomputarSaldoRepasse(db, CASTELO_ID);

    expect(saldo).toEqual({
      vendidoBruto: 12000,
      retido: 1500,
      disponivel: 8500,
      comprometido: 0,
      dentroJanelaDN: 0,
      eventosSemTermo: 0,
    });
    const doc = await lerSaldo(CASTELO_ID);
    expect(doc).toMatchObject({ tenantId: CASTELO_ID, retido: 1500, disponivel: 8500 });
    expect(doc?.['atualizadoEm']).toBeTruthy();
  });

  it("evento 'encerrado' ⇒ retido→0 e disponivel→liquido − comprometido (RN-350)", async () => {
    await seedEvento(EVENTO_ID, CASTELO_ID, 'publicado', {
      receitaBruta: 12000,
      receitaLiquida: 10000,
    });
    await seedRepasse(CASTELO_ID, 'rep-001', 2000, 'solicitado');
    await recomputarSaldoRepasse(db, CASTELO_ID);

    await db.collection('eventos').doc(EVENTO_ID).update({ status: 'encerrado' });
    const saldo = await recomputarSaldoRepasse(db, CASTELO_ID);

    expect(saldo.retido).toBe(0);
    expect(saldo.disponivel).toBe(8000); // 10000 − 2000 comprometido
    expect(saldo.comprometido).toBe(2000);
  });

  it('IDEMPOTENTE: recomputar 2× com o mesmo estado não muda o saldo nem reescreve o doc', async () => {
    await seedEvento(EVENTO_ID, CASTELO_ID, 'publicado', {
      receitaBruta: 12000,
      receitaLiquida: 10000,
    });

    const primeiro = await recomputarSaldoRepasse(db, CASTELO_ID);
    const docApos1 = await lerSaldo(CASTELO_ID);
    const segundo = await recomputarSaldoRepasse(db, CASTELO_ID);
    const docApos2 = await lerSaldo(CASTELO_ID);

    expect(segundo).toEqual(primeiro);
    // no-op de verdade: nem o carimbo mudou (zero write na 2ª execução)
    expect(docApos2?.['atualizadoEm']).toEqual(docApos1?.['atualizadoEm']);
  });

  it('comprometido soma {solicitado,aprovado,pago}; recusado/cancelado DEVOLVEM (RN-351/353)', async () => {
    await seedEvento(EVENTO_ID, CASTELO_ID, 'publicado', {
      receitaBruta: 12000,
      receitaLiquida: 10000,
    });
    await seedRepasse(CASTELO_ID, 'rep-a', 1000, 'solicitado');
    await seedRepasse(CASTELO_ID, 'rep-b', 2000, 'aprovado');
    await seedRepasse(CASTELO_ID, 'rep-c', 3000, 'pago');
    await seedRepasse(CASTELO_ID, 'rep-d', 4000, 'recusado');
    await seedRepasse(CASTELO_ID, 'rep-e', 500, 'cancelado');

    const saldo = await recomputarSaldoRepasse(db, CASTELO_ID);

    expect(saldo.comprometido).toBe(6000); // 1000+2000+3000
    expect(saldo.disponivel).toBe(2500); // 8500 − 6000
  });

  it('disponivel NUNCA negativo — clamp 0 (RN-351)', async () => {
    await seedEvento(EVENTO_ID, CASTELO_ID, 'publicado', {
      receitaBruta: 12000,
      receitaLiquida: 10000,
    });
    await seedRepasse(CASTELO_ID, 'rep-a', 9000, 'pago'); // > 8500 liberado

    const saldo = await recomputarSaldoRepasse(db, CASTELO_ID);
    expect(saldo.disponivel).toBe(0);
    expect(saldo.comprometido).toBe(9000);
  });
});

describe('janela D+N (RN-348) — fonte REAL: pagamentos confirmados', () => {
  it('pagamento confirmado RECENTE segura o líquido; ANTIGO libera; pendente/outro tenant não contam', async () => {
    await seedEvento(EVENTO_ID, CASTELO_ID, 'publicado', {
      receitaBruta: 12000,
      receitaLiquida: 10000,
    });
    const agora = new Date();
    // dentro da janela (pagoEm = agora ⇒ 0 dias úteis decorridos < D+2)
    await seedPagamento('pag-recente', CASTELO_ID, 'confirmado', 1000, agora);
    // fora da janela (10 dias corridos ⇒ ≥ 6 dias úteis decorridos)
    await seedPagamento(
      'pag-antigo', CASTELO_ID, 'confirmado', 2000,
      new Date(agora.getTime() - 10 * DIA_MS)
    );
    // não contam: pendente, outro tenant, confirmado sem pagoEm
    await seedPagamento('pag-pendente', CASTELO_ID, 'pendente', 700, agora);
    await seedPagamento('pag-outro-tenant', PASSO_ID, 'confirmado', 900, agora);
    await seedPagamento('pag-sem-carimbo', CASTELO_ID, 'confirmado', 800, null);

    const saldo = await recomputarSaldoRepasse(db, CASTELO_ID, agora);

    const liquidoRecente = computeLiquidoProdutor(1000, 10.5);
    expect(saldo.dentroJanelaDN).toBe(liquidoRecente);
    expect(saldo.disponivel).toBe(8500 - liquidoRecente);
  });

  it('receita agregada SEM pagamentos materializados (seed) ⇒ janela 0 — nada fabricado', async () => {
    await seedEvento(EVENTO_ID, CASTELO_ID, 'publicado', {
      receitaBruta: 12000,
      receitaLiquida: 10000,
    });
    const saldo = await recomputarSaldoRepasse(db, CASTELO_ID);
    expect(saldo.dentroJanelaDN).toBe(0);
    expect(saldo.disponivel).toBe(8500);
  });
});

describe('decisão #7 — tenant sem termo', () => {
  it('financeiro com receitaLiquida=null ⇒ eventosSemTermo, nada libera, bruto ainda soma', async () => {
    await testEnv.clearFirestore();
    await db.collection('tenants').doc(CASTELO_ID).set({
      id: CASTELO_ID, nome: 'Castelo Produções', slug: CASTELO_ID,
      status: 'ativo', ownerUid: MARINA_UID, tipo: 'produtor',
      criadoEm: new Date(), atualizadoEm: new Date(),
    }); // SEM commercialTerms
    await seedEvento(EVENTO_ID, CASTELO_ID, 'publicado', {
      receitaBruta: 12000,
      receitaLiquida: null,
    });

    const saldo = await recomputarSaldoRepasse(db, CASTELO_ID);

    expect(saldo).toEqual({
      vendidoBruto: 12000,
      retido: 0,
      disponivel: 0,
      comprometido: 0,
      dentroJanelaDN: 0,
      eventosSemTermo: 1,
    });
  });
});

describe('fail-fast em dado corrompido (dinheiro nunca mascara)', () => {
  it('repasse com estado fora da union ⇒ recompute LANÇA (não silencia)', async () => {
    await seedEvento(EVENTO_ID, CASTELO_ID, 'publicado', {
      receitaBruta: 12000,
      receitaLiquida: 10000,
    });
    await seedRepasse(CASTELO_ID, 'rep-forjado', 100, 'liberado_hackeado');
    await expect(recomputarSaldoRepasse(db, CASTELO_ID)).rejects.toThrow(
      /estado fora da union/
    );
  });
});

describe('ATAQUE (regressão RN-357) — cliente nunca escreve saldo', () => {
  it('owner tenta gravar saldo/current inflado ⇒ Rules NEGAM', async () => {
    const ownerDb = testEnv
      .authenticatedContext(MARINA_UID, { role: 'tenant_owner', tenantId: CASTELO_ID })
      .firestore();
    await assertFails(
      setDoc(doc(ownerDb, `tenants/${CASTELO_ID}/saldo/current`), {
        tenantId: CASTELO_ID,
        vendidoBruto: 999999,
        retido: 0,
        disponivel: 999999,
        comprometido: 0,
        dentroJanelaDN: 0,
        eventosSemTermo: 0,
        atualizadoEm: new Date(),
      })
    );
  });
});
