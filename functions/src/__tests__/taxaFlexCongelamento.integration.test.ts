/**
 * taxaFlexCongelamento.integration.test.ts — LEELA-TAXAFLEX-T3
 * (RN-178/179/180/182 · ⚠️ EXIGE Firestore Emulator — porta LEELA_FS_EMU_PORT).
 *
 * Prova contra o Emulator (r6 8480 na lane):
 *   C1. Carimbo no ATO DA COMPRA: `pagamento.taxaCongelada` = linha resolvida
 *       override > global > legado, nos DOIS modos (incorporada carimba tb).
 *   C2. CONGELAMENTO: mudar a tabela NUNCA reprecifica pedido feito; replay
 *       da mesma chave não recomputa; chave NOVA pega a tabela nova.
 *   C3. Conciliação na CONFIRMAÇÃO copia o congelado (taxaPct/taxaFixa/
 *       taxaValor) — nunca re-resolve; repasseOrganizador MODE-AWARE
 *       (repassada = face; incorporada = face − taxa). parsePagamento
 *       round-trip passa (invariante mode-aware RN-182).
 *   C4. Agregado E09 HÍBRIDO: taxaValor = Σ carimbos + imputação % só no
 *       resto legado/seed; líquido coerente.
 *   C5. Saldo/janela D+N usa o líquido do CARIMBO quando presente.
 *
 * Rodar de functions/ (APÓS npm run build — lição RN-822):
 *   LEELA_FS_EMU_PORT=8480 LEELA_AUTH_EMU_PORT=9598 \
 *   JAVA_HOME=~/.jdks/jdk-21.0.11+10 npx firebase-tools@13 emulators:exec \
 *   --only firestore --config ../firebase.r6.json --project demo-leela \
 *   "npx vitest run src/__tests__/taxaFlexCongelamento.integration.test.ts"
 */
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  parsePagamento,
  roundMoney,
  type AuthClaims,
  type TabelaTaxaPlataforma,
} from '@leela/core';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import { processarWebhookPagamento } from '../checkout/webhookPagamento';
import { buildMockWebhookPayload, MockPaymentProvider } from '../payments/mockProvider';
import { setTaxaPlataformaGlobalCore } from '../platform/setTaxaPlataformaGlobal';
import { recomputarFinanceiroEvento } from '../eventos/agregarFinanceiro';
import { recomputarSaldoRepasse } from '../finance/updateSaldoRepasse';

const PORT = Number(process.env['LEELA_FS_EMU_PORT'] ?? 8080);
const HOST = 'localhost';
const PROJECT_ID = 'demo-leela';
const TENANT_ID = 'castelo-producoes';
const EVENTO_INC = 'taxaflex-evento-incorporada';
const EVENTO_REP = 'taxaflex-evento-repassada';
const ANA_UID = 'uid-ana-taxaflex';
const ADMIN_CALLER = {
  uid: 'uid-platform-admin',
  claims: { role: 'platform_admin' } as AuthClaims,
};

// Tabela GLOBAL v1 (a "de produção" do teste)
const TABELA_V1: TabelaTaxaPlataforma = {
  pix: { percentual: 6, fixoCentavos: 200 },
  cartao: { percentual: 8, fixoCentavos: 150 },
  boleto: { percentual: 4, fixoCentavos: 350 },
};
// Tabela v2 — a MUDANÇA que nunca pode reprecificar pedido feito
const TABELA_V2: TabelaTaxaPlataforma = {
  pix: { percentual: 10, fixoCentavos: 500 },
  cartao: { percentual: 12, fixoCentavos: 700 },
  boleto: { percentual: 4, fixoCentavos: 350 },
};

const FACE = 189.9;
// PIX global v1: round(18990 × 600/10000) = 1139c = 11,39 + 2,00 = 13,39
const TAXA_PIX_V1 = 13.39;
const TOTAL_PIX_V1 = roundMoney(FACE + TAXA_PIX_V1); // 203.29
const CENTAVOS_PIX_V1 = Math.round(TOTAL_PIX_V1 * 100); // 20329
// Cartão OVERRIDE do tenant {7%, R$1,00}: round(18990 × 700/10000) =
// round(1329,3) = 1329c = 13,29 + 1,00 = 14,29 (o override VENCE a global)
const TAXA_CARTAO_OVERRIDE = 14.29;
// PIX v2 (chave nova pós-mudança): round(18990 × 1000/10000) = 1899c + 500 = 23,99
const TAXA_PIX_V2 = 23.99;

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;
const provider = new MockPaymentProvider();

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp => Timestamp.fromDate(new Date(Date.now() + d * DIA_MS));

