// =============================================================================
// functions/src/payments/mockProvider.ts
//
// Mock determinístico do PaymentProvider (ADR-006).
// Simula confirmação de cobrança e cálculo de split sem chamadas de rede.
// Uso: testes de integração e desenvolvimento local (Emulator-only).
//
// Invariantes preservadas:
//   - createCharge: idempotente via idempotencyKey (reprocessar = mesmo resultado)
//   - handleWebhook: assinatura HMAC verificada ANTES de qualquer escrita;
//     idempotente via eventId (replay idêntico não duplica estado);
//     payload.event mapeado a status (confirmed/failed/refunded)
//   - splitRules: cálculo determinístico; fee + recipients nunca excede o
//     total e fecha exato quando percentuais + fee = 100%
// =============================================================================

import { createHmac } from 'crypto';
import type {
  PaymentProvider,
  CreateChargeParams,
  ChargeResult,
  CancelChargeParams,
  CancelChargeResult,
  SplitRulesParams,
  SplitRulesResult,
  RefundParams,
  RefundResult,
  WebhookPayload,
  WebhookResult,
  GetPayoutParams,
  PayoutResult,
  SplitRecipient,
  ResolvedSplitRecipient,
  WebhookRefundInfo,
} from '@leela/core';

/**
 * Recusa EXPLÍCITA do mock no `refund` — a chamada foi validada e negada
 * ANTES de qualquer efeito (equivalente ao 4xx do gateway real). Classe
 * própria porque quem chama precisa distinguir "não saiu nada" de "pode ter
 * saído" sem farejar mensagem de erro (RN-371 · `falhaRefundSemEfeito`).
 */
export class MockRefundRecusadoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MockRefundRecusadoError';
  }
}

// ---------------------------------------------------------------------------
// Timestamp utilitário (sem dep do Firebase Admin para testabilidade)
// ---------------------------------------------------------------------------
function nowTimestamp() {
  const now = Date.now();
  return {
    seconds: Math.floor(now / 1000),
    nanoseconds: (now % 1000) * 1_000_000,
    toDate: () => new Date(now),
    toMillis: () => now,
  };
}

// ---------------------------------------------------------------------------
// Estado em memória (limpo a cada instância — DI facilita reset nos testes)
// ---------------------------------------------------------------------------
interface StoredCharge {
  chargeId: string;
  orderId: string;
  tenantId: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded' | 'cancelled';
  idempotencyKey: string;
  /** Total já estornado em centavos (soma de refunds aprovados) */
  refundedAmount: number;
  /** RN-157 (CK2-T5): expiração do PIX em epoch-ms — replay devolve a MESMA */
  expiresAtMillis?: number;
}

/** Timestamp fixo a partir de epoch-ms (expiresAt de replay determinístico) */
function timestampDeMillis(millis: number) {
  return {
    seconds: Math.floor(millis / 1000),
    nanoseconds: (millis % 1000) * 1_000_000,
    toDate: () => new Date(millis),
    toMillis: () => millis,
  };
}

interface StoredWebhookResult {
  chargeId: string;
  status: 'confirmed' | 'failed' | 'refunded';
  amount: number;
  processedAt: ReturnType<typeof nowTimestamp>;
  /** Bloco de estorno da entrega (RN-372) — só em `charge.refunded`. */
  refund?: WebhookRefundInfo;
}

// ---------------------------------------------------------------------------
// Assinatura HMAC simulada (secret mock — Emulator-only, não é segredo real)
// ---------------------------------------------------------------------------

/** Secret do gateway mock. NÃO é segredo de produção — só assina webhooks fake. */
export const MOCK_WEBHOOK_SECRET = 'mock-webhook-secret-demo-leela';

/**
 * Assina um payload de webhook como o gateway mock faria.
 * Use nos testes para produzir `payload.signature` válida.
 */
export function signMockWebhook(
  event: string,
  data: Record<string, unknown>
): string {
  return createHmac('sha256', MOCK_WEBHOOK_SECRET)
    .update(`${event}:${JSON.stringify(data)}`)
    .digest('hex');
}

/**
 * Monta um WebhookPayload COMPLETO e assinado como o gateway mock enviaria
 * (E12 — o fluxo local dispara este payload para fechar o checkout sem
 * gateway real). `data` deve carregar `chargeId`; para o webhook do checkout
 * incluir também `orderId` (pedidoId — lookup O(1)), `amount` (centavos) e
 * `eventId` (idempotência por ENTREGA).
 */
