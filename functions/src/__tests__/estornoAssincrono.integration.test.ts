/**
 * estornoAssincrono.integration.test.ts — LEELA-ESTORNO-T1 (RN-348/349/350)
 *
 * ⚠️ EXIGE Firestore Emulator (8080). Nenhuma rede real: o gateway é um espião
 * em memória que CONTA os `POST /refund` emitidos.
 *
 * O que estas provas fecham (decisão 46 do dono + ASAASTETO-REV §V4, que
 * mediu DOIS POSTs para a mesma inscrição):
 *   1. refund `PENDING` não derruba a saga nem aplica efeito — vira carimbo
 *      'solicitado' e a autoridade passa ao webhook `PAYMENT_REFUNDED`;
 *   2. NUNCA sai um segundo POST sobre carimbo vivo — nem no caminho feliz
 *      assíncrono, nem depois de um timeout com efeito possível;
 *   3. a confirmação do webhook aplica o efeito EXATAMENTE uma vez, e é
 *      idempotente por entrega e por ledger;
 *   4. falha PROVADAMENTE sem efeito (4xx do gateway) devolve o ledger a
 *      'pendente' — retry legítimo continua possível.
 *
 * A suíte antiga provava a garantia do MOCK (que deduplica por chave
 * incondicionalmente); aqui o espião NÃO deduplica — quem tem de barrar o
 * segundo POST é o ledger durável.
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { roundMoney, type AuthClaims, type PaymentProvider, type RefundParams, type RefundResult } from '@leela/core';
import {
  ESTORNOS_SUBCOL,
  estornarInscricaoCore,
  confirmarEstornoPorWebhook,
} from '../checkout/estornarInscricao';
import { processarWebhookPagamento } from '../checkout/webhookPagamento';
import { MockPaymentProvider, buildMockWebhookPayload } from '../payments/mockProvider';
import { AsaasApiError, AsaasTimeoutError } from '../payments/asaasProvider';
import type { EventoCaller } from '../eventos/criarEvento';

const PROJECT_ID = 'demo-leela-estorno-async';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-async';
const MARINA_UID = 'uid-marina-async';

const organizador: EventoCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: TENANT_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Gateway espião — conta POSTs de refund e permite roteirizar o desfecho
// ---------------------------------------------------------------------------

type RoteiroRefund =
  | { tipo: 'approved' }
  | { tipo: 'pending' }
  | { tipo: 'rejected' }
  | { tipo: 'timeout' }
  | { tipo: 'erro'; err: Error }
  | { tipo: 'valorErrado'; centavos: number };

/**
 * Delegador que NÃO deduplica estornos: cada chamada a `refund` é um POST
 * contado. É o modelo honesto do Asaas (sem idempotency-key HTTP para
 * estorno — asaasProvider.ts:1164) e o único jeito de a prova valer.
 */
class GatewayEspiao implements PaymentProvider {
  readonly base = new MockPaymentProvider();
  posts: RefundParams[] = [];
  roteiro: RoteiroRefund[] = [];
  private refundSeq = 0;

  createCharge: PaymentProvider['createCharge'] = (p) => this.base.createCharge(p);
  cancelCharge: PaymentProvider['cancelCharge'] = (p) => this.base.cancelCharge(p);
  splitRules: PaymentProvider['splitRules'] = (p) => this.base.splitRules(p);
  handleWebhook: PaymentProvider['handleWebhook'] = (p) => this.base.handleWebhook(p);
  getPayout: PaymentProvider['getPayout'] = (p) => this.base.getPayout(p);

  async refund(params: RefundParams): Promise<RefundResult> {
    this.posts.push(params);
    const passo = this.roteiro.shift() ?? { tipo: 'approved' as const };
    if (passo.tipo === 'timeout') {
      throw new AsaasTimeoutError('POST', `/payments/${params.chargeId}/refund`, 15000);
    }
    if (passo.tipo === 'erro') throw passo.err;
    this.refundSeq += 1;
    const refundId = `esp_refund_${this.refundSeq}`;
    const amount =
      passo.tipo === 'valorErrado' ? passo.centavos : (params.amount ?? 0);
    const status =
      passo.tipo === 'pending' ? 'pending' : passo.tipo === 'rejected' ? 'rejected' : 'approved';
    return {
      refundId,
      chargeId: params.chargeId,
      status,
      amount,
      processedAt: Timestamp.now() as unknown as RefundResult['processedAt'],
    };
  }
}