const inscritoAna = {
  nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25', modalidade: '10k',
};

const baseInput = (eventoId: string, key: string): CreateInscricaoChargeInput => ({
  eventoId,
  inscritos: [inscritoAna],
  responsavelIndex: 0,
  responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
  aceites: { termos: true, saude: true },
  forma: 'pix', parcelas: 1, idempotencyKey: key,
});

async function confirmar(pedidoId: string, chargeId: string, amount: number, eventId: string) {
  return processarWebhookPagamento(
    db,
    provider,
    buildMockWebhookPayload('charge.confirmed', { chargeId, orderId: pedidoId, amount, eventId })
  );
}

async function seed(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: 'uid-marina', tipo: 'produtor', criadoEm: now, atualizadoEm: now,
  });
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 20 },
    anticipation: { disponivel: false }, communityMonthlyEnabled: false, saasMonthlyFee: 0,
    // OVERRIDE por organizador (RN-178): SÓ a linha cartao negociada —
    // pix herda a GLOBAL (precedência por LINHA de meio).
    taxaTabela: { cartao: { percentual: 7, fixoCentavos: 100 } },
    versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
  });
  for (const [eventoId, taxaModo] of [
    [EVENTO_INC, undefined],
    [EVENTO_REP, 'repassada'],
  ] as const) {
    const eventoRef = db.collection('eventos').doc(eventoId);
    batch.set(eventoRef, {
      id: eventoId, tenantId: TENANT_ID, organizadorId: 'uid-marina',
      nome: `TAXAFLEX ${eventoId}`, data: tsRel(45), local: 'Florianópolis/SC',
      modalidades: ['10k'], slug: eventoId, status: 'publicado', usaChip: true,
      qtdInscritos: 0, receitaConfirmada: 0, criadoEm: now, atualizadoEm: now,
      ...(taxaModo !== undefined ? { taxaModo } : {}),
    });
    batch.set(eventoRef.collection('lotes').doc(`${eventoId}-10k-l2`), {
      id: `${eventoId}-10k-l2`, tenantId: TENANT_ID, modalidade: '10k', ordem: 2,
      nome: 'Lote 2', inicioEm: tsRel(-1), fimEm: tsRel(30),
      quantidadeLimite: 100, preco: FACE, vendidos: 40, criadoEm: now, atualizadoEm: now,
    });
  }
  await batch.commit();
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: HOST, port: PORT },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = `${HOST}:${PORT}`;
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
  delete process.env['ASAAS_API_KEY'];
  await seed();
  // Tabela GLOBAL via o MESMO callable de produção (RN-178/404)
  await setTaxaPlataformaGlobalCore(db, { taxaPlataforma: TABELA_V1 }, ADMIN_CALLER);
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

// =============================================================================
// C1 — Carimbo no ATO DA COMPRA (override > global > legado, nos dois modos)
// =============================================================================
describe('TAXAFLEX · C1 — taxaCongelada carimbada na criação', () => {
  it('repassada + PIX: linha GLOBAL {6%, R$2} carimbada; comprador paga face + 13,39', async () => {
    const charge = await createInscricaoChargeCore(
      db, provider, baseInput(EVENTO_REP, 'txf-c1-pix-0001'), { uid: ANA_UID });
    expect(charge.valores.taxaServico).toBe(TAXA_PIX_V1);
    expect(charge.valores.totalCobrado).toBe(TOTAL_PIX_V1);

    const pag = await db.collection('pagamentos').doc(charge.pagamentoId).get();
    expect(pag.get('gatewayAmountCentavos')).toBe(CENTAVOS_PIX_V1);
    expect(pag.get('taxaCongelada')).toEqual({
      meio: 'pix', percentual: 6, fixoCentavos: 200,
      valor: TAXA_PIX_V1, origem: 'global',
    });
  });

  it('repassada + cartão: OVERRIDE do tenant {7%, R$1} vence a global {8%, R$1,50}', async () => {
    const charge = await createInscricaoChargeCore(
      db, provider,
      { ...baseInput(EVENTO_REP, 'txf-c1-card-0001'), forma: 'cartao_credito', parcelas: 1 },
      { uid: ANA_UID });
    const pag = await db.collection('pagamentos').doc(charge.pagamentoId).get();
    expect(pag.get('taxaCongelada')).toEqual({
      meio: 'cartao', percentual: 7, fixoCentavos: 100,
      valor: TAXA_CARTAO_OVERRIDE, origem: 'override',
    });
  });

  it('incorporada TAMBÉM carimba (comprador paga face; a taxa sai do repasse)', async () => {
    const charge = await createInscricaoChargeCore(
      db, provider, baseInput(EVENTO_INC, 'txf-c1-inc-0001'), { uid: ANA_UID });
    expect(charge.valores.taxaServico).toBe(0);
    expect(charge.valores.totalCobrado).toBe(FACE);
    const pag = await db.collection('pagamentos').doc(charge.pagamentoId).get();
    expect(pag.get('gatewayAmountCentavos')).toBe(18990);
    expect(pag.get('taxaRepassada')).toBeUndefined();
    expect(pag.get('taxaCongelada')).toEqual({
      meio: 'pix', percentual: 6, fixoCentavos: 200,
      valor: TAXA_PIX_V1, origem: 'global',
    });
  });
});

