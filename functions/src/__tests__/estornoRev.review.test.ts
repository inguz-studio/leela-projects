/**
 * estornoRev.review.test.ts — review antagonista ESTORNO-REV (RN-370..380)
 *
 * ⚠️ EXIGE Firestore Emulator (8080). Nenhuma rede real: o gateway é um espião
 * em memória que CONTA os `POST /refund` e NÃO deduplica.
 *
 * A lane ESTORNO-ADMIN declarou os vetores; estas provas atacam o que a suíte
 * dela NÃO media:
 *   V1 · duas chamadas CONCORRENTES do mesmo estorno (o operador ansioso, e o
 *        retry do callable): o carimbo é compare-and-set COMMITADO antes do
 *        POST — sob concorrência real tem de sair UM POST, não dois. A suíte
 *        da lane só provava o caso SEQUENCIAL (segunda chamada depois da
 *        primeira voltar), que sobrevive até com o carimbo removido.
 *   V2 · duas entregas retardatárias CONCORRENTES: a transação do Firestore
 *        serializa o extrato (RN-380) e o ledger órfão barra o segundo POST.
 *   V3 · entrega retardatária CONCORRENTE ao `PAYMENT_REFUNDED`: o extrato
 *        resolvido NUNCA volta a 'pendente' (a detecção não des-resolve).
 *   V4 · `divergencia_valor` no ÓRFÃO (o caminho sem teste dedicado): valor da
 *        entrega ≠ congelado TRAVA o ledger, não fecha o livro, e a varredura
 *        manda para conferência humana sem re-POSTar.
 *   V5 · casamento do ledger no webhook: uma entrega que carrega o refundId de
 *        um estorno JÁ aprovado não pode fechar o carimbo vivo de OUTRO
 *        inscrito do mesmo pedido (dinheiro devolvido uma vez, livro dizendo
 *        duas).
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  roundMoney,
  type AuthClaims,
  type PaymentProvider,
  type RefundParams,
  type RefundResult,
} from '@leela/core';
import { ESTORNOS_SUBCOL, estornarInscricaoCore } from '../checkout/estornarInscricao';
import {
  ESTORNOS_ORFAOS_SUBCOL,
  ESTORNO_ORFAO_DOC_ID,
  ORFAOS_PENDENTES_COL,
  varrerEstornosOrfaosCore,
} from '../checkout/estornarPagamentoOrfao';
import { processarWebhookPagamento, WEBHOOK_EVENTOS_SUBCOL } from '../checkout/webhookPagamento';
import { MockPaymentProvider, buildMockWebhookPayload } from '../payments/mockProvider';
import type { EventoCaller } from '../eventos/criarEvento';

const PROJECT_ID = 'demo-leela-estorno-rev';
const RULES_PATH = resolve(__dirname, '../../../firestore.rules');
const TENANT_ID = 'castelo-producoes';
const EVENTO_ID = 'meia-floripa-rev';
const MARINA_UID = 'uid-marina-rev';

const organizador: EventoCaller = {
  uid: MARINA_UID,
  claims: { role: 'tenant_owner', tenantId: TENANT_ID } as AuthClaims,
};

let testEnv: RulesTestEnvironment;
let db: admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Gateway espião — conta POSTs; `pending` por padrão (o rail assíncrono do PIX)
// ---------------------------------------------------------------------------

class GatewayEspiao implements PaymentProvider {
  readonly base = new MockPaymentProvider();
  posts: RefundParams[] = [];
  status: RefundResult['status'] = 'pending';
  /** Total (centavos) devolvido quando `amount` é omitido (refund TOTAL). */
  totalCobradoCentavos = 0;
  /** Atraso artificial no POST — abre a janela da corrida de propósito. */
  atrasoMs = 0;
  private refundSeq = 0;

  createCharge: PaymentProvider['createCharge'] = (p) => this.base.createCharge(p);
  cancelCharge: PaymentProvider['cancelCharge'] = (p) => this.base.cancelCharge(p);
  splitRules: PaymentProvider['splitRules'] = (p) => this.base.splitRules(p);
  handleWebhook: PaymentProvider['handleWebhook'] = (p) => this.base.handleWebhook(p);
  getPayout: PaymentProvider['getPayout'] = (p) => this.base.getPayout(p);

  async refund(params: RefundParams): Promise<RefundResult> {
    this.posts.push(params);
    if (this.atrasoMs > 0) {
      await new Promise((r) => setTimeout(r, this.atrasoMs));
    }
    this.refundSeq += 1;
    return {
      refundId: `esp_refund_${this.refundSeq}`,
      chargeId: params.chargeId,
      status: this.status,
      amount: params.amount ?? this.totalCobradoCentavos,
      processedAt: Timestamp.now() as unknown as RefundResult['processedAt'],
    };
  }
}