export function buildMockWebhookPayload(
  event: string,
  data: Record<string, unknown>
): WebhookPayload {
  return {
    event,
    data,
    signature: signMockWebhook(event, data),
    deliveredAt: new Date().toISOString(),
  };
}

/** Mapa event do gateway → ChargeStatus normalizado */
const EVENT_TO_STATUS: Record<string, 'confirmed' | 'failed' | 'refunded'> = {
  'charge.confirmed': 'confirmed',
  'charge.failed': 'failed',
  'charge.refunded': 'refunded',
};

interface StoredRefund {
  refundId: string;
  chargeId: string;
  amount: number;
  idempotencyKey: string;
  /**
   * Status devolvido ao chamador. 'pending' = o gateway ACEITOU e ainda não
   * concluiu (é o que o Asaas faz com PIX — REFUND_STATUS_MAP PENDING). Sem
   * isso o mock provava a garantia DELE, não a do Asaas (achado da review).
   */
  status: 'pending' | 'approved';
}

/** Opções do mock — default = comportamento vigente byte a byte. */
export interface MockPaymentProviderOptions {
  /**
   * Desfecho do `refund`:
   *   'approved' (default) — conclui na resposta (DONE do Asaas);
   *   'pending'            — aceita e devolve 'pending', deixando a conclusão
   *                          para o webhook `charge.refunded` (RN-372).
   */
  refundStatus?: 'approved' | 'pending';
}

// ---------------------------------------------------------------------------
// Helpers de cálculo de split
// ---------------------------------------------------------------------------

/**
 * Calcula o split entre plataforma e destinatários.
 *
 * Regras:
 *   1. Platform fee = floor(totalAmount * platformFeePct / 100)
 *   2. Recipient com `percentage` recebe floor(totalAmount * pct / 100)
 *   3. Recipient com `amount` fixo recebe exatamente o valor declarado
 *      (nunca é sobrescrito — achado A5, review E00)
 *   4. Resíduo de arredondamento (sobras dos floors) vai ao ÚLTIMO recipient
 *      percentual, e somente quando percentuais + fee fecham 100% —
 *      só aí a diferença é atribuível a arredondamento.
 *
 * Validações (erro em misconfiguração):
 *   - platformFeePct fora de [0, 100]
 *   - percentage fora de (0, 100] ou amount fixo negativo
 *   - soma de percentuais + platformFeePct > 100
 *   - alocação total (fee + percentuais + fixos) > totalAmount
 *
 * Invariantes:
 *   - platformAmount + Σ recipients ≤ totalAmount (nunca excede)
 *   - quando percentuais + fee = 100 e não há amounts fixos,
 *     platformAmount + Σ recipients = totalAmount exato
 */
export function calcularSplit(
  totalAmount: number,
  platformFeePct: number,
  recipients: SplitRecipient[]
): { platformAmount: number; recipientsResolved: ResolvedSplitRecipient[] } {
  if (!Number.isInteger(totalAmount) || totalAmount < 0) {
    throw new Error(`[mock] totalAmount inválido: ${totalAmount}`);
  }
  if (platformFeePct < 0 || platformFeePct > 100) {
    throw new Error(`[mock] platformFeePct fora de [0, 100]: ${platformFeePct}`);
  }

  let percentSum = 0;
  for (const r of recipients) {
    if (r.percentage !== undefined) {
      if (r.percentage <= 0 || r.percentage > 100) {
        throw new Error(
          `[mock] percentage inválido para ${r.recipientId}: ${r.percentage}`
        );
      }
      percentSum += r.percentage;
    } else if (!Number.isInteger(r.amount) || r.amount < 0) {
      throw new Error(
        `[mock] amount inválido para ${r.recipientId}: ${r.amount}`
      );
    }
  }

  if (percentSum + platformFeePct > 100) {
    throw new Error(
      `[mock] Split não fecha: percentuais (${percentSum}%) + fee (${platformFeePct}%) > 100%`
    );
  }

  const platformAmount = Math.floor((totalAmount * platformFeePct) / 100);

  const resolved: ResolvedSplitRecipient[] = [];
  let lastPercentIdx = -1;
  let allocatedSum = 0;

  for (const r of recipients) {
    const allocated =
      r.percentage !== undefined
        ? Math.floor((totalAmount * r.percentage) / 100)
        : r.amount;
    if (r.percentage !== undefined) {
      lastPercentIdx = resolved.length;
    }
    allocatedSum += allocated;
    resolved.push({ recipientId: r.recipientId, amount: allocated });
  }

  if (platformAmount + allocatedSum > totalAmount) {
    throw new Error(
      `[mock] Split excede o total: fee ${platformAmount} + recipients ${allocatedSum} > ${totalAmount}`
    );
  }

  // Resíduo de arredondamento: só quando fee + percentuais fecham 100%
  // (aí a diferença vem exclusivamente dos floors) e há recipient percentual.
  if (percentSum + platformFeePct === 100 && lastPercentIdx >= 0) {
    const residue = totalAmount - platformAmount - allocatedSum;
    const last = resolved[lastPercentIdx];
    if (residue > 0 && last) {
      resolved[lastPercentIdx] = {
        recipientId: last.recipientId,
        amount: last.amount + residue,
      };
    }
  }

  return { platformAmount, recipientsResolved: resolved };
}