// =============================================================================
// C2 + C3 — Congelamento vs mudança de tabela · conciliação copia o congelado
// =============================================================================
describe('TAXAFLEX · C2/C3 — mudar a tabela nunca reprecifica; conciliação congelada', () => {
  it('fluxo completo: compra → tabela MUDA → replay igual · chave nova = preço novo · confirmação carimba o VELHO', async () => {
    // Compra na tabela v1
    const antes = await createInscricaoChargeCore(
      db, provider, baseInput(EVENTO_REP, 'txf-c2-freeze-01'), { uid: ANA_UID });
    expect(antes.valores.totalCobrado).toBe(TOTAL_PIX_V1);

    // A plataforma MUDA a tabela (v2 — PIX 10% + R$5,00)
    await setTaxaPlataformaGlobalCore(db, { taxaPlataforma: TABELA_V2 }, ADMIN_CALLER);
    try {
      // REPLAY da mesma chave: NADA recomputa (RN-179)
      const replay = await createInscricaoChargeCore(
        db, provider, baseInput(EVENTO_REP, 'txf-c2-freeze-01'), { uid: ANA_UID });
      expect(replay.pedidoId).toBe(antes.pedidoId);
      expect(replay.valores.totalCobrado).toBe(TOTAL_PIX_V1);
      const pagAntes = await db.collection('pagamentos').doc(antes.pagamentoId).get();
      expect(pagAntes.get('gatewayAmountCentavos')).toBe(CENTAVOS_PIX_V1);
      expect((pagAntes.get('taxaCongelada') as { valor: number }).valor).toBe(TAXA_PIX_V1);

      // Chave NOVA: pega a tabela v2 (a mudança só afeta vendas FUTURAS)
      const depois = await createInscricaoChargeCore(
        db, provider, baseInput(EVENTO_REP, 'txf-c2-nova-0001'), { uid: ANA_UID });
      expect(depois.valores.taxaServico).toBe(TAXA_PIX_V2);
      expect(depois.valores.totalCobrado).toBe(roundMoney(FACE + TAXA_PIX_V2));

      // CONFIRMAÇÃO do pedido VELHO (pós-mudança): a conciliação copia o
      // CONGELADO — taxaPct 6 / taxaFixa 2,00 / taxaValor 13,39 — e o
      // repasse é o FACE (repassada). Nunca a tabela v2.
      const ok = await confirmar(
        antes.pedidoId, antes.chargeId, CENTAVOS_PIX_V1, 'evt-txf-freeze-ok');
      expect(ok.ignorado).toBe(false);
      const pagConf = await db.collection('pagamentos').doc(antes.pagamentoId).get();
      expect(pagConf.get('conciliacao')).toEqual({
        idTransacao: antes.chargeId,
        gateway: 'asaas',
        taxaPct: 6,
        taxaFixa: 2,
        taxaValor: TAXA_PIX_V1,
        repasseOrganizador: FACE, // repassada ⇒ face (RN-182)
      });

      // Round-trip do parse (invariante MODE-AWARE — RN-182): o doc
      // confirmado repassada passa no parsePagamento sem violar invariante.
      const parsed = parsePagamento(antes.pagamentoId, pagConf.data() as Record<string, unknown>);
      expect(parsed.conciliacao?.taxaValor).toBe(TAXA_PIX_V1);
      expect(parsed.taxaCongelada?.origem).toBe('global');
    } finally {
      // Restaura a v1 para os describes seguintes
      await setTaxaPlataformaGlobalCore(db, { taxaPlataforma: TABELA_V1 }, ADMIN_CALLER);
    }
  });

  it('incorporada: conciliação com repasse = face − taxa (RN-182) + parse ok', async () => {
    const charge = await createInscricaoChargeCore(
      db, provider, baseInput(EVENTO_INC, 'txf-c3-inc-0001'), { uid: ANA_UID });
    const ok = await confirmar(charge.pedidoId, charge.chargeId, 18990, 'evt-txf-inc-ok');
    expect(ok.ignorado).toBe(false);
    const pag = await db.collection('pagamentos').doc(charge.pagamentoId).get();
    expect(pag.get('conciliacao')).toEqual({
      idTransacao: charge.chargeId,
      gateway: 'asaas',
      taxaPct: 6,
      taxaFixa: 2,
      taxaValor: TAXA_PIX_V1,
      repasseOrganizador: roundMoney(FACE - TAXA_PIX_V1), // 176.51
    });
    const parsed = parsePagamento(charge.pagamentoId, pag.data() as Record<string, unknown>);
    expect(parsed.conciliacao?.repasseOrganizador).toBe(roundMoney(FACE - TAXA_PIX_V1));
  });
});

