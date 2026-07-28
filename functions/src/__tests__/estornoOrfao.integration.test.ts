/**
 * estornoOrfao.integration.test.ts — LEELA-ESTORNO-T5 (item 27 · RN-379/380)
 *
 * ⚠️ EXIGE Firestore Emulator (8080). Nenhuma rede real: o gateway é um espião
 * em memória que CONTA os `POST /refund` emitidos e NÃO deduplica (o modelo
 * honesto do Asaas — sem idempotency-key HTTP para estorno).
 *
 * O que estas provas fecham (decisão do dono, item 27):
 *   1. confirmação que chega APÓS o cancelamento não é mais só "ignorada":
 *      o extrato registra (RN-380, mesma tx da entrega) e o estorno TOTAL
 *      dispara automaticamente (RN-379) — exatamente UM POST, amount omitido;
 *   2. segunda entrega retardatária (outro eventId) NÃO gera segundo POST —
 *      o carimbo do ledger órfão barra (RN-371);
 *   3. o webhook `PAYMENT_REFUNDED` fecha o ledger órfão ('aprovado') e
 *      resolve o extrato — a mesma autoridade do T1 (RN-372);
 *   4. a varredura agendada re-dispara o dispatch perdido (ledger ausente)
 *      e NÃO re-POSTa sobre carimbo vivo;
 *   5. refund 'approved' na resposta fecha tudo sem esperar webhook.
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { PaymentProvider, RefundParams, RefundResult } from '@leela/core';
import { processarWebhookPagamento, WEBHOOK_EVENTOS_SUBCOL } from '../checkout/webhookPagamento';
import {
  ESTORNOS_ORFAOS_SUBCOL,
  ESTORNO_ORFAO_DOC_ID,
  ORFAOS_PENDENTES_COL,
  refundOrfaoIdempotencyKey,
  varrerEstornosOrfaosCore,
} from '../checkout/estornarPagamentoOrfao';
import { MockPaymentProvider, buildMockWebhookPayload } from '../payments/mockProvider';

const PROJECT_ID = 'demo-leela-estorno-orfao';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-orfao';

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Gateway espião — conta POSTs; roteiriza o desfecho; devolve TOTAL quando
// `amount` vem omitido (o contrato do refund total do PaymentProvider).
// ---------------------------------------------------------------------------

type RoteiroRefund = { tipo: 'approved' } | { tipo: 'pending' };

class GatewayEspiao implements PaymentProvider {
  readonly base = new MockPaymentProvider();
  posts: RefundParams[] = [];
  roteiro: RoteiroRefund[] = [];
  /** Total (centavos) devolvido quando `amount` é omitido — o refund TOTAL. */
  totalCobradoCentavos = 0;
  private refundSeq = 0;

  createCharge: PaymentProvider['createCharge'] = (p) => this.base.createCharge(p);
  cancelCharge: PaymentProvider['cancelCharge'] = (p) => this.base.cancelCharge(p);
  splitRules: PaymentProvider['splitRules'] = (p) => this.base.splitRules(p);
  handleWebhook: PaymentProvider['handleWebhook'] = (p) => this.base.handleWebhook(p);
  getPayout: PaymentProvider['getPayout'] = (p) => this.base.getPayout(p);

  async refund(params: RefundParams): Promise<RefundResult> {
    this.posts.push(params);
    const passo = this.roteiro.shift() ?? { tipo: 'pending' as const };
    this.refundSeq += 1;
    return {
      refundId: `esp_refund_orfao_${this.refundSeq}`,
      chargeId: params.chargeId,
      status: passo.tipo,
      amount: params.amount ?? this.totalCobradoCentavos,
      processedAt: Timestamp.now() as unknown as RefundResult['processedAt'],
    };
  }
}

let gateway: GatewayEspiao;

// ---------------------------------------------------------------------------
// Fixture — pedido/pagamento CANCELADOS (o cenário do PIX expirado), com a
// cobrança criada no gateway para a entrega assinada casar chargeId/valor.
// ---------------------------------------------------------------------------

let seq = 0;

interface Fixture {
  pedidoId: string;
  pagamentoId: string;
  chargeId: string;
  totalCentavos: number;
}