// ---------------------------------------------------------------------------
// MockPaymentProvider
// ---------------------------------------------------------------------------

export class MockPaymentProvider implements PaymentProvider {
  // Stores in-memory para idempotência
  private readonly charges = new Map<string, StoredCharge>();
  private readonly webhookResults = new Map<string, StoredWebhookResult>();
  private readonly refunds = new Map<string, StoredRefund>();
  private chargeCounter = 0;
  private refundCounter = 0;
  private readonly refundStatus: 'pending' | 'approved';

  constructor(options: MockPaymentProviderOptions = {}) {
    this.refundStatus = options.refundStatus ?? 'approved';
  }

  /**
   * Estorno registrado por chave — o teste do webhook precisa do refundId
   * que o gateway devolveu para montar a entrega `charge.refunded`.
   */
  refundPorChave(idempotencyKey: string): Readonly<StoredRefund> | undefined {
    return this.refunds.get(idempotencyKey);
  }

  // ── createCharge ────────────────────────────────────────────────────────

  async createCharge(params: CreateChargeParams): Promise<ChargeResult> {
    // Idempotência: mesma idempotencyKey → mesmo resultado
    const existing = [...this.charges.values()].find(
      (c) => c.idempotencyKey === params.idempotencyKey
    );
    if (existing) {
      return {
        chargeId: existing.chargeId,
        status: existing.status,
        paymentUrl: `https://mock.leela.app/pay/${existing.chargeId}`,
        // RN-157: replay devolve a MESMA expiração (nunca re-estende o timer)
        ...(existing.expiresAtMillis !== undefined
          ? { expiresAt: timestampDeMillis(existing.expiresAtMillis) }
          : {}),
      };
    }

    // RN-157 (CK2-T5): PIX com validade — contrato do provider (prova no
    // Mock; o Asaas fica coberto pelo mesmo contrato + premissa documentada).
    if (params.pixExpiraEmSegundos !== undefined) {
      if (
        !Number.isInteger(params.pixExpiraEmSegundos) ||
        params.pixExpiraEmSegundos <= 0
      ) {
        throw new Error(
          `[mock] pixExpiraEmSegundos inválido: ${params.pixExpiraEmSegundos}`
        );
      }
      if (params.paymentMethod !== 'pix') {
        throw new Error('[mock] pixExpiraEmSegundos só existe no PIX (RN-157)');
      }
    }
    const expiresAtMillis =
      params.pixExpiraEmSegundos !== undefined
        ? Date.now() + params.pixExpiraEmSegundos * 1000
        : undefined;

    this.chargeCounter++;
    const chargeId = `mock_charge_${this.chargeCounter}_${params.orderId}`;

    const stored: StoredCharge = {
      chargeId,
      orderId: params.orderId,
      tenantId: params.tenantId,
      amount: params.amount,
      // Mock: confirma imediatamente (sem gateway real)
      status: 'confirmed',
      idempotencyKey: params.idempotencyKey,
      refundedAmount: 0,
      ...(expiresAtMillis !== undefined ? { expiresAtMillis } : {}),
    };

    this.charges.set(chargeId, stored);

    return {
      chargeId,
      status: 'confirmed',
      paymentUrl: `https://mock.leela.app/pay/${chargeId}`,
      qrCode: `mock_qr_${chargeId}`,
      ...(expiresAtMillis !== undefined
        ? { expiresAt: timestampDeMillis(expiresAtMillis) }
        : {}),
    };
  }

  // ── cancelCharge ────────────────────────────────────────────────────────

