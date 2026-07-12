/**
 * selectProvider.test.ts — LEELA-E12 (fundação do checkout)
 *
 * Unit (sem I/O): seleção FAIL-SAFE do PaymentProvider + payload de webhook
 * mock assinado (o caminho que fecha o checkout sem gateway real).
 *
 * Invariante inviolável (brief): o sandbox NUNCA roda se houver chave real
 * configurada — chave presente sem adapter = parada dura, jamais fallback.
 */

import { describe, expect, it } from 'vitest';
import {
  AsaasNaoImplementadoError,
  ASAAS_API_KEY_ENV,
  hasAsaasKey,
  selectPaymentProvider,
} from '../payments/selectProvider';
import {
  MockPaymentProvider,
  buildMockWebhookPayload,
  mockPaymentProvider,
} from '../payments/mockProvider';

describe('selectPaymentProvider — fail-safe (E12)', () => {
  it('SEM chave Asaas → devolve o MockPaymentProvider (sandbox)', () => {
    const provider = selectPaymentProvider({});
    expect(provider).toBe(mockPaymentProvider);
    expect(provider).toBeInstanceOf(MockPaymentProvider);
  });

  it('COM chave Asaas → LANÇA (sandbox nunca roda com chave real)', () => {
    expect(() =>
      selectPaymentProvider({ [ASAAS_API_KEY_ENV]: 'asaas_live_key_123' })
    ).toThrow(AsaasNaoImplementadoError);
  });

  it('chave vazia/whitespace conta como AUSENTE (env var zumbi não ativa gateway)', () => {
    expect(hasAsaasKey({ [ASAAS_API_KEY_ENV]: '' })).toBe(false);
    expect(hasAsaasKey({ [ASAAS_API_KEY_ENV]: '   ' })).toBe(false);
    expect(selectPaymentProvider({ [ASAAS_API_KEY_ENV]: '  ' })).toBe(mockPaymentProvider);
  });

  it('hasAsaasKey detecta chave real', () => {
    expect(hasAsaasKey({ [ASAAS_API_KEY_ENV]: 'k'.repeat(32) })).toBe(true);
    expect(hasAsaasKey({})).toBe(false);
  });
});

describe('buildMockWebhookPayload — webhook simulado assinado', () => {
  it('payload construído passa na verificação HMAC do provider', async () => {
    const provider = new MockPaymentProvider();
    const payload = buildMockWebhookPayload('charge.confirmed', {
      chargeId: 'mock_charge_1_ped-x',
      orderId: 'ped-x',
      amount: 18990,
      eventId: 'evt-1',
    });

    const resultado = await provider.handleWebhook(payload);
    expect(resultado.status).toBe('confirmed');
    expect(resultado.chargeId).toBe('mock_charge_1_ped-x');
    expect(resultado.amount).toBe(18990);
  });

  it('payload ADULTERADO após a assinatura é rejeitado (integridade)', async () => {
    const provider = new MockPaymentProvider();
    const payload = buildMockWebhookPayload('charge.confirmed', {
      chargeId: 'mock_charge_1_ped-x',
      amount: 18990,
    });
    // Ataque: muda o valor DEPOIS de assinar
    const adulterado = {
      ...payload,
      data: { ...payload.data, amount: 1 },
    };

    await expect(provider.handleWebhook(adulterado)).rejects.toThrow(/assinatura/);
  });

  it('evento desconhecido assinado é rejeitado (nunca vira confirmed)', async () => {
    const provider = new MockPaymentProvider();
    const payload = buildMockWebhookPayload('charge.hacked', { chargeId: 'c1' });
    await expect(provider.handleWebhook(payload)).rejects.toThrow(/desconhecido/);
  });
});
