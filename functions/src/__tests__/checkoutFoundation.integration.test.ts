/**
 * checkoutFoundation.integration.test.ts — LEELA-E12 (fundação do checkout)
 *
 * Integração (⚠️ EXIGE Firestore Emulator na 8080 — gate CONSOLIDADO do
 * maestro, NÃO roda no gate serial da task): fluxo de checkout de ponta a
 * ponta SEM gateway real — createInscricaoCharge (pedido ADR-011 + cobrança
 * sandbox) → webhook assinado (única porta de confirmação) → agregação.
 *
 * Cobre (aceite E12):
 *   - createInscricaoCharge cria pedido/pagamento/inscritos 'pendentes' que
 *     PASSAM nos parses fail-fast do core (contrato provado, não assumido)
 *   - REPLAY (mesma idempotencyKey) não duplica pedido/inscritos/cobrança
 *   - webhook confirmado: pedido pago, pagamento confirmado, inscritos
 *     confirmados, receitaConfirmada += valorFinal, cupom.usos += 1
 *   - REPROCESSAR o MESMO webhook (mesmo eventId) → zero efeito (ledger)
 *   - eventId NOVO sobre estado final → zero efeito (guarda de transição)
 *   - assinatura inválida / valor divergente → rejeitado SEM escrita
 *   - charge.failed → pedido/pagamento 'falhou', inscritos pendentes,
 *     receita intocada
 *   - agregarFinanceiro (recomputarFinanceiroEvento) fecha com o termo
 *
 * Pré-requisito: Firestore Emulator (8080) via emulators:exec.
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  parseInscrito,
  parsePagamento,
  parsePedido,
  pedidoCoerenteComPagamento,
  pedidoDoInscritoCoerente,
  roundMoney,
} from '@leela/core';
import {
  createInscricaoChargeCore,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import {
  processarWebhookPagamento,
  WebhookRejeitadoError,
  WEBHOOK_EVENTOS_SUBCOL,
} from '../checkout/webhookPagamento';
import { MockPaymentProvider, buildMockWebhookPayload } from '../payments/mockProvider';
import { recomputarFinanceiroEvento } from '../eventos/agregarFinanceiro';

const PROJECT_ID = 'demo-leela-e12';

const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-2026';
const ANA_UID = 'uid-ana-atleta';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

/** Um provider sandbox por suíte — mesmo processo, estado em memória. */
const provider = new MockPaymentProvider();

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: 'localhost', port: 8080 },
  });
  await testEnv.clearFirestore();
  if (!admin.apps.length) {
    process.env['FIRESTORE_EMULATOR_HOST'] = 'localhost:8080';
    admin.initializeApp({ projectId: PROJECT_ID });
  }
  db = admin.firestore();
  await seedBase();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

/** Janelas RELATIVAS a agora — o lote 2 está SEMPRE vigente no run. */
const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (deltaDias: number): Timestamp =>
  Timestamp.fromDate(new Date(Date.now() + deltaDias * DIA_MS));

async function seedBase(): Promise<void> {
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();

  batch.set(db.collection('tenants').doc(TENANT_ID), {
    id: TENANT_ID, nome: 'Castelo Produções', slug: TENANT_ID,
    status: 'ativo', ownerUid: 'uid-marina-castelo', tipo: 'produtor',
    criadoEm: now, atualizadoEm: now,
  });
  // Termo da Castelo (RN-406 — taxa/parcelamento SEMPRE do termo)
  batch.set(db.doc(`tenants/${TENANT_ID}/commercialTerms/current`), {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 20 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
    versao: 1, atualizadoPor: 'seed', atualizadoEm: now,
  });

  const eventoRef = db.collection('eventos').doc(EVENTO_ID);
  batch.set(eventoRef, {
    id: EVENTO_ID, tenantId: TENANT_ID, organizadorId: 'uid-marina-castelo',
    nome: 'Meia Maratona Floripa 2026',
    data: tsRel(45), local: 'Florianópolis/SC',
    modalidades: ['5k', '10k', '21k'],
    slug: EVENTO_ID, status: 'publicado', usaChip: true,
    qtdInscritos: 0, receitaConfirmada: 0,
    criadoEm: now, atualizadoEm: now,
  });

  // Lote VIGENTE da 10k (janela relativa: começou ontem, fecha em 30 dias)
  batch.set(eventoRef.collection('lotes').doc('10k-l2'), {
    id: '10k-l2', tenantId: TENANT_ID, modalidade: '10k', ordem: 2,
    nome: 'Lote 2', inicioEm: tsRel(-1), fimEm: tsRel(30),
    quantidadeLimite: 100, preco: 189.9, vendidos: 40,
    criadoEm: now, atualizadoEm: now,
  });

  // Cupom percentual vigente (docId = código normalizado — E04)
  batch.set(eventoRef.collection('cupons').doc('HEROI10'), {
    id: 'HEROI10', tenantId: TENANT_ID, codigo: 'HEROI10',
    tipo: 'percentual', valor: 10, tetoUso: 100,
    inicioEm: tsRel(-1), fimEm: tsRel(30), usos: 0,
    criadoEm: now, atualizadoEm: now,
  });

  await batch.commit();
}

