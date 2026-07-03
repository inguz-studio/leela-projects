/**
 * mockProvider.test.ts
 *
 * Testa o MockPaymentProvider (Task LEELA-S000-4-T2):
 *   1. Unit: cálculo de split (platform fee + recipients = total)
 *   2. Integração: webhook idempotente (reprocessar não duplica estado)
 *   3. Integração: createCharge idempotente via idempotencyKey
 *   4. Integração: refund idempotente via idempotencyKey
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  MockPaymentProvider,
  calcularSplit,
  mockPaymentProvider,
} from '../payments/mockProvider';

// ---------------------------------------------------------------------------
// 1. Unit — calcularSplit
// ---------------------------------------------------------------------------

describe('calcularSplit — unit (S000-4-T2)', () => {
  it('distribui platform fee e recipient amount corretamente', () => {
    const total = 10_000; // R$ 100,00 em centavos
    const platformFeePct = 5; // 5%
    const recipients = [{ recipientId: 'producer-1', percentage: 95 }];

    const { platformAmount, recipientsResolved } = calcularSplit(
      total,
      platformFeePct,
      recipients
    );

    expect(platformAmount).toBe(500); // 5% de 10000
    expect(recipientsResolved[0]?.amount).toBe(9_500); // último absorve resíduo = 10000 - 500 = 9500
    expect(platformAmount + (recipientsResolved[0]?.amount ?? 0)).toBe(total);
  });

  it('split com múltiplos recipients soma ao total', () => {
    const total = 10_000;
    const platformFeePct = 5;
    const recipients = [
      { recipientId: 'affiliate-1', percentage: 10 },
      { recipientId: 'producer-1', percentage: 85 },
    ];

    const { platformAmount, recipientsResolved } = calcularSplit(
      total,
      platformFeePct,
      recipients
    );

    const allAmounts = [platformAmount, ...recipientsResolved.map((r) => r.amount)];
    const sum = allAmounts.reduce((a, b) => a + b, 0);

    expect(sum).toBe(total);
    expect(platformAmount).toBe(500);
    expect(recipientsResolved[0]?.amount).toBe(1_000); // 10%
    expect(recipientsResolved[1]?.amount).toBe(8_500); // 85% exato (sem resíduo)
  });

  it('resíduo de arredondamento vai ao último recipient', () => {
    // 10001 centavos, 3% plataforma = 300.03 → floor = 300
    // 97% recipient = 9700.97 → floor = 9700 (mas como é o último, recebe o resíduo = 9701)
    const total = 10_001;
    const platformFeePct = 3;
    const recipients = [{ recipientId: 'producer-1', percentage: 97 }];

    const { platformAmount, recipientsResolved } = calcularSplit(
      total,
      platformFeePct,
      recipients
    );

    const sum = platformAmount + (recipientsResolved[0]?.amount ?? 0);
    expect(sum).toBe(total); // invariante: soma = total
  });

  it('recipient com amount fixo recebe exatamente o valor declarado', () => {
    const total = 10_000;
    const platformFeePct = 5;
    const recipients = [{ recipientId: 'producer-1', amount: 8_500 }];

    const { platformAmount, recipientsResolved } = calcularSplit(
      total,
      platformFeePct,
      recipients
    );

    // Regressão A5 (review E00): o valor fixo era sobrescrito pelo resíduo
    // total (8500 → 9500). Amount fixo é contrato — nunca sobrescrever.
    expect(platformAmount).toBe(500);
    expect(recipientsResolved[0]?.amount).toBe(8_500);
  });

  it('zero recipients retorna lista vazia e platform fee', () => {
    const { platformAmount, recipientsResolved } = calcularSplit(10_000, 10, []);
    expect(platformAmount).toBe(1_000);
    expect(recipientsResolved).toHaveLength(0);
  });

  // ── Misconfiguração → erro (A5) ─────────────────────────────────────────

  it('lança erro quando percentuais + platform fee excedem 100%', () => {
    expect(() =>
      calcularSplit(10_000, 10, [
        { recipientId: 'a', percentage: 60 },
        { recipientId: 'b', percentage: 40 },
      ])
    ).toThrow('não fecha');
  });

  it('lança erro quando amounts fixos + fee excedem o total', () => {
    expect(() =>
      calcularSplit(10_000, 5, [
        { recipientId: 'a', amount: 6_000 },
        { recipientId: 'b', amount: 4_000 },
      ])
    ).toThrow('excede o total');
  });

  it('lança erro para percentage fora de (0, 100]', () => {
    expect(() =>
      calcularSplit(10_000, 5, [{ recipientId: 'a', percentage: 0 }])
    ).toThrow('percentage inválido');
    expect(() =>
      calcularSplit(10_000, 5, [{ recipientId: 'a', percentage: 101 }])
    ).toThrow('percentage inválido');
  });

  it('lança erro para amount fixo negativo ou não-inteiro', () => {
    expect(() =>
      calcularSplit(10_000, 5, [{ recipientId: 'a', amount: -1 }])
    ).toThrow('amount inválido');
    expect(() =>
      calcularSplit(10_000, 5, [{ recipientId: 'a', amount: 10.5 }])
    ).toThrow('amount inválido');
  });

  it('lança erro para platformFeePct fora de [0, 100]', () => {
    expect(() => calcularSplit(10_000, -1, [])).toThrow('platformFeePct');
    expect(() => calcularSplit(10_000, 101, [])).toThrow('platformFeePct');
  });

  it('mistura de fixo + percentual respeita ambos sem redistribuir sobra', () => {
    // fee 5% = 500 · fixo 2000 · 20% = 2000 → alocado 4500 ≤ 10000
    // fee + percentuais (25%) < 100% → sobra NÃO é resíduo de arredondamento
    const { platformAmount, recipientsResolved } = calcularSplit(10_000, 5, [
      { recipientId: 'fixo', amount: 2_000 },
      { recipientId: 'pct', percentage: 20 },
    ]);
    expect(platformAmount).toBe(500);
    expect(recipientsResolved[0]?.amount).toBe(2_000);
    expect(recipientsResolved[1]?.amount).toBe(2_000);
  });
});

// ---------------------------------------------------------------------------
// 2. Integration — MockPaymentProvider
// ---------------------------------------------------------------------------

describe('MockPaymentProvider — integração (S000-4-T2)', () => {
  let provider: MockPaymentProvider;

  beforeEach(() => {
    provider = new MockPaymentProvider();
  });

  // ── createCharge idempotência ──────────────────────────────────────────

  it('createCharge retorna o mesmo chargeId para mesma idempotencyKey', async () => {
    const params = {
      orderId: 'order-1',
      tenantId: 'tenant-abc',
      amount: 5_000,
      paymentMethod: 'pix' as const,
      customer: { name: 'Ana Silva', email: 'ana@test.com' },
      items: [{ id: 'kit-ouro', description: 'Kit Ouro', amount: 5_000, quantity: 1 }],
      idempotencyKey: 'idem-001',
    };

    const r1 = await provider.createCharge(params);
    const r2 = await provider.createCharge(params);

    expect(r1.chargeId).toBe(r2.chargeId);
    expect(r1.status).toBe('confirmed');
  });

  it('createCharge gera chargeIds diferentes para idempotencyKeys diferentes', async () => {
    const base = {
      orderId: 'order-2',
      tenantId: 'tenant-abc',
      amount: 3_000,
      paymentMethod: 'credit_card' as const,
      customer: { name: 'João Lima', email: 'joao@test.com' },
      items: [{ id: 'kit-prata', description: 'Kit Prata', amount: 3_000, quantity: 1 }],
    };

    const r1 = await provider.createCharge({ ...base, idempotencyKey: 'idem-A' });
    const r2 = await provider.createCharge({ ...base, idempotencyKey: 'idem-B' });

    expect(r1.chargeId).not.toBe(r2.chargeId);
  });

  // ── handleWebhook idempotência ─────────────────────────────────────────

  it('handleWebhook idempotente: reprocessar o mesmo webhook não duplica estado', async () => {
    // Criar cobrança primeiro
    const chargeResult = await provider.createCharge({
      orderId: 'order-wh',
      tenantId: 'tenant-wh',
      amount: 8_000,
      paymentMethod: 'pix' as const,
      customer: { name: 'Carlos Ferreira', email: 'carlos@test.com' },
      items: [{ id: 'kit-ouro', description: 'Kit Ouro', amount: 8_000, quantity: 1 }],
      idempotencyKey: 'idem-wh-001',
    });

    const payload = {
      event: 'charge.confirmed',
      data: { chargeId: chargeResult.chargeId, amount: 8_000 },
      signature: 'mock-sig-valid',
      deliveredAt: new Date().toISOString(),
    };

    const r1 = await provider.handleWebhook(payload);
    const r2 = await provider.handleWebhook(payload); // reprocessar

    // Mesmo resultado
    expect(r2.chargeId).toBe(r1.chargeId);
    expect(r2.amount).toBe(r1.amount);
    expect(r2.status).toBe('confirmed');

    // Estado interno não duplicou
    const stored = provider.getCharge(chargeResult.chargeId);
    expect(stored?.status).toBe('confirmed');
  });

  it('handleWebhook rejeita payload sem assinatura', async () => {
    const payload = {
      event: 'charge.confirmed',
      data: { chargeId: 'mock_charge_1_order', amount: 1_000 },
      signature: '',
      deliveredAt: new Date().toISOString(),
    };

    await expect(provider.handleWebhook(payload)).rejects.toThrow('assinatura');
  });

  // ── refund idempotência ────────────────────────────────────────────────

  it('refund idempotente: reprocessar mesma idempotencyKey não duplica estorno', async () => {
    const chargeResult = await provider.createCharge({
      orderId: 'order-ref',
      tenantId: 'tenant-ref',
      amount: 4_000,
      paymentMethod: 'pix' as const,
      customer: { name: 'Maria Campos', email: 'maria@test.com' },
      items: [{ id: 'kit-basico', description: 'Kit Básico', amount: 4_000, quantity: 1 }],
      idempotencyKey: 'idem-ref-001',
    });

    const refundParams = {
      chargeId: chargeResult.chargeId,
      tenantId: 'tenant-ref',
      reason: 'Cancelamento pelo atleta',
      idempotencyKey: 'refund-idem-001',
    };

    const r1 = await provider.refund(refundParams);
    const r2 = await provider.refund(refundParams); // reprocessar

    expect(r1.refundId).toBe(r2.refundId);
    expect(r1.amount).toBe(r2.amount);
    expect(r2.status).toBe('approved');
  });

  // ── splitRules ─────────────────────────────────────────────────────────

  it('splitRules calcula split correto sobre cobrança existente', async () => {
    const chargeResult = await provider.createCharge({
      orderId: 'order-split',
      tenantId: 'tenant-split',
      amount: 10_000,
      paymentMethod: 'credit_card' as const,
      customer: { name: 'Pedro Costa', email: 'pedro@test.com' },
      items: [{ id: 'kit-ouro', description: 'Kit Ouro', amount: 10_000, quantity: 1 }],
      idempotencyKey: 'idem-split-001',
    });

    const splitResult = await provider.splitRules({
      chargeId: chargeResult.chargeId,
      tenantId: 'tenant-split',
      platformFeePct: 5,
      recipients: [{ recipientId: 'producer-split', percentage: 95 }],
    });

    expect(splitResult.chargeId).toBe(chargeResult.chargeId);
    expect(splitResult.recipients[0]?.amount).toBe(9_500);
  });

  // ── getPayout ─────────────────────────────────────────────────────────

  it('getPayout agrega total confirmado do tenant', async () => {
    await provider.createCharge({
      orderId: 'order-p1',
      tenantId: 'tenant-payout',
      amount: 5_000,
      paymentMethod: 'pix' as const,
      customer: { name: 'Atleta A', email: 'a@test.com' },
      items: [{ id: 'i1', description: 'Kit', amount: 5_000, quantity: 1 }],
      idempotencyKey: 'idem-p1',
    });

    await provider.createCharge({
      orderId: 'order-p2',
      tenantId: 'tenant-payout',
      amount: 3_000,
      paymentMethod: 'pix' as const,
      customer: { name: 'Atleta B', email: 'b@test.com' },
      items: [{ id: 'i2', description: 'Kit', amount: 3_000, quantity: 1 }],
      idempotencyKey: 'idem-p2',
    });

    const payout = await provider.getPayout({
      tenantId: 'tenant-payout',
    });

    expect(payout.amount).toBe(8_000);
    expect(payout.tenantId).toBe('tenant-payout');
    expect(payout.status).toBe('scheduled');
  });

  // ── singleton reset ───────────────────────────────────────────────────

  it('singleton mockPaymentProvider pode ser resetado entre testes', async () => {
    mockPaymentProvider.reset();
    // Após reset, nenhuma cobrança existente
    const payout = await mockPaymentProvider.getPayout({ tenantId: 'x' });
    expect(payout.amount).toBe(0);
  });
});