let gateway: GatewayEspiao;
let seq = 0;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface FixturePago {
  pedidoId: string;
  pagamentoId: string;
  chargeId: string;
  inscritoIds: string[];
  valorLinha: number;
  valorTotal: number;
}

async function criarPedidoPago(qtd: number, valorLinha = 189.9): Promise<FixturePago> {
  seq += 1;
  const pedidoId = `ped-rev-${seq}`;
  const pagamentoId = `pag-rev-${seq}`;
  const inscritoIds = Array.from({ length: qtd }, (_, i) => `insc-rev-${seq}-${i}`);
  const valorTotal = roundMoney(valorLinha * qtd);
  const now = FieldValue.serverTimestamp();
  const totalCentavos = Math.round(valorTotal * 100);
  gateway.totalCobradoCentavos = totalCentavos;

  const charge = await gateway.base.createCharge({
    orderId: pedidoId,
    tenantId: TENANT_ID,
    amount: totalCentavos,
    paymentMethod: 'pix',
    customer: { name: 'Comprador Teste', email: `r${seq}@ex.com`, taxId: '11144477735' },
    items: [
      { id: 'linha-1', description: 'Inscrição', amount: Math.round(valorLinha * 100), quantity: qtd },
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
    criadoEm: Timestamp.now(),
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
    gatewayAmountCentavos: totalCentavos,
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

  return { pedidoId, pagamentoId, chargeId: charge.chargeId, inscritoIds, valorLinha, valorTotal };
}

interface FixtureCancelado {
  pedidoId: string;
  pagamentoId: string;
  chargeId: string;
  totalCentavos: number;
}

async function criarPedidoCancelado(totalCobrado = 189.9): Promise<FixtureCancelado> {
  seq += 1;
  const pedidoId = `ped-rev-orf-${seq}`;
  const pagamentoId = `pag-rev-orf-${seq}`;
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

const ledgerRef = (pagamentoId: string, inscritoId: string) =>
  db.collection('pagamentos').doc(pagamentoId).collection(ESTORNOS_SUBCOL).doc(inscritoId);

const ledgerOrfaoRef = (pagamentoId: string) =>
  db
    .collection('pagamentos')
    .doc(pagamentoId)
    .collection(ESTORNOS_ORFAOS_SUBCOL)
    .doc(ESTORNO_ORFAO_DOC_ID);

const extratoRef = (pagamentoId: string) =>
  db.collection(ORFAOS_PENDENTES_COL).doc(pagamentoId);

const inscritoRef = (inscritoId: string) =>
  db.collection('eventos').doc(EVENTO_ID).collection('inscritos').doc(inscritoId);

async function receitaConfirmada(): Promise<number> {
  const snap = await db.collection('eventos').doc(EVENTO_ID).get();
  return (snap.get('receitaConfirmada') as number) ?? 0;
}

/** Entrega assinada de CONFIRMAÇÃO (a retardatária, no pagamento cancelado). */
function entregarConfirmacao(fx: FixtureCancelado, eventId: string) {
  const payload = buildMockWebhookPayload('charge.confirmed', {
    chargeId: fx.chargeId,
    orderId: fx.pedidoId,
    amount: fx.totalCentavos,
    eventId,
  });
  return processarWebhookPagamento(db, gateway, payload);
}

/** Entrega assinada de ESTORNO (`PAYMENT_REFUNDED` do mock). */
function entregarRefunded(
  alvo: { chargeId: string; pedidoId: string; totalCentavos: number },
  opts: { eventId: string; refundId?: string; refundAmount?: number }
) {
  const payload = buildMockWebhookPayload('charge.refunded', {
    chargeId: alvo.chargeId,
    orderId: alvo.pedidoId,
    amount: alvo.totalCentavos,
    eventId: opts.eventId,
    ...(opts.refundId !== undefined ? { refundId: opts.refundId } : {}),
    ...(opts.refundAmount !== undefined ? { refundAmount: opts.refundAmount } : {}),
  });
  return processarWebhookPagamento(db, gateway, payload);
}

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
    nome: 'Meia de Floripa (review)',
    status: 'publicado',
    receitaConfirmada: 0,
    criadoEm: now,
    atualizadoEm: now,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// V1 — o operador ansioso: duas chamadas CONCORRENTES, um POST só
// ─────────────────────────────────────────────────────────────────────────────

describe('corrida do carimbo (RN-370/371) — o clique duplo do operador', () => {
  it('duas chamadas SIMULTÂNEAS do mesmo estorno emitem UM POST só', async () => {
    const fx = await criarPedidoPago(1);
    gateway.atrasoMs = 120; // a janela que o carimbo existe para cobrir
    const input = { pedidoId: fx.pedidoId, inscritoId: fx.inscritoIds[0]!, motivo: 'Clique duplo' };
    const receitaAntes = await receitaConfirmada();

    const resultados = await Promise.allSettled([
      estornarInscricaoCore(db, gateway, input, organizador),
      estornarInscricaoCore(db, gateway, input, organizador),
    ]);

    // O dinheiro: EXATAMENTE um pedido de estorno saiu para o gateway.
    expect(gateway.posts).toHaveLength(1);

    // Uma das duas mandou; a outra foi barrada (RN-371) ou devolveu replay —
    // nenhuma das duas aplicou efeito local (o gateway devolveu 'pending').
    const enviou = resultados.filter(
      (r) => r.status === 'fulfilled' && r.value.duplicado === false
    );
    expect(enviou).toHaveLength(1);
    for (const r of resultados) {
      if (r.status === 'rejected') {
        expect(String(r.reason)).toMatch(/andamento|RN-371|carimbo|gateway/i);
      } else {
        expect(r.value.estado).toBe('solicitado');
        expect(r.value.aguardandoConfirmacao).toBe(true);
      }
    }

    // Nenhum efeito local antes do webhook: receita e inscrito intactos.
    expect(await receitaConfirmada()).toBe(receitaAntes);
    expect((await inscritoRef(fx.inscritoIds[0]!).get()).get('status')).toBe('confirmado');
    const ledger = await ledgerRef(fx.pagamentoId, fx.inscritoIds[0]!).get();
    expect(ledger.get('status')).toBe('solicitado');
    // O carimbo contou UMA saída — não duas (a prova de que o CAS segurou).
    expect(ledger.get('tentativasEnvio')).toBe(1);
  }, 60_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// V2/V3 — corridas no retardatário (item 27 · RN-379/380)
// ─────────────────────────────────────────────────────────────────────────────

describe('corridas do retardatário (RN-379/380)', () => {
  it('duas entregas retardatárias CONCORRENTES: um POST, extrato serializado', async () => {
    const fx = await criarPedidoCancelado();
    gateway.atrasoMs = 80;

    const [a, b] = await Promise.all([
      entregarConfirmacao(fx, 'late-par-a'),
      entregarConfirmacao(fx, 'late-par-b'),
    ]);
    expect(a.motivo).toBe('retardatario_pos_cancelamento');
    expect(b.motivo).toBe('retardatario_pos_cancelamento');

    // As DUAS entregas ficaram no ledger de webhooks (nenhuma foi perdida)...
    for (const eventId of ['late-par-a', 'late-par-b']) {
      const entrega = await db
        .collection('pagamentos')
        .doc(fx.pagamentoId)
        .collection(WEBHOOK_EVENTOS_SUBCOL)
        .doc(eventId)
        .get();
      expect(entrega.get('efeito')).toBe('retardatario_pos_cancelamento');
    }

    // ...e o extrato contou as duas SEM duplicar a pendência (a tx serializa).
    const extrato = await extratoRef(fx.pagamentoId).get();
    expect(extrato.get('entregas')).toBe(2);
    expect(extrato.get('resolvido')).toBe(false);

    // O dinheiro: um POST só, TOTAL.
    expect(gateway.posts).toHaveLength(1);
    expect(gateway.posts[0]?.amount).toBeUndefined();
    expect((await ledgerOrfaoRef(fx.pagamentoId).get()).get('status')).toBe('solicitado');
  }, 60_000);

  it('retardatária CONCORRENTE ao PAYMENT_REFUNDED não re-abre o extrato', async () => {
    const fx = await criarPedidoCancelado();
    await entregarConfirmacao(fx, 'late-1');
    const refundId = (await ledgerOrfaoRef(fx.pagamentoId).get()).get('refundId') as string;
    expect(gateway.posts).toHaveLength(1);

    // O estorno confirmando ao MESMO tempo que mais uma confirmação atrasada
    // chega: a detecção não pode des-resolver o que o gateway já fechou.
    await Promise.all([
      entregarRefunded(
        { chargeId: fx.chargeId, pedidoId: fx.pedidoId, totalCentavos: fx.totalCentavos },
        { eventId: 'refund-conc', refundId, refundAmount: fx.totalCentavos }
      ),
      entregarConfirmacao(fx, 'late-conc'),
    ]);

    const extrato = await extratoRef(fx.pagamentoId).get();
    expect(extrato.get('resolvido')).toBe(true);
    expect((await ledgerOrfaoRef(fx.pagamentoId).get()).get('status')).toBe('aprovado');
    expect(gateway.posts).toHaveLength(1);

    // E a varredura não acha nada pendente (o livro fechou de verdade).
    const varredura = await varrerEstornosOrfaosCore(db, gateway);
    expect(varredura.pendentes).toBe(0);
    expect(varredura.disparados).toBe(0);
    expect(gateway.posts).toHaveLength(1);
  }, 60_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// V4 — `divergencia_valor` no ÓRFÃO (o caminho que a lane não testou)
// ─────────────────────────────────────────────────────────────────────────────

describe('órfão: valor divergente na confirmação do webhook (RN-371)', () => {
  it('entrega com valor ≠ do congelado TRAVA o ledger e NÃO fecha o livro', async () => {
    const fx = await criarPedidoCancelado();
    await entregarConfirmacao(fx, 'late-1');
    const refundId = (await ledgerOrfaoRef(fx.pagamentoId).get()).get('refundId') as string;

    const r = await entregarRefunded(
      { chargeId: fx.chargeId, pedidoId: fx.pedidoId, totalCentavos: fx.totalCentavos },
      { eventId: 'refund-torto', refundId, refundAmount: fx.totalCentavos - 1000 }
    );

    expect(r.estornoOrfaoConfirmado?.motivo).toBe('divergencia_valor');
    expect(r.estornoOrfaoConfirmado?.aplicado).toBe(false);

    const ledger = await ledgerOrfaoRef(fx.pagamentoId).get();
    expect(ledger.get('status')).toBe('divergencia_valor');
    expect(ledger.get('valorDevolvidoCentavos')).toBe(fx.totalCentavos - 1000);
    // O livro NÃO fechou: extrato segue pendente e o pagamento não carimbou.
    expect((await extratoRef(fx.pagamentoId).get()).get('resolvido')).toBe(false);
    const pagamento = await db.collection('pagamentos').doc(fx.pagamentoId).get();
    expect(pagamento.get('estornoOrfaoRefundId')).toBeUndefined();

    // A varredura manda para MÃO HUMANA e não re-POSTa (RN-371).
    const varredura = await varrerEstornosOrfaosCore(db, gateway);
    expect(varredura.pendentes).toBe(1);
    expect(varredura.conferenciaManual).toBe(1);
    expect(varredura.disparados).toBe(0);
    expect(gateway.posts).toHaveLength(1);
  }, 60_000);
});

// ─────────────────────────────────────────────────────────────────────────────
// V5 — casamento do ledger: refundId de estorno JÁ aprovado não fecha outro
// ─────────────────────────────────────────────────────────────────────────────

describe('casamento do ledger no webhook (RN-372)', () => {
  it('entrega com refundId JÁ aprovado não fecha o carimbo vivo de outro inscrito', async () => {
    // Pedido de grupo: A é estornado e confirmado; B fica aguardando o gateway.
    const fx = await criarPedidoPago(2);
    const [inscA, inscB] = fx.inscritoIds as [string, string];
    const receitaAntes = await receitaConfirmada();

    await estornarInscricaoCore(
      db,
      gateway,
      { pedidoId: fx.pedidoId, inscritoId: inscA, motivo: 'Estorno A' },
      organizador
    );
    const refundA = (await ledgerRef(fx.pagamentoId, inscA).get()).get('refundId') as string;
    await entregarRefunded(
      { chargeId: fx.chargeId, pedidoId: fx.pedidoId, totalCentavos: Math.round(fx.valorTotal * 100) },
      { eventId: 'refund-A', refundId: refundA, refundAmount: Math.round(fx.valorLinha * 100) }
    );
    expect((await ledgerRef(fx.pagamentoId, inscA).get()).get('status')).toBe('aprovado');

    await estornarInscricaoCore(
      db,
      gateway,
      { pedidoId: fx.pedidoId, inscritoId: inscB, motivo: 'Estorno B' },
      organizador
    );
    expect((await ledgerRef(fx.pagamentoId, inscB).get()).get('status')).toBe('solicitado');

    // RE-ENTREGA do evento de A (novo eventId — o Asaas manda `refunds[]` e o
    // adapter extrai o DONE mais recente, que continua sendo o de A enquanto
    // o de B está PENDING). Isto NÃO é a confirmação de B.
    const r = await entregarRefunded(
      { chargeId: fx.chargeId, pedidoId: fx.pedidoId, totalCentavos: Math.round(fx.valorTotal * 100) },
      { eventId: 'refund-A-redelivery', refundId: refundA, refundAmount: Math.round(fx.valorLinha * 100) }
    );

    // O ledger de B NÃO pode ser fechado por um refund que é de A: o gateway
    // devolveu UMA vez e o livro registraria DUAS.
    expect(r.estornoConfirmado?.inscritoId).not.toBe(inscB);
    expect(r.estornoConfirmado?.aplicado).toBe(false);
    expect((await ledgerRef(fx.pagamentoId, inscB).get()).get('status')).toBe('solicitado');
    expect((await inscritoRef(inscB).get()).get('status')).toBe('confirmado');
    expect(await receitaConfirmada()).toBe(roundMoney(receitaAntes - fx.valorLinha));
  }, 60_000);
});