// ---------------------------------------------------------------------------
// Fixtures do pedido em grupo (responsável + 1 convidado, cupom, PIX)
// ---------------------------------------------------------------------------

const KEY_1 = 'chk-e12-grupo-0001';
const INPUT_GRUPO: CreateInscricaoChargeInput = {
  eventoId: EVENTO_ID,
  inscritos: [
    { nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25', modalidade: '10k' },
    { nome: 'Bruno Lima', email: 'bruno@exemplo.com', cpf: '52998224725', modalidade: '10k', kit: 'kit_prata' },
  ],
  responsavelIndex: 0,
  responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
  forma: 'pix',
  parcelas: 1,
  cupomCodigo: 'heroi10', // minúsculo de propósito — servidor normaliza
  idempotencyKey: KEY_1,
};

// Valores esperados: 2 × 189,90 = 379,80 · −10% = 37,98 · final 341,82
const VALOR_FINAL = 341.82;
const AMOUNT_CENTAVOS = 34182;

const caller = { uid: ANA_UID };

// ---------------------------------------------------------------------------
// Saga: criação → replay → confirmação → replays de webhook → agregado
// ---------------------------------------------------------------------------

describe('E12 · createInscricaoCharge (produtor de escrita do checkout)', () => {
  let pedidoId = '';
  let pagamentoId = '';
  let chargeId = '';

  it('cria pedido/pagamento/inscritos PENDENTES que passam nos parses do core', async () => {
    const r = await createInscricaoChargeCore(db, provider, INPUT_GRUPO, caller);
    pedidoId = r.pedidoId;
    pagamentoId = r.pagamentoId;
    chargeId = r.chargeId;

    expect(r.statusPedido).toBe('pendente');
    expect(r.inscritoIds).toHaveLength(2);
    expect(r.paymentUrl).toMatch(/^https:\/\/mock\.leela\.app\/pay\//);
    expect(r.valores).toMatchObject({
      valorBase: 379.8, desconto: 37.98, valorFinal: VALOR_FINAL,
      totalCobrado: VALOR_FINAL, parcelas: 1,
    });

    // Contrato PROVADO pelos parses fail-fast (dinheiro fora do contrato lança)
    const pedidoSnap = await db.doc(`pedidos/${pedidoId}`).get();
    const pedido = parsePedido(pedidoSnap.id, pedidoSnap.data() ?? {});
    expect(pedido.status).toBe('pendente');
    expect(pedido.valorTotal).toBe(VALOR_FINAL);
    expect(pedido.inscritoRefs).toEqual(r.inscritoIds);
    expect(pedido.pagamentoRef).toBe(pagamentoId);
    expect(pedido.responsavel.atletaId).toBe(ANA_UID);
    // Decomposição POR INSCRITO (re-review A2): 2 × 189,90 com −10% rateado
    // cent-exato (18,99 cada) — a linha que a máquina de reembolso (S904) lê
    expect(pedido.itens).toEqual([
      { inscritoRef: r.inscritoIds[0], loteId: '10k-l2', valorBase: 189.9, desconto: 18.99, valorFinal: 170.91 },
      { inscritoRef: r.inscritoIds[1], loteId: '10k-l2', valorBase: 189.9, desconto: 18.99, valorFinal: 170.91 },
    ]);
    expect(roundMoney(pedido.itens.reduce((s, i) => s + i.valorFinal, 0))).toBe(
      pedido.valorTotal
    );
    // Espelho de parcelas NÃO existe no PIX (re-review A5)
    expect(pedido.formaPagamento).toBe('pix');
    expect(pedido.parcelas).toBeUndefined();

    const pagamentoSnap = await db.doc(`pagamentos/${pagamentoId}`).get();
    const pagamento = parsePagamento(pagamentoSnap.id, pagamentoSnap.data() ?? {});
    expect(pagamento.status).toBe('pendente');
    expect(pagamento.valorBase).toBe(379.8);
    expect(pagamento.desconto).toBe(37.98);
    expect(pagamento.valorFinal).toBe(VALOR_FINAL);
    expect(pagamento.cupom).toEqual({ codigo: 'HEROI10', descontoPct: 10 });
    expect(pagamento.loteId).toBe('10k-l2'); // lote único → espelhado
    expect(pagamentoSnap.get('gatewayChargeId')).toBe(chargeId);
    expect(pagamentoSnap.get('gatewayAmountCentavos')).toBe(AMOUNT_CENTAVOS);

    // Equação canônica A1 provada no PAR de docs (o que o slide-in carrega)
    expect(pedidoCoerenteComPagamento(pedido, pagamento)).toBe(true);

    const inscritosSnap = await db
      .collection(`eventos/${EVENTO_ID}/inscritos`)
      .where('pedidoRef', '==', pedidoId)
      .get();
    expect(inscritosSnap.size).toBe(2);
    for (const docSnap of inscritosSnap.docs) {
      const inscrito = parseInscrito(docSnap.id, docSnap.data());
      expect(inscrito.status).toBe('pendente');
      expect(pedidoDoInscritoCoerente(inscrito, pedido)).toBe(true);
    }
    const responsavel = inscritosSnap.docs
      .map((d) => parseInscrito(d.id, d.data()))
      .find((i) => i.ehResponsavel);
    expect(responsavel?.atletaId).toBe(ANA_UID);
    expect(responsavel?.kit).toBe('sem_kit');
  });

  it('REPLAY da mesma idempotencyKey: mesmos ids, mesma cobrança, NADA duplica', async () => {
    const r2 = await createInscricaoChargeCore(db, provider, INPUT_GRUPO, caller);
    expect(r2.pedidoId).toBe(pedidoId);
    expect(r2.pagamentoId).toBe(pagamentoId);
    expect(r2.chargeId).toBe(chargeId);

    const pedidos = await db.collection('pedidos').where('eventoId', '==', EVENTO_ID).get();
    expect(pedidos.size).toBe(1);
    const inscritos = await db
      .collection(`eventos/${EVENTO_ID}/inscritos`)
      .where('pedidoRef', '==', pedidoId)
      .get();
    expect(inscritos.size).toBe(2);
  });

  it('key reusada em OUTRO evento é rejeitada (guarda do replay)', async () => {
    await expect(
      createInscricaoChargeCore(db, provider, { ...INPUT_GRUPO, eventoId: 'outro-evento' }, caller)
    ).rejects.toThrow(/outro evento/);
  });

  it('webhook CONFIRMADO (assinado): pago + confirmados + receita + cupom.usos', async () => {
    const payload = buildMockWebhookPayload('charge.confirmed', {
      chargeId, orderId: pedidoId, amount: AMOUNT_CENTAVOS, eventId: 'evt-conf-1',
    });
    const r = await processarWebhookPagamento(db, provider, payload);
    expect(r).toMatchObject({ duplicado: false, ignorado: false, statusGateway: 'confirmed' });

    const pedido = parsePedido(pedidoId, (await db.doc(`pedidos/${pedidoId}`).get()).data() ?? {});
    expect(pedido.status).toBe('pago');

    const pagamento = parsePagamento(
      pagamentoId,
      (await db.doc(`pagamentos/${pagamentoId}`).get()).data() ?? {}
    );
    expect(pagamento.status).toBe('confirmado');
    expect(pagamento.pagoEm).toBeDefined();

    const inscritos = await db
      .collection(`eventos/${EVENTO_ID}/inscritos`)
      .where('pedidoRef', '==', pedidoId)
      .get();
    expect(inscritos.docs.map((d) => d.get('status'))).toEqual(['confirmado', 'confirmado']);

    const evento = await db.doc(`eventos/${EVENTO_ID}`).get();
    expect(evento.get('receitaConfirmada')).toBe(VALOR_FINAL);

    const cupom = await db.doc(`eventos/${EVENTO_ID}/cupons/HEROI10`).get();
    expect(cupom.get('usos')).toBe(1);

    // Ledger da entrega existe (prova da camada a de idempotência)
    const ledger = await db
      .doc(`pagamentos/${pagamentoId}/${WEBHOOK_EVENTOS_SUBCOL}/evt-conf-1`)
      .get();
    expect(ledger.exists).toBe(true);
    expect(ledger.get('efeito')).toBe('confirmado');
  });

  it('REPROCESSAR o MESMO webhook (mesmo eventId) → zero efeito (ledger)', async () => {
    const payload = buildMockWebhookPayload('charge.confirmed', {
      chargeId, orderId: pedidoId, amount: AMOUNT_CENTAVOS, eventId: 'evt-conf-1',
    });
    const r = await processarWebhookPagamento(db, provider, payload);
    expect(r.duplicado).toBe(true);

    const evento = await db.doc(`eventos/${EVENTO_ID}`).get();
    expect(evento.get('receitaConfirmada')).toBe(VALOR_FINAL); // NÃO duplicou
    const cupom = await db.doc(`eventos/${EVENTO_ID}/cupons/HEROI10`).get();
    expect(cupom.get('usos')).toBe(1);
  });

  it('eventId NOVO sobre estado FINAL → zero efeito (guarda de transição única)', async () => {
    const payload = buildMockWebhookPayload('charge.confirmed', {
      chargeId, orderId: pedidoId, amount: AMOUNT_CENTAVOS, eventId: 'evt-conf-2-replay-malicioso',
    });
    const r = await processarWebhookPagamento(db, provider, payload);
    expect(r.ignorado).toBe(true);
    expect(r.motivo).toBe('estado_ja_final');

    const evento = await db.doc(`eventos/${EVENTO_ID}`).get();
    expect(evento.get('receitaConfirmada')).toBe(VALOR_FINAL); // NÃO duplicou
  });

  it('assinatura INVÁLIDA → 401 sem NENHUMA escrita', async () => {
    const payload = buildMockWebhookPayload('charge.confirmed', {
      chargeId, orderId: pedidoId, amount: AMOUNT_CENTAVOS, eventId: 'evt-forjado',
    });
    const forjado = { ...payload, signature: 'deadbeef'.repeat(8) };

    await expect(processarWebhookPagamento(db, provider, forjado)).rejects.toThrowError(
      WebhookRejeitadoError
    );
    const ledger = await db
      .doc(`pagamentos/${pagamentoId}/${WEBHOOK_EVENTOS_SUBCOL}/evt-forjado`)
      .get();
    expect(ledger.exists).toBe(false);
  });

  it('valor DIVERGENTE (assinado) → 409 — assinatura válida não basta', async () => {
    const payload = buildMockWebhookPayload('charge.confirmed', {
      chargeId, orderId: pedidoId, amount: 1, eventId: 'evt-valor-errado',
    });
    await expect(processarWebhookPagamento(db, provider, payload)).rejects.toMatchObject({
      httpStatus: 409,
    });
  });

  it('agregarFinanceiro (REUSADO) fecha bruto→taxa→líquido com o termo', async () => {
    const financeiro = await recomputarFinanceiroEvento(db, EVENTO_ID);
    expect(financeiro).not.toBeNull();
    expect(financeiro?.receitaBruta).toBe(VALOR_FINAL);
    expect(financeiro?.taxaPct).toBe(10.5);
    expect(financeiro?.taxaValor).toBe(roundMoney(VALOR_FINAL * 0.105));
    expect(financeiro?.receitaLiquida).toBe(roundMoney(VALOR_FINAL - VALOR_FINAL * 0.105));
    expect(financeiro?.inscritos.porStatus.confirmado).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Caminho de FALHA do pagamento
// ---------------------------------------------------------------------------

describe('E12 · webhook charge.failed', () => {
  const KEY_2 = 'chk-e12-falha-0002';

  it('pedido/pagamento viram "falhou"; inscritos seguem pendentes; receita intocada', async () => {
    const input: CreateInscricaoChargeInput = {
      ...INPUT_GRUPO,
      inscritos: [INPUT_GRUPO.inscritos[0]!],
      idempotencyKey: KEY_2,
    };
    delete (input as Partial<CreateInscricaoChargeInput>).cupomCodigo;
    const r = await createInscricaoChargeCore(db, provider, input, caller);

    const receitaAntes = (await db.doc(`eventos/${EVENTO_ID}`).get()).get('receitaConfirmada');

    // amount do failed: 189,90 → 18990 centavos (1 inscrito, sem cupom)
    const payload = buildMockWebhookPayload('charge.failed', {
      chargeId: r.chargeId, orderId: r.pedidoId,
      amount: 18990, eventId: 'evt-fail-1',
    });

    const resultado = await processarWebhookPagamento(db, provider, payload);
    expect(resultado).toMatchObject({ duplicado: false, ignorado: false, statusGateway: 'failed' });

    const pedido = await db.doc(`pedidos/${r.pedidoId}`).get();
    expect(pedido.get('status')).toBe('falhou');
    const pagamento = await db.doc(`pagamentos/${r.pagamentoId}`).get();
    expect(pagamento.get('status')).toBe('falhou');

    const inscritos = await db
      .collection(`eventos/${EVENTO_ID}/inscritos`)
      .where('pedidoRef', '==', r.pedidoId)
      .get();
    expect(inscritos.docs.map((d) => d.get('status'))).toEqual(['pendente']);

    const receitaDepois = (await db.doc(`eventos/${EVENTO_ID}`).get()).get('receitaConfirmada');
    expect(receitaDepois).toBe(receitaAntes); // falha NUNCA agrega receita
  });
});