let gateway: GatewayEspiao;

// ---------------------------------------------------------------------------
// Fixtures — pedido PAGO com N inscritos (docs diretos: a saga é o alvo)
// ---------------------------------------------------------------------------

const DIA_MS = 24 * 60 * 60 * 1000;
const tsRel = (d: number): Timestamp => Timestamp.fromDate(new Date(Date.now() + d * DIA_MS));

interface Fixture {
  pedidoId: string;
  pagamentoId: string;
  chargeId: string;
  inscritoIds: string[];
  valorLinha: number;
  valorTotal: number;
}

let seq = 0;

async function criarPedidoPago(qtd: number, valorLinha = 189.9): Promise<Fixture> {
  seq += 1;
  const pedidoId = `ped-async-${seq}`;
  const pagamentoId = `pag-async-${seq}`;
  const inscritoIds = Array.from({ length: qtd }, (_, i) => `insc-async-${seq}-${i}`);
  const valorTotal = roundMoney(valorLinha * qtd);
  const now = FieldValue.serverTimestamp();

  const charge = await gateway.base.createCharge({
    orderId: pedidoId,
    tenantId: TENANT_ID,
    amount: Math.round(valorTotal * 100),
    paymentMethod: 'pix',
    customer: { name: 'Comprador Teste', email: `c${seq}@ex.com`, taxId: '11144477735' },
    items: [
      {
        id: 'linha-1',
        description: 'Inscrição',
        amount: Math.round(valorLinha * 100),
        quantity: qtd,
      },
    ],
    idempotencyKey: `charge-${pedidoId}`,
  });

  const batch = db.batch();
  batch.set(db.collection('pedidos').doc(pedidoId), {
    id: pedidoId,
    tenantId: TENANT_ID,
    eventoId: EVENTO_ID,
    status: 'pago',
    pagamentoRef: pagamentoId,
    inscritoRefs: inscritoIds,
    itens: inscritoIds.map((id) => ({
      inscritoRef: id,
      modalidade: '10k',
      loteId: '10k-l2',
      valorFinal: valorLinha,
    })),
    valorFinal: valorTotal,
    criadoEm: now,
    atualizadoEm: now,
  });
  batch.set(db.collection('pagamentos').doc(pagamentoId), {
    id: pagamentoId,
    tenantId: TENANT_ID,
    eventoId: EVENTO_ID,
    pedidoRef: pedidoId,
    status: 'confirmado',
    forma: 'pix',
    valorFinal: valorTotal,
    gatewayChargeId: charge.chargeId,
    gatewayAmountCentavos: Math.round(valorTotal * 100),
    criadoEm: now,
    atualizadoEm: now,
  });
  const eventoRef = db.collection('eventos').doc(EVENTO_ID);
  for (const id of inscritoIds) {
    batch.set(eventoRef.collection('inscritos').doc(id), {
      id,
      tenantId: TENANT_ID,
      eventoId: EVENTO_ID,
      pedidoRef: pedidoId,
      status: 'confirmado',
      nome: 'Atleta Teste',
      modalidade: '10k',
      criadoEm: now,
      atualizadoEm: now,
    });
  }
  batch.update(eventoRef, { receitaConfirmada: FieldValue.increment(valorTotal) });
  await batch.commit();

  return {
    pedidoId,
    pagamentoId,
    chargeId: charge.chargeId,
    inscritoIds,
    valorLinha,
    valorTotal,
  };
}

const ledgerRef = (pagamentoId: string, inscritoId: string) =>
  db.collection('pagamentos').doc(pagamentoId).collection(ESTORNOS_SUBCOL).doc(inscritoId);

const inscritoRef = (inscritoId: string) =>
  db.collection('eventos').doc(EVENTO_ID).collection('inscritos').doc(inscritoId);

async function receitaConfirmada(): Promise<number> {
  const snap = await db.collection('eventos').doc(EVENTO_ID).get();
  return (snap.get('receitaConfirmada') as number) ?? 0;
}