// =============================================================================
// C4 — Agregado E09 híbrido (Σ carimbos + imputação % só no resto)
// =============================================================================
describe('TAXAFLEX · C4 — financeiro/current híbrido por fatos', () => {
  it('evento 100% carimbado: taxaValor = Σ carimbos (sem imputação)', async () => {
    // EVENTO_INC tem 2 pagamentos confirmados (C1 não confirmou; C3 sim) —
    // estado atual: 1 confirmado carimbado de FACE/13,39 e receita = FACE.
    const fin = await recomputarFinanceiroEvento(db, EVENTO_INC);
    expect(fin).not.toBeNull();
    expect(fin?.receitaBruta).toBe(FACE);
    expect(fin?.taxaValor).toBe(TAXA_PIX_V1);
    expect(fin?.receitaLiquida).toBe(roundMoney(FACE - TAXA_PIX_V1)); // 176.51
    expect(fin?.taxaPct).toBe(10.5); // informativo (legado do termo)
  });

  it('receita seed SEM pagamento: híbrido = carimbo + % legado só no resto', async () => {
    // Injeta receita agregada sem transação (seed canônico) — o resto
    // legado usa a imputação % vigente; o carimbo continua exato.
    const eventoRef = db.collection('eventos').doc(EVENTO_INC);
    const receitaAtual = (await eventoRef.get()).get('receitaConfirmada') as number;
    await eventoRef.update({ receitaConfirmada: roundMoney(receitaAtual + 100) });
    try {
      const fin = await recomputarFinanceiroEvento(db, EVENTO_INC);
      // taxa = 13,39 (carimbo) + 10,5% × 100 (resto legado) = 23,89
      expect(fin?.taxaValor).toBe(roundMoney(TAXA_PIX_V1 + 10.5));
      expect(fin?.receitaLiquida).toBe(
        roundMoney(FACE + 100 - (TAXA_PIX_V1 + 10.5))
      );
    } finally {
      await eventoRef.update({ receitaConfirmada: receitaAtual });
      await recomputarFinanceiroEvento(db, EVENTO_INC);
    }
  });
});

// =============================================================================
// C5 — Saldo: janela D+N com o líquido do CARIMBO
// =============================================================================
describe('TAXAFLEX · C5 — dentroJanelaDN carimbo-aware', () => {
  it('transações confirmadas seguram o líquido REAL (pct+fixo), não a imputação', async () => {
    // Confirmados até aqui: INC 189,90 c/ taxa 13,39 (incorporada ⇒ líquido
    // 176,51) + REP 189,90 (repassada ⇒ líquido = face 189,90).
    // Ambos pagoEm = agora ⇒ DENTRO da janela D+2 úteis.
    const saldo = await recomputarSaldoRepasse(db, TENANT_ID);
    const esperado = roundMoney(roundMoney(FACE - TAXA_PIX_V1) + FACE); // 366.41
    expect(saldo.dentroJanelaDN).toBe(esperado);
    // A imputação % legada daria 169,96 + 189,90 = 359,86 — provaria a
    // fonte errada; o carimbo é a verdade da transação.
    expect(saldo.dentroJanelaDN).not.toBe(roundMoney(169.96 + FACE));
  });
});
