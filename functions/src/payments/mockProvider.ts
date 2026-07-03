// =============================================================================
// functions/src/payments/mockProvider.ts
//
// Mock determinístico do PaymentProvider (ADR-006).
// Simula confirmação de cobrança e cálculo de split sem chamadas de rede.
// Uso: testes de integração e desenvolvimento local (Emulator-only).
//
// Invariantes preservadas:
//   - createCharge: idempotente via idempotencyKey (reprocessar = mesmo resultado)
//   - handleWebhook: idempotente via chargeId (reprocessar não duplica estado)
//   - splitRules: cálculo determinístico; fee + recipients nunca excede o
//     total e fecha exato quando percentuais + fee = 100%
// =============================================================================

import type {
  PaymentProvider,
  CreateChargeParams,
  ChargeResult,
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
} from '@leela/core';

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
}

interface StoredWebhookResult {
  chargeId: string;
  amount: number;
  processedAt: ReturnType<typeof nowTimestamp>;
}

interface StoredRefund {
  refundId: string;
  chargeId: string;
  amount: number;
  idempotencyKey: string;
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
      };
    }

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
    };

    this.charges.set(chargeId, stored);

    return {
      chargeId,
      status: 'confirmed',
      paymentUrl: `https://mock.leela.app/pay/${chargeId}`,
      qrCode: `mock_qr_${chargeId}`,
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
        status: 'approved',
        amount: existing.amount,
        processedAt: nowTimestamp(),
      };
    }

    const charge = this.charges.get(params.chargeId);
    const refundAmount = params.amount ?? charge?.amount ?? 0;

    if (charge) {
      charge.status = 'refunded';
    }

    this.refundCounter++;
    const refundId = `mock_refund_${this.refundCounter}`;

    this.refunds.set(params.idempotencyKey, {
      refundId,
      chargeId: params.chargeId,
      amount: refundAmount,
      idempotencyKey: params.idempotencyKey,
    });

    return {
      refundId,
      chargeId: params.chargeId,
      status: 'approved',
      amount: refundAmount,
      processedAt: nowTimestamp(),
    };
  }

  // ── handleWebhook ───────────────────────────────────────────────────────

  async handleWebhook(payload: WebhookPayload): Promise<WebhookResult> {
    // Verificação de assinatura (mock: aceita assinatura "mock-sig" ou qualquer non-empty)
    if (!payload.signature) {
      throw new Error('[mock] Webhook sem assinatura — rejeitado');
    }

    // Extrair chargeId do payload
    const chargeId = payload.data['chargeId'] as string | undefined;
    if (!chargeId) {
      throw new Error('[mock] Webhook sem chargeId no data');
    }

    // Idempotência: mesmo chargeId já processado → retorna resultado anterior
    const cached = this.webhookResults.get(chargeId);
    if (cached) {
      return {
        chargeId: cached.chargeId,
        status: 'confirmed',
        amount: cached.amount,
        processedAt: cached.processedAt,
      };
    }

    const charge = this.charges.get(chargeId);
    const amount = (payload.data['amount'] as number | undefined) ?? charge?.amount ?? 0;
    const processedAt = nowTimestamp();

    if (charge) {
      charge.status = 'confirmed';
    }

    this.webhookResults.set(chargeId, { chargeId, amount, processedAt });

    return {
      chargeId,
      status: 'confirmed',
      amount,
      processedAt,
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