/** Entrega assinada de estorno pela porta única (mock: `charge.refunded`). */
async function entregarWebhookEstorno(
  fx: Fixture,
  opts: { eventId: string; refundId?: string; refundAmount?: number }
) {
  const payload = buildMockWebhookPayload('charge.refunded', {
    chargeId: fx.chargeId,
    orderId: fx.pedidoId,
    amount: Math.round(fx.valorTotal * 100),
    eventId: opts.eventId,
    ...(opts.refundId !== undefined ? { refundId: opts.refundId } : {}),
    ...(opts.refundAmount !== undefined ? { refundAmount: opts.refundAmount } : {}),
  });
  return processarWebhookPagamento(db, gateway, payload);
}

beforeAll(async () => {
  process.env['FIRESTORE_EMULATOR_HOST'] = process.env['FIRESTORE_EMULATOR_HOST'] ?? '127.0.0.1:8080';
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
  const now = FieldValue.serverTimestamp();
  await db.collection('tenants').doc(TENANT_ID).set({
    id: TENANT_ID,
    nome: 'Castelo Produções',
    slug: TENANT_ID,
    status: 'ativo',
    ownerUid: MARINA_UID,
    tipo: 'produtor',
    criadoEm: now,
    atualizadoEm: now,
  });
  await db.collection('eventos').doc(EVENTO_ID).set({
    id: EVENTO_ID,
    tenantId: TENANT_ID,
    organizadorId: MARINA_UID,
    nome: 'Meia Floripa (assíncrono)',
    data: tsRel(45),
    slug: EVENTO_ID,
    status: 'publicado',
    qtdInscritos: 0,
    receitaConfirmada: 0,
    criadoEm: now,
    atualizadoEm: now,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. PENDING não derruba a saga e não aplica efeito (RN-350)
// ─────────────────────────────────────────────────────────────────────────────

describe('refund PENDING — o gateway aceitou e ainda não concluiu', () => {
  it('carimba solicitado com refundId, sem NENHUM efeito local', async () => {
    const fx = await criarPedidoPago(1);
    gateway.roteiro = [{ tipo: 'pending' }];
    const receitaAntes = await receitaConfirmada();

    const r = await estornarInscricaoCore(
      db,
      gateway,
      { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[0]!, motivo: 'PIX assíncrono' },
      organizador
    );

    expect(r.estado).toBe('solicitado');
    expect(r.aguardandoConfirmacao).toBe(true);
    expect(r.refundId).toBe('esp_refund_1');
    expect(r.duplicado).toBe(false);
    expect(r.pagamentoEstornadoIntegral).toBe(false);

    const ledger = await ledgerRef(fx.pagamentoId, fx.inscritoIds[0]!).get();
    expect(ledger.get('status')).toBe('solicitado');
    expect(ledger.get('refundId')).toBe('esp_refund_1');
    expect(ledger.get('tentativasEnvio')).toBe(1);

    // NADA de efeito: o dinheiro ainda não voltou segundo o gateway.
    expect((await inscritoRef(fx.inscritoIds[0]!).get()).get('status')).toBe('confirmado');
    expect(await receitaConfirmada()).toBe(receitaAntes);
    const pag = await db.collection('pagamentos').doc(fx.pagamentoId).get();
    expect(pag.get('estornadoTotal')).toBeUndefined();
    expect(pag.get('status')).toBe('confirmado');
    expect(gateway.posts.length).toBe(1);
  }, 60_000);

  it('SEGUNDA chamada sobre carimbo vivo NÃO emite segundo POST (RN-349)', async () => {
    const fx = await criarPedidoPago(1);
    gateway.roteiro = [{ tipo: 'pending' }];
    const input = { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[0]!, motivo: 'PIX assíncrono' };

    await estornarInscricaoCore(db, gateway, input, organizador);
    const r2 = await estornarInscricaoCore(db, gateway, input, organizador);

    expect(gateway.posts.length).toBe(1); // ⇦ o invariante de dinheiro
    expect(r2.estado).toBe('solicitado');
    expect(r2.aguardandoConfirmacao).toBe(true);
    expect(r2.duplicado).toBe(true);
    expect((await ledgerRef(fx.pagamentoId, fx.inscritoIds[0]!).get()).get('tentativasEnvio')).toBe(1);
  }, 60_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. O webhook é a AUTORIDADE (decisão 46)
// ─────────────────────────────────────────────────────────────────────────────

describe('webhook PAYMENT_REFUNDED fecha a saga — uma vez só', () => {
  it('aplica o efeito completo e leva o ledger a aprovado', async () => {
    const fx = await criarPedidoPago(1);
    gateway.roteiro = [{ tipo: 'pending' }];
    const receitaAntes = await receitaConfirmada();
    await estornarInscricaoCore(
      db,
      gateway,
      { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[0]!, motivo: 'PIX assíncrono' },
      organizador
    );

    const r = await entregarWebhookEstorno(fx, {
      eventId: 'evt-refund-1',
      refundId: 'esp_refund_1',
      refundAmount: Math.round(fx.valorLinha * 100),
    });

    expect(r.estornoConfirmado?.motivo).toBe('confirmado');
    expect(r.estornoConfirmado?.aplicado).toBe(true);
    expect((await inscritoRef(fx.inscritoIds[0]!).get()).get('status')).toBe('estornado');
    expect(await receitaConfirmada()).toBe(roundMoney(receitaAntes - fx.valorLinha));
    const ledger = await ledgerRef(fx.pagamentoId, fx.inscritoIds[0]!).get();
    expect(ledger.get('status')).toBe('aprovado');
    expect(ledger.get('refundId')).toBe('esp_refund_1');
    const pag = await db.collection('pagamentos').doc(fx.pagamentoId).get();
    expect(pag.get('status')).toBe('estornado');
    expect(pag.get('estornadoTotal')).toBe(fx.valorLinha);
    expect(gateway.posts.length).toBe(1);
  }, 60_000);

  it('replay da MESMA entrega não reverte a receita de novo (ledger de webhook)', async () => {
    const fx = await criarPedidoPago(1);
    gateway.roteiro = [{ tipo: 'pending' }];
    const receitaAntes = await receitaConfirmada();
    await estornarInscricaoCore(
      db,
      gateway,
      { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[0]!, motivo: 'PIX assíncrono' },
      organizador
    );
    await entregarWebhookEstorno(fx, { eventId: 'evt-dup', refundId: 'esp_refund_1' });
    const r2 = await entregarWebhookEstorno(fx, { eventId: 'evt-dup', refundId: 'esp_refund_1' });

    expect(r2.duplicado).toBe(true);
    expect(r2.estornoConfirmado).toBeUndefined();
    expect(await receitaConfirmada()).toBe(roundMoney(receitaAntes - fx.valorLinha));
  }, 60_000);

  it('entrega NOVA sobre ledger já aprovado não aplica efeito de novo', async () => {
    const fx = await criarPedidoPago(1);
    gateway.roteiro = [{ tipo: 'pending' }];
    const receitaAntes = await receitaConfirmada();
    await estornarInscricaoCore(
      db,
      gateway,
      { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[0]!, motivo: 'PIX assíncrono' },
      organizador
    );
    await entregarWebhookEstorno(fx, { eventId: 'evt-a', refundId: 'esp_refund_1' });
    const r2 = await entregarWebhookEstorno(fx, { eventId: 'evt-b', refundId: 'esp_refund_1' });

    expect(r2.estornoConfirmado?.motivo).toBe('ja_aprovado');
    expect(r2.estornoConfirmado?.aplicado).toBe(false);
    expect(await receitaConfirmada()).toBe(roundMoney(receitaAntes - fx.valorLinha));
  }, 60_000);

  it('em pedido de GRUPO fecha só o inscrito do refundId da entrega', async () => {
    const fx = await criarPedidoPago(3);
    gateway.roteiro = [{ tipo: 'pending' }, { tipo: 'pending' }];
    const receitaAntes = await receitaConfirmada();
    await estornarInscricaoCore(
      db,
      gateway,
      { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[0]!, motivo: 'Estorno A' },
      organizador
    );
    await estornarInscricaoCore(
      db,
      gateway,
      { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[1]!, motivo: 'Estorno B' },
      organizador
    );

    // A entrega confirma o SEGUNDO refund (esp_refund_2 = inscrito[1]).
    const r = await entregarWebhookEstorno(fx, {
      eventId: 'evt-grupo',
      refundId: 'esp_refund_2',
      refundAmount: Math.round(fx.valorLinha * 100),
    });

    expect(r.estornoConfirmado?.inscritoId).toBe(fx.inscritoIds[1]);
    expect((await inscritoRef(fx.inscritoIds[1]!).get()).get('status')).toBe('estornado');
    expect((await inscritoRef(fx.inscritoIds[0]!).get()).get('status')).toBe('confirmado');
    expect(await receitaConfirmada()).toBe(roundMoney(receitaAntes - fx.valorLinha));
    expect((await ledgerRef(fx.pagamentoId, fx.inscritoIds[0]!).get()).get('status')).toBe('solicitado');
  }, 60_000);

  it('dois carimbos vivos indistinguíveis: NENHUM efeito (ambíguo, não chuta)', async () => {
    const fx = await criarPedidoPago(2);
    gateway.roteiro = [{ tipo: 'pending' }, { tipo: 'pending' }];
    const receitaAntes = await receitaConfirmada();
    await estornarInscricaoCore(
      db,
      gateway,
      { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[0]!, motivo: 'Estorno A' },
      organizador
    );
    await estornarInscricaoCore(
      db,
      gateway,
      { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[1]!, motivo: 'Estorno B' },
      organizador
    );

    // Entrega sem refundId e com valor que casa com os DOIS carimbos.
    const confirmacao = await confirmarEstornoPorWebhook(db, fx.pagamentoId, {
      amountCentavos: Math.round(fx.valorLinha * 100),
    });

    expect(confirmacao.motivo).toBe('ambiguo');
    expect(confirmacao.aplicado).toBe(false);
    expect(await receitaConfirmada()).toBe(receitaAntes);
    for (const id of fx.inscritoIds) {
      expect((await inscritoRef(id).get()).get('status')).toBe('confirmado');
    }
  }, 60_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Timeout com efeito possível — o estorno duplo provado, agora morto
// ─────────────────────────────────────────────────────────────────────────────

describe('timeout no POST de estorno (efeitoPossivel — RN-349)', () => {
  it('carimba gateway_sem_resposta e BLOQUEIA a segunda tentativa', async () => {
    const fx = await criarPedidoPago(1);
    gateway.roteiro = [{ tipo: 'timeout' }, { tipo: 'approved' }];
    const input = { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[0]!, motivo: 'Estorno' };
    const receitaAntes = await receitaConfirmada();

    await expect(estornarInscricaoCore(db, gateway, input, organizador)).rejects.toThrow(
      /não respondeu|desconhecido|extrato/i
    );
    const ledger1 = await ledgerRef(fx.pagamentoId, fx.inscritoIds[0]!).get();
    expect(ledger1.get('status')).toBe('gateway_sem_resposta');
    expect(typeof ledger1.get('ultimaFalhaEnvio')).toBe('string');

    // A tentativa seguinte (o retry do operador) NÃO manda o segundo POST —
    // era exatamente aqui que o comprador recebia duas vezes.
    await expect(estornarInscricaoCore(db, gateway, input, organizador)).rejects.toThrow(
      /extrato|manual/i
    );
    expect(gateway.posts.length).toBe(1);
    expect(await receitaConfirmada()).toBe(receitaAntes);
    expect((await inscritoRef(fx.inscritoIds[0]!).get()).get('status')).toBe('confirmado');
  }, 60_000);

  it('o webhook ainda fecha o que ficou sem resposta (o POST tinha saído)', async () => {
    const fx = await criarPedidoPago(1);
    gateway.roteiro = [{ tipo: 'timeout' }];
    const receitaAntes = await receitaConfirmada();
    await expect(
      estornarInscricaoCore(
        db,
        gateway,
        { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[0]!, motivo: 'Estorno' },
        organizador
      )
    ).rejects.toThrow();

    const r = await entregarWebhookEstorno(fx, { eventId: 'evt-timeout', refundId: 'ref_real_do_asaas' });

    expect(r.estornoConfirmado?.motivo).toBe('confirmado');
    expect((await inscritoRef(fx.inscritoIds[0]!).get()).get('status')).toBe('estornado');
    expect(await receitaConfirmada()).toBe(roundMoney(receitaAntes - fx.valorLinha));
    expect(gateway.posts.length).toBe(1);
  }, 60_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Falha PROVADAMENTE sem efeito libera o retry; divergência/recusa travam
// ─────────────────────────────────────────────────────────────────────────────

describe('desfechos do gateway que não são "concluído"', () => {
  it('4xx do gateway devolve o ledger a pendente — retry legítimo conclui', async () => {
    const fx = await criarPedidoPago(1);
    gateway.roteiro = [
      { tipo: 'erro', err: new AsaasApiError(400, [], ['saldo insuficiente para estorno']) },
      { tipo: 'approved' },
    ];
    const input = { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[0]!, motivo: 'Estorno' };
    const receitaAntes = await receitaConfirmada();

    await expect(estornarInscricaoCore(db, gateway, input, organizador)).rejects.toThrow(/saldo/i);
    expect((await ledgerRef(fx.pagamentoId, fx.inscritoIds[0]!).get()).get('status')).toBe('pendente');

    const r = await estornarInscricaoCore(db, gateway, input, organizador);
    expect(r.estado).toBe('aprovado');
    expect(gateway.posts.length).toBe(2);
    expect(await receitaConfirmada()).toBe(roundMoney(receitaAntes - fx.valorLinha));
    expect((await ledgerRef(fx.pagamentoId, fx.inscritoIds[0]!).get()).get('tentativasEnvio')).toBe(2);
  }, 60_000);

  it('valor divergente TRAVA o ledger e não aplica efeito', async () => {
    const fx = await criarPedidoPago(1);
    gateway.roteiro = [{ tipo: 'valorErrado', centavos: 100 }, { tipo: 'approved' }];
    const input = { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[0]!, motivo: 'Estorno' };
    const receitaAntes = await receitaConfirmada();

    await expect(estornarInscricaoCore(db, gateway, input, organizador)).rejects.toThrow(/diverge/i);
    const ledger = await ledgerRef(fx.pagamentoId, fx.inscritoIds[0]!).get();
    expect(ledger.get('status')).toBe('divergencia_valor');
    expect(ledger.get('valorDevolvidoCentavos')).toBe(100);

    await expect(estornarInscricaoCore(db, gateway, input, organizador)).rejects.toThrow(/manual/i);
    expect(gateway.posts.length).toBe(1);
    expect(await receitaConfirmada()).toBe(receitaAntes);
  }, 60_000);

  it('estorno recusado pelo gateway trava para conferência (sem segundo POST)', async () => {
    const fx = await criarPedidoPago(1);
    gateway.roteiro = [{ tipo: 'rejected' }, { tipo: 'approved' }];
    const input = { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[0]!, motivo: 'Estorno' };

    await expect(estornarInscricaoCore(db, gateway, input, organizador)).rejects.toThrow(/recusou|cancelou/i);
    expect((await ledgerRef(fx.pagamentoId, fx.inscritoIds[0]!).get()).get('status')).toBe('rejeitado_gateway');
    await expect(estornarInscricaoCore(db, gateway, input, organizador)).rejects.toThrow();
    expect(gateway.posts.length).toBe(1);
  }, 60_000);

  it('resposta síncrona "concluído" (DONE) aplica o efeito na hora — inalterado', async () => {
    const fx = await criarPedidoPago(1);
    gateway.roteiro = [{ tipo: 'approved' }];
    const receitaAntes = await receitaConfirmada();

    const r = await estornarInscricaoCore(
      db,
      gateway,
      { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[0]!, motivo: 'Estorno' },
      organizador
    );

    expect(r.estado).toBe('aprovado');
    expect(r.aguardandoConfirmacao).toBe(false);
    expect(await receitaConfirmada()).toBe(roundMoney(receitaAntes - fx.valorLinha));
    expect((await ledgerRef(fx.pagamentoId, fx.inscritoIds[0]!).get()).get('status')).toBe('aprovado');
  }, 60_000);
});
