/**
 * selectProvider.test.ts — LEELA-E12 → LEELA-R6 (ativação do Asaas)
 *
 * Unit (sem I/O): seleção do PaymentProvider pós-ativação.
 *
 * Invariantes invioláveis:
 *   - SEM chave → Mock (sandbox local).
 *   - COM chave sandbox ($aact_hmlg_) + token → AsaasProvider REAL apontado
 *     para a api-sandbox (ambiente derivado do prefixo).
 *   - COM chave e config INVÁLIDA → LANÇA. NUNCA degrada para Mock com
 *     chave presente (downgrade silencioso = o pior modo de falha).
 *   - Chave de PRODUÇÃO NUNCA ativa por este seletor (permitirProducao
 *     não é passado — construção falha).
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  ASAAS_API_KEY_ENV,
  hasAsaasKey,
  resetAsaasProviderCache,
  selectPaymentProvider,
} from '../payments/selectProvider';
import {
  AsaasConfigError,
  AsaasProvider,
  ASAAS_SANDBOX_BASE_URL,
  ASAAS_WEBHOOK_TOKEN_ENV,
} from '../payments/asaasProvider';
import {
  MockPaymentProvider,
  buildMockWebhookPayload,
  mockPaymentProvider,
} from '../payments/mockProvider';

/** Chaves SINTÉTICAS (formato válido, valor inventado — nunca a real). */
const CHAVE_SANDBOX = `$aact_hmlg_${'s'.repeat(120)}`;
const CHAVE_PROD = `$aact_prod_${'p'.repeat(120)}`;
const TOKEN_WEBHOOK = 'token-webhook-de-teste-com-40-caracteres!';

const envSandbox = (): Record<string, string | undefined> => ({
  [ASAAS_API_KEY_ENV]: CHAVE_SANDBOX,
  [ASAAS_WEBHOOK_TOKEN_ENV]: TOKEN_WEBHOOK,
});

afterEach(() => {
  resetAsaasProviderCache();
});

describe('selectPaymentProvider — pós-ativação R6', () => {
  it('SEM chave Asaas → devolve o MockPaymentProvider (sandbox local)', () => {
    const provider = selectPaymentProvider({});
    expect(provider).toBe(mockPaymentProvider);
    expect(provider).toBeInstanceOf(MockPaymentProvider);
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

  it('chave SANDBOX + token → AsaasProvider real apontado para a api-sandbox', () => {
    const provider = selectPaymentProvider(envSandbox());
    expect(provider).toBeInstanceOf(AsaasProvider);
    const asaas = provider as AsaasProvider;
    expect(asaas.environment).toBe('sandbox');
    expect(asaas.baseUrl).toBe(ASAAS_SANDBOX_BASE_URL);
  });

  it('mesma config → MESMA instância (dedup em memória sobrevive entre requests)', () => {
    const a = selectPaymentProvider(envSandbox());
    const b = selectPaymentProvider(envSandbox());
    expect(a).toBe(b);
  });

  it('config mudou (rotação de token) → instância NOVA', () => {
    const a = selectPaymentProvider(envSandbox());
    const b = selectPaymentProvider({
      ...envSandbox(),
      [ASAAS_WEBHOOK_TOKEN_ENV]: 'outro-token-de-webhook-com-40-caracteres',
    });
    expect(a).not.toBe(b);
  });

  it('chave presente SEM token de webhook → LANÇA (nunca Mock)', () => {
    expect(() =>
      selectPaymentProvider({ [ASAAS_API_KEY_ENV]: CHAVE_SANDBOX })
    ).toThrow(AsaasConfigError);
  });

  it('token de webhook FRACO (< 32 chars) → LANÇA (nunca Mock)', () => {
    expect(() =>
      selectPaymentProvider({
        [ASAAS_API_KEY_ENV]: CHAVE_SANDBOX,
        [ASAAS_WEBHOOK_TOKEN_ENV]: 'curto',
      })
    ).toThrow(AsaasConfigError);
  });

  it('chave de PRODUÇÃO → LANÇA (seletor nunca passa permitirProducao)', () => {
    expect(() =>
      selectPaymentProvider({
        [ASAAS_API_KEY_ENV]: CHAVE_PROD,
        [ASAAS_WEBHOOK_TOKEN_ENV]: TOKEN_WEBHOOK,
      })
    ).toThrow(AsaasConfigError);
  });

  it('chave com prefixo irreconhecível → LANÇA (ambiente indeterminável)', () => {
    expect(() =>
      selectPaymentProvider({
        [ASAAS_API_KEY_ENV]: 'chave-sem-prefixo-asaas-qualquer',
        [ASAAS_WEBHOOK_TOKEN_ENV]: TOKEN_WEBHOOK,
      })
    ).toThrow(AsaasConfigError);
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