  /**
   * Cancela a cobrança (RN-157 · S1209-PIXBE-T3) — a cobrança deixa de ser
   * pagável.
   *
   * Disciplina herdada do `refund` (achado M1 da review E00): cobrança
   * INEXISTENTE lança em vez de devolver um "ok" otimista — cancelar o que
   * não existe é bug de chamador, e engolir isso esconderia justamente o
   * caso em que o pedido morre com o código vivo.
   *
   * Cobrança ESTORNADA não é cancelável (o dinheiro já circulou nos dois
   * sentidos; cancelar depois disso é incoerência de estado). O `confirmed`
   * do Mock, ao contrário, NÃO impede: ele é o atalho documentado deste
   * adapter (nasce 'confirmed' sem gateway real), enquanto a autoridade
   * sobre "foi pago" no domínio é o webhook — quem chama já releu o
   * pagamento antes de pedir o cancelamento.
   */
  async cancelCharge(params: CancelChargeParams): Promise<CancelChargeResult> {
    if (params.idempotencyKey.trim().length === 0) {
      throw new Error('[mock] Cancelamento rejeitado: idempotencyKey vazia (RN-333)');
    }
    const charge = this.charges.get(params.chargeId);
    if (!charge) {
      throw new Error(
        `[mock] Cancelamento rejeitado: cobrança inexistente (${params.chargeId})`
      );
    }
    if (charge.status === 'cancelled') {
      return {
        chargeId: params.chargeId,
        status: 'cancelled',
        jaCancelada: true,
        processedAt: nowTimestamp(),
      };
    }
    if (charge.status === 'refunded') {
      throw new Error(
        `[mock] Cancelamento rejeitado: cobrança ${params.chargeId} já estornada`
      );
    }
    charge.status = 'cancelled';
    return {
      chargeId: params.chargeId,
      status: 'cancelled',
      jaCancelada: false,
      processedAt: nowTimestamp(),
    };
  }

  // ── splitRules ──────────────────────────────────────────────────────────

  async splitRules(params: SplitRulesParams): Promise<SplitRulesResult> {
    const charge = this.charges.get(params.chargeId);
    const totalAmount = charge?.amount ?? 0;

    const { recipientsResolved } = calcularSplit(
      totalAmount,
      params.platformFeePct,
      params.recipients
    );

    const ruleId = `mock_rule_${params.chargeId}`;
    const appliedAt = nowTimestamp();

    return {
      ruleId,
      chargeId: params.chargeId,
      recipients: recipientsResolved,
      appliedAt,
    };
  }

  // ── refund ──────────────────────────────────────────────────────────────

  async refund(params: RefundParams): Promise<RefundResult> {
    // Idempotência: mesma idempotencyKey → mesmo resultado
    const existing = this.refunds.get(params.idempotencyKey);
    if (existing) {
      return {
        refundId: existing.refundId,
        chargeId: existing.chargeId,
        // Replay devolve o MESMO desfecho registrado — um estorno 'pending'
        // não vira 'approved' porque alguém perguntou duas vezes.
        status: existing.status,
        amount: existing.amount,
        processedAt: nowTimestamp(),
      };
    }

    // Validações (achado M1, review E00) — antes: estorno de cobrança
    // inexistente retornava 'approved' e double-refund com keys distintas
    // passava sem limite.
    const charge = this.charges.get(params.chargeId);
    if (!charge) {
      throw new MockRefundRecusadoError(
        `[mock] Estorno rejeitado: cobrança inexistente (${params.chargeId})`
      );
    }

    const refundable = charge.amount - charge.refundedAmount;
    if (refundable <= 0) {
      throw new MockRefundRecusadoError(
        `[mock] Estorno rejeitado: cobrança ${params.chargeId} já integralmente estornada`
      );
    }

    const refundAmount = params.amount ?? refundable;
    if (!Number.isInteger(refundAmount) || refundAmount <= 0) {
      throw new MockRefundRecusadoError(
        `[mock] Estorno rejeitado: amount inválido (${refundAmount})`
      );
    }
    if (refundAmount > refundable) {
      throw new MockRefundRecusadoError(
        `[mock] Estorno rejeitado: ${refundAmount} excede o estornável (${refundable}) da cobrança ${params.chargeId}`
      );
    }

    // O valor sai do estornável assim que o gateway ACEITA (é o que impede o
    // estorno duplo sobre a mesma cobrança), mesmo com desfecho 'pending'.
    charge.refundedAmount += refundAmount;
    if (charge.refundedAmount >= charge.amount && this.refundStatus === 'approved') {
      charge.status = 'refunded';
    }

    this.refundCounter++;
    const refundId = `mock_refund_${this.refundCounter}`;

    this.refunds.set(params.idempotencyKey, {
      refundId,
      chargeId: params.chargeId,
      amount: refundAmount,
      idempotencyKey: params.idempotencyKey,
      status: this.refundStatus,
    });

    return {
      refundId,
      chargeId: params.chargeId,
      status: this.refundStatus,
      amount: refundAmount,
      processedAt: nowTimestamp(),
    };
  }