async function criarPedidoCancelado(totalCobrado = 189.9): Promise<Fixture> {
  seq += 1;
  const pedidoId = `ped-orfao-${seq}`;
  const pagamentoId = `pag-orfao-${seq}`;
  const totalCentavos = Math.round(totalCobrado * 100);
  gateway.totalCobradoCentavos = totalCentavos;
  const now = FieldValue.serverTimestamp();

  const charge = await gateway.base.createCharge({
    orderId: pedidoId,
    tenantId: TENANT_ID,
    amount: totalCentavos,
    paymentMethod: 'pix',
    customer: { name: 'Comprador Teste', email: `o${seq}@ex.com`, taxId: '11144477735' },
    items: [{ id: 'linha-1', description: 'Inscrição', amount: totalCentavos, quantity: 1 }],
    idempotencyKey: `charge-${pedidoId}`,
  });

  const batch = db.batch();
  batch.set(db.collection('pedidos').doc(pedidoId), {
    id: pedidoId,
    tenantId: TENANT_ID,
    eventoId: EVENTO_ID,
    status: 'cancelado',
    pagamentoRef: pagamentoId,
    inscritoRefs: [],
    itens: [],
    valorFinal: totalCobrado,
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(db.collection('pagamentos').doc(pagamentoId), {
    id: pagamentoId,
    tenantId: TENANT_ID,
    eventoId: EVENTO_ID,
    pedidoRef: pedidoId,
    status: 'cancelado',
    forma: 'pix',
    valorFinal: totalCobrado,
    gatewayChargeId: charge.chargeId,
    gatewayAmountCentavos: totalCentavos,
    criadoEm: now,
    atualizadoEm: now,
  });
  await batch.commit();

  return { pedidoId, pagamentoId, chargeId: charge.chargeId, totalCentavos };
}

/** Entrega assinada de CONFIRMAÇÃO (a retardatária, no pagamento cancelado). */
async function entregarConfirmacao(fx: Fixture, eventId: string) {
  const payload = buildMockWebhookPayload('charge.confirmed', {
    chargeId: fx.chargeId,
    orderId: fx.pedidoId,
    amount: fx.totalCentavos,
    eventId,
  });
  return processarWebhookPagamento(db, gateway, payload);
}

/** Entrega assinada de ESTORNO (`PAYMENT_REFUNDED` do mock). */
async function entregarRefunded(
  fx: Fixture,
  opts: { eventId: string; refundId?: string; refundAmount?: number }
) {
  const payload = buildMockWebhookPayload('charge.refunded', {
    chargeId: fx.chargeId,
    orderId: fx.pedidoId,
    amount: fx.totalCentavos,
    eventId: opts.eventId,
    ...(opts.refundId !== undefined ? { refundId: opts.refundId } : {}),
    ...(opts.refundAmount !== undefined ? { refundAmount: opts.refundAmount } : {}),
  });
  return processarWebhookPagamento(db, gateway, payload);
}

const ledgerOrfaoRef = (pagamentoId: string) =>
  db
    .collection('pagamentos')
    .doc(pagamentoId)
    .collection(ESTORNOS_ORFAOS_SUBCOL)
    .doc(ESTORNO_ORFAO_DOC_ID);

const extratoRef = (pagamentoId: string) =>
  db.collection(ORFAOS_PENDENTES_COL).doc(pagamentoId);

beforeAll(async () => {
  process.env['FIRESTORE_EMULATOR_HOST'] =
    process.env['FIRESTORE_EMULATOR_HOST'] ?? '127.0.0.1:8080';
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules: readFileSync(RULES_PATH, 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  if (admin.apps.length === 0) admin.initializeApp({ projectId: PROJECT_ID });
  db = admin.firestore();
}, 60_000);

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  gateway = new GatewayEspiao();
});

describe('retardatário (item 27): confirmação após cancelamento', () => {
  it('registra no extrato, dispara UM refund TOTAL e aguarda o webhook', async () => {
    const fx = await criarPedidoCancelado();
    gateway.roteiro = [{ tipo: 'pending' }];

    const r = await entregarConfirmacao(fx, 'late-1');
    expect(r.ignorado).toBe(true);
    expect(r.motivo).toBe('retardatario_pos_cancelamento');
    expect(r.estornoOrfao).toBe(true);

    // A entrega ficou no ledger de webhooks com o efeito HONESTO (não é mais
    // 'ignorado_estado_final' — foi detectada e tratada).
    const entrega = await db
      .collection('pagamentos')
      .doc(fx.pagamentoId)
      .collection(WEBHOOK_EVENTOS_SUBCOL)
      .doc('late-1')
      .get();
    expect(entrega.get('efeito')).toBe('retardatario_pos_cancelamento');

    // Extrato (RN-380): nasceu na MESMA tx da entrega, ainda não resolvido.
    const extrato = await extratoRef(fx.pagamentoId).get();
    expect(extrato.exists).toBe(true);
    expect(extrato.get('resolvido')).toBe(false);

    // EXATAMENTE um POST, TOTAL (amount omitido) e chave determinística.
    expect(gateway.posts).toHaveLength(1);
    expect(gateway.posts[0]?.amount).toBeUndefined();
    expect(gateway.posts[0]?.idempotencyKey).toBe(refundOrfaoIdempotencyKey(fx.pagamentoId));

    // 'pending' do gateway ⇒ carimbo 'solicitado'; quem fecha é o webhook
    // (RN-372). O pagamento segue 'cancelado' — nenhum efeito local.
    const ledger = await ledgerOrfaoRef(fx.pagamentoId).get();
    expect(ledger.get('status')).toBe('solicitado');
    expect(ledger.get('valorCentavos')).toBe(fx.totalCentavos);
    const pagamento = await db.collection('pagamentos').doc(fx.pagamentoId).get();
    expect(pagamento.get('status')).toBe('cancelado');
  });

  it('segunda entrega retardatária NÃO re-POSTa sobre carimbo vivo (RN-371)', async () => {
    const fx = await criarPedidoCancelado();
    gateway.roteiro = [{ tipo: 'pending' }];
    await entregarConfirmacao(fx, 'late-1');
    expect(gateway.posts).toHaveLength(1);

    const r2 = await entregarConfirmacao(fx, 'late-2');
    expect(r2.motivo).toBe('retardatario_pos_cancelamento');
    // O extrato ACUMULA a segunda entrega; o gateway NÃO vê segundo POST.
    expect(gateway.posts).toHaveLength(1);
    const extrato = await extratoRef(fx.pagamentoId).get();
    expect(extrato.get('entregas')).toBe(2);
    const ledger = await ledgerOrfaoRef(fx.pagamentoId).get();
    expect(ledger.get('status')).toBe('solicitado');
  });

  it('PAYMENT_REFUNDED fecha o ledger órfão e resolve o extrato (RN-372)', async () => {
    const fx = await criarPedidoCancelado();
    gateway.roteiro = [{ tipo: 'pending' }];
    await entregarConfirmacao(fx, 'late-1');
    const refundId = (await ledgerOrfaoRef(fx.pagamentoId).get()).get('refundId') as string;

    const r = await entregarRefunded(fx, {
      eventId: 'refund-1',
      refundId,
      refundAmount: fx.totalCentavos,
    });
    // O T1 não tinha carimbo (não há ledger por inscrito) — o fechamento é do
    // ÓRFÃO, pela mesma autoridade.
    expect(r.estornoConfirmado?.motivo).toBe('sem_carimbo_vivo');
    expect(r.estornoOrfaoConfirmado?.aplicado).toBe(true);
    expect(r.estornoOrfaoConfirmado?.motivo).toBe('confirmado');

    const ledger = await ledgerOrfaoRef(fx.pagamentoId).get();
    expect(ledger.get('status')).toBe('aprovado');
    const extrato = await extratoRef(fx.pagamentoId).get();
    expect(extrato.get('resolvido')).toBe(true);
    const pagamento = await db.collection('pagamentos').doc(fx.pagamentoId).get();
    expect(pagamento.get('estornoOrfaoRefundId')).toBe(refundId);

    // Replay da MESMA entrega: ledger de webhooks barra, zero efeito novo.
    const replay = await entregarRefunded(fx, { eventId: 'refund-1', refundId });
    expect(replay.duplicado).toBe(true);
    expect(gateway.posts).toHaveLength(1);
  });

  it('varredura re-dispara dispatch perdido e NÃO re-POSTa carimbo vivo (RN-380)', async () => {
    // Dispatch "morreu" antes do POST: extrato registrado, ledger AUSENTE —
    // é o estado que a varredura existe para pagar.
    const fx = await criarPedidoCancelado();
    await extratoRef(fx.pagamentoId).set({
      pagamentoId: fx.pagamentoId,
      pedidoId: fx.pedidoId,
      chargeId: fx.chargeId,
      entregaEventId: 'late-morto',
      amountCentavos: fx.totalCentavos,
      tenantId: TENANT_ID,
      resolvido: false,
      entregas: 1,
      detectadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    gateway.roteiro = [{ tipo: 'pending' }];
    const r1 = await varrerEstornosOrfaosCore(db, gateway);
    expect(r1.pendentes).toBe(1);
    expect(r1.disparados).toBe(1);
    expect(gateway.posts).toHaveLength(1);
    expect((await ledgerOrfaoRef(fx.pagamentoId).get()).get('status')).toBe('solicitado');

    // Segunda varredura: carimbo vivo ⇒ aguarda webhook, NENHUM POST novo.
    const r2 = await varrerEstornosOrfaosCore(db, gateway);
    expect(r2.disparados).toBe(0);
    expect(r2.aguardandoWebhook).toBe(1);
    expect(gateway.posts).toHaveLength(1);
  });

  it("refund 'approved' na resposta fecha ledger e extrato sem webhook", async () => {
    const fx = await criarPedidoCancelado();
    gateway.roteiro = [{ tipo: 'approved' }];

    await entregarConfirmacao(fx, 'late-1');
    expect(gateway.posts).toHaveLength(1);
    const ledger = await ledgerOrfaoRef(fx.pagamentoId).get();
    expect(ledger.get('status')).toBe('aprovado');
    const extrato = await extratoRef(fx.pagamentoId).get();
    expect(extrato.get('resolvido')).toBe(true);

    // Varredura depois: nada pendente, nada disparado.
    const r = await varrerEstornosOrfaosCore(db, gateway);
    expect(r.pendentes).toBe(0);
    expect(r.disparados).toBe(0);
    expect(gateway.posts).toHaveLength(1);
  });
});