  // ── handleWebhook ───────────────────────────────────────────────────────

  async handleWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    // 1. Verificação de assinatura ANTES de qualquer leitura/escrita de estado.
    //    (Antes: qualquer string non-empty passava — achado A6, review E00.)
    const expected = signMockWebhook(payload.event, payload.data);
    if (!payload.signature || payload.signature !== expected) {
      throw new Error('[mock] Webhook com assinatura inválida — rejeitado');
    }

    // 2. Mapear event → status. Evento desconhecido é erro, nunca 'confirmed'.
    const status = EVENT_TO_STATUS[payload.event];
    if (!status) {
      throw new Error(`[mock] Evento de webhook desconhecido: ${payload.event}`);
    }

    // 3. Extrair chargeId do payload
    const chargeId = payload.data['chargeId'] as string | undefined;
    if (!chargeId) {
      throw new Error('[mock] Webhook sem chargeId no data');
    }

    // 4. Idempotência por ENTREGA (eventId), não por chargeId — eventos
    //    distintos do mesmo charge (confirmed → refunded) devem processar.
    //    Sem eventId explícito, deriva chave determinística de event+chargeId.
    const eventId =
      (payload.data['eventId'] as string | undefined) ??
      `${payload.event}:${chargeId}`;

    const cached = this.webhookResults.get(eventId);
    if (cached) {
      return {
        chargeId: cached.chargeId,
        status: cached.status,
        amount: cached.amount,
        processedAt: cached.processedAt,
        ...(cached.refund !== undefined ? { refund: cached.refund } : {}),
      };
    }

    const charge = this.charges.get(chargeId);
    const amount = (payload.data['amount'] as number | undefined) ?? charge?.amount ?? 0;
    const processedAt = nowTimestamp();

    if (charge) {
      charge.status = status;
    }

    // Bloco de ESTORNO (RN-372): a entrega diz QUAL estorno ela confirma. O
    // Asaas manda `payment.refunds[]`; aqui o teste passa refundId/refundAmount
    // no data. Sem eles a entrega é genérica e o domínio decide pelo carimbo.
    const refundIdEntrega = payload.data['refundId'];
    const refundAmountEntrega = payload.data['refundAmount'];
    const refund: WebhookRefundInfo | undefined =
      status === 'refunded' && typeof refundIdEntrega === 'string'
        ? {
            refundId: refundIdEntrega,
            amountCentavos:
              typeof refundAmountEntrega === 'number' ? refundAmountEntrega : amount,
            status: 'approved',
          }
        : undefined;

    this.webhookResults.set(eventId, {
      chargeId,
      status,
      amount,
      processedAt,
      ...(refund !== undefined ? { refund } : {}),
    });

    return {
      chargeId,
      status,
      amount,
      processedAt,
      ...(refund !== undefined ? { refund } : {}),
    };
  }

  // ── getPayout ───────────────────────────────────────────────────────────

  async getPayout(params: GetPayoutParams): Promise<PayoutResult> {
    // Agrega o total confirmado de todas as cobranças do tenant
    let totalAmount = 0;
    for (const charge of this.charges.values()) {
      if (charge.tenantId === params.tenantId && charge.status === 'confirmed') {
        totalAmount += charge.amount;
      }
    }

    const scheduledAt = nowTimestamp();

    return {
      payoutId: `mock_payout_${params.tenantId}`,
      tenantId: params.tenantId,
      amount: totalAmount,
      status: 'scheduled',
      scheduledAt,
    };
  }

  // ── Helpers de teste ────────────────────────────────────────────────────

  /** Reseta o estado em memória. Use em beforeEach nos testes. */
  reset(): void {
    this.charges.clear();
    this.webhookResults.clear();
    this.refunds.clear();
    this.chargeCounter = 0;
    this.refundCounter = 0;
  }

  /** Retorna a cobrança armazenada (para asserções de teste). */
  getCharge(chargeId: string): StoredCharge | undefined {
    return this.charges.get(chargeId);
  }
}

/** Instância singleton para uso em testes e emulador */
export const mockPaymentProvider = new MockPaymentProvider();
