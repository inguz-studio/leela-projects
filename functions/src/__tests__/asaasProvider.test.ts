/**
 * asaasProvider.test.ts — AsaasProvider (ADR-006) com HTTP 100% MOCKADO.
 *
 * ⛔ REGRA DO BRIEF (leela-asaas-adapter): NENHUMA chamada de rede real.
 * O transporte é injetado (fetchFn fake); o fetch GLOBAL é stubado para
 * LANÇAR se qualquer código tentar a rede. Nenhum teste usa ASAAS_API_KEY
 * nem chave real — as chaves aqui são strings sintéticas com o prefixo
 * documentado. A sanidade read-only contra conta real fica em describe.skip
 * (quem decide rodar é o maestro, nunca esta suíte).
 *
 * Cobertura:
 *   1. Construção: derivação de ambiente por prefixo, conflito, trava de
 *      produção (permitirProducao), token de webhook fraco.
 *   2. Helpers puros: centavos↔reais, externalReference build/parse.
 *   3. createCharge PIX: lookup idempotente → cliente → cobrança → QR.
 *   4. createCharge cartão: 1x (value) vs 3x (installmentCount+totalValue).
 *   5. Idempotência: replay devolve a cobrança existente SEM POST.
 *   6. Erros 4xx/5xx/429 → AsaasApiError sem vazar a chave.
 *   7. refund: total/parcial, mapa de status, idempotência, 400 não cacheia.
 *   8. Webhook: token em tempo constante ANTES do parse, idempotência por
 *      entrega, mapa evento→status, bloco cartao, value (nunca netValue).
 *   9. splitRules/getPayout: falha ALTA explícita (gaps documentados).
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import type { CreateChargeParams, WebhookPayload } from '@leela/core';
import {
  AsaasProvider,
  AsaasApiError,
  AsaasConfigError,
  AsaasMappingError,
  AsaasOperacaoNaoSuportadaError,
  AsaasValidationError,
  AsaasWebhookAssinaturaError,
  ASAAS_PRODUCTION_BASE_URL,
  ASAAS_SANDBOX_BASE_URL,
  buildExternalReference,
  centavosFromReais,
  createAsaasProvider,
  deriveAsaasEnvironment,
  parseExternalReference,
  reaisFromCentavos,
  type FetchLike,
} from '../payments/asaasProvider';

// ---------------------------------------------------------------------------
// Guard-rail: rede real PROIBIDA — qualquer fetch global lança.
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubGlobal('fetch', () => {
    throw new Error('REDE REAL PROIBIDA na suíte (brief leela-asaas-adapter)');
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Chaves SINTÉTICAS (prefixos documentados; nunca chaves reais). */
const SANDBOX_KEY = `$aact_hmlg_${'0'.repeat(40)}`;
const PROD_KEY = `$aact_prod_${'0'.repeat(40)}`;
/** authToken de webhook sintético (32–255 chars, sem espaços). */
const WEBHOOK_TOKEN = 'leela-webhook-token-0123456789abcdef0123456789';

const AGORA = new Date('2026-07-12T12:00:00.000Z');

interface Expectativa {
  method: 'GET' | 'POST';
  /** Trecho que a URL deve conter. */
  url: string;
  status?: number;
  json?: unknown;
  headers?: Record<string, string>;
}

interface Chamada {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: Record<string, unknown>;
}

/** Fila SEQUENCIAL de expectativas: chamada fora de ordem/extra = throw. */
function fakeFetch(expectativas: Expectativa[]): {
  fetchFn: FetchLike;
  chamadas: Chamada[];
  pendentes: () => number;
} {
  const fila = [...expectativas];
  const chamadas: Chamada[] = [];
  const fetchFn: FetchLike = async (url, init) => {
    const exp = fila.shift();
    if (exp === undefined) {
      throw new Error(`Chamada HTTP inesperada: ${init.method} ${url}`);
    }
    if (init.method !== exp.method || !url.includes(exp.url)) {
      throw new Error(
        `Esperava ${exp.method} *${exp.url}*, veio ${init.method} ${url}`
      );
    }
    chamadas.push({
      method: init.method,
      url,
      headers: init.headers,
      ...(init.body !== undefined
        ? { body: JSON.parse(init.body) as Record<string, unknown> }
        : {}),
    });
    const respHeaders = exp.headers ?? {};
    return {
      status: exp.status ?? 200,
      headers: { get: (n: string) => respHeaders[n] ?? null },
      text: async () =>
        exp.json === undefined ? '' : JSON.stringify(exp.json),
    };
  };
  return { fetchFn, chamadas, pendentes: () => fila.length };
}

function novoProvider(
  expectativas: Expectativa[],
  overrides: Partial<ConstructorParameters<typeof AsaasProvider>[0]> = {}
): { provider: AsaasProvider; chamadas: Chamada[]; pendentes: () => number } {
  const ff = fakeFetch(expectativas);
  const provider = new AsaasProvider({
    apiKey: SANDBOX_KEY,
    webhookAuthToken: WEBHOOK_TOKEN,
    fetchFn: ff.fetchFn,
    now: () => AGORA,
    ...overrides,
  });
  return { provider, chamadas: ff.chamadas, pendentes: ff.pendentes };
}

function paramsPix(overrides: Partial<CreateChargeParams> = {}): CreateChargeParams {
  return {
    orderId: 'ped-1',
    tenantId: 'tenant-1',
    amount: 9_999, // R$ 99,99 — de propósito NÃO-redondo (bug clássico)
    paymentMethod: 'pix',
    customer: {
      name: 'Maria Silva',
      email: 'maria@example.com',
      taxId: '529.982.247-25',
      phone: '11999999999',
    },
    items: [
      {
        id: 'ev-1',
        description: 'Inscrições (2) — evento ev-1',
        amount: 9_999,
        quantity: 1,
      },
    ],
    idempotencyKey: 'charge-ped-1',
    ...overrides,
  };
}

function webhookPayload(
  event: string,
  payment: Record<string, unknown>,
  opts: { signature?: string; eventId?: string } = {}
): WebhookPayload {
  return {
    event,
    data: {
      id: opts.eventId ?? 'evt_0001',
      event,
      payment,
    },
    // No Asaas real a "assinatura" é o header `asaas-access-token`
    // (authToken cadastrado), que a camada HTTP põe em signature.
    signature: opts.signature ?? WEBHOOK_TOKEN,
    deliveredAt: '2026-07-12T12:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// 1. Construção — ambiente por prefixo + travas fail-closed
// ---------------------------------------------------------------------------

describe('AsaasProvider — construção e ambiente (Schneier: fail-closed)', () => {
  it('chave $aact_hmlg_ → sandbox com base URL de sandbox', () => {
    const { provider } = novoProvider([]);
    expect(provider.environment).toBe('sandbox');
    expect(provider.baseUrl).toBe(ASAAS_SANDBOX_BASE_URL);
  });

  it('chave de produção SEM permitirProducao → LANÇA (nunca por acidente)', () => {
    expect(() => novoProvider([], { apiKey: PROD_KEY })).toThrow(
      AsaasConfigError
    );
  });

  it('chave de produção COM permitirProducao=true → production', () => {
    const { provider } = novoProvider([], {
      apiKey: PROD_KEY,
      permitirProducao: true,
    });
    expect(provider.environment).toBe('production');
    expect(provider.baseUrl).toBe(ASAAS_PRODUCTION_BASE_URL);
  });

  it('conflito prefixo sandbox × environment production → LANÇA', () => {
    expect(() =>
      novoProvider([], { environment: 'production', permitirProducao: true })
    ).toThrow(AsaasConfigError);
  });

  it('chave sem prefixo $aact_ e sem environment explícito → LANÇA', () => {
    expect(() => novoProvider([], { apiKey: 'chave-sem-prefixo' })).toThrow(
      AsaasConfigError
    );
  });

  it('chave sem prefixo COM environment explícito sandbox → aceita', () => {
    const { provider } = novoProvider([], {
      apiKey: 'chave-sem-prefixo',
      environment: 'sandbox',
    });
    expect(provider.environment).toBe('sandbox');
  });

  it('webhookAuthToken fraco (curto/espaço) ou igual à apiKey → LANÇA', () => {
    expect(() => novoProvider([], { webhookAuthToken: 'curto' })).toThrow(
      AsaasConfigError
    );
    expect(() =>
      novoProvider([], { webhookAuthToken: `${WEBHOOK_TOKEN} com espaco` })
    ).toThrow(AsaasConfigError);
    expect(() => novoProvider([], { webhookAuthToken: SANDBOX_KEY })).toThrow(
      AsaasConfigError
    );
  });

  it('deriveAsaasEnvironment: hmlg→sandbox; $aact_ não-hmlg→production', () => {
    expect(deriveAsaasEnvironment(SANDBOX_KEY)).toBe('sandbox');
    expect(deriveAsaasEnvironment(PROD_KEY)).toBe('production');
    expect(deriveAsaasEnvironment('$aact_YTU5YTk')).toBe('production');
    expect(() => deriveAsaasEnvironment('foo')).toThrow(AsaasConfigError);
    expect(deriveAsaasEnvironment('foo', 'sandbox')).toBe('sandbox');
    expect(() => deriveAsaasEnvironment(SANDBOX_KEY, 'production')).toThrow(
      AsaasConfigError
    );
  });

  it('createAsaasProvider (factory do futuro registry ADR-013) constrói', () => {
    const provider = createAsaasProvider({
      apiKey: SANDBOX_KEY,
      webhookAuthToken: WEBHOOK_TOKEN,
      fetchFn: fakeFetch([]).fetchFn,
    });
    expect(provider).toBeInstanceOf(AsaasProvider);
  });
});

// ---------------------------------------------------------------------------
// 2. Helpers puros — dinheiro e externalReference
// ---------------------------------------------------------------------------

describe('conversão centavos↔reais (só na borda; valores não-redondos)', () => {
  it('reaisFromCentavos: 9999→99.99, 999→9.99, 1→0.01, 0→0', () => {
    expect(reaisFromCentavos(9_999)).toBe(99.99);
    expect(reaisFromCentavos(999)).toBe(9.99);
    expect(reaisFromCentavos(1)).toBe(0.01);
    expect(reaisFromCentavos(0)).toBe(0);
  });

  it('reaisFromCentavos rejeita não-inteiro e negativo', () => {
    expect(() => reaisFromCentavos(99.5)).toThrow(AsaasValidationError);
    expect(() => reaisFromCentavos(-1)).toThrow(AsaasValidationError);
  });

  it('centavosFromReais: 99.99→9999, 189.9→18990, arredonda FP', () => {
    expect(centavosFromReais(99.99)).toBe(9_999);
    expect(centavosFromReais(189.9)).toBe(18_990);
    expect(centavosFromReais(0.1 + 0.2)).toBe(30); // 0.30000000000000004
  });

  it('centavosFromReais rejeita não-finito', () => {
    expect(() => centavosFromReais(Number.NaN)).toThrow(AsaasMappingError);
    expect(() => centavosFromReais(Number.POSITIVE_INFINITY)).toThrow(
      AsaasMappingError
    );
  });
});

describe('externalReference — idempotência + orderId num campo só', () => {
  it('build/parse fazem round-trip', () => {
    const ref = buildExternalReference('ped-1', 'charge-ped-1');
    expect(ref).toBe('ped-1::charge-ped-1');
    expect(parseExternalReference(ref)).toEqual({
      orderId: 'ped-1',
      idempotencyKey: 'charge-ped-1',
    });
  });

  it('orderId com "::" é rejeitado (quebraria o parse)', () => {
    expect(() => buildExternalReference('ped::1', 'k')).toThrow(
      AsaasValidationError
    );
  });

  it('parse separa no PRIMEIRO "::" (key pode conter "::")', () => {
    expect(parseExternalReference('ped-1::k::v2')).toEqual({
      orderId: 'ped-1',
      idempotencyKey: 'k::v2',
    });
    expect(parseExternalReference('sem-separador')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 3. createCharge — PIX
// ---------------------------------------------------------------------------

describe('createCharge PIX — lookup → cliente → cobrança → QR', () => {
  it('caminho feliz: monta requests corretos e mapeia a resposta', async () => {
    const { provider, chamadas, pendentes } = novoProvider([
      {
        method: 'GET',
        url: '/payments?externalReference=ped-1%3A%3Acharge-ped-1',
        json: { object: 'list', data: [] },
      },
      {
        method: 'GET',
        url: '/customers?cpfCnpj=52998224725',
        json: { object: 'list', data: [] },
      },
      {
        method: 'POST',
        url: '/customers',
        json: { id: 'cus_001', name: 'Maria Silva' },
      },
      {
        method: 'POST',
        url: '/payments',
        json: {
          id: 'pay_001',
          status: 'PENDING',
          billingType: 'PIX',
          value: 99.99,
          invoiceUrl: 'https://sandbox.asaas.com/i/pay_001',
        },
      },
      {
        method: 'GET',
        url: '/payments/pay_001/pixQrCode',
        json: {
          encodedImage: 'base64...',
          payload: 'pix-copia-e-cola-001',
          expirationDate: '2026-07-13 23:59:59',
        },
      },
    ]);

    const result = await provider.createCharge(paramsPix());

    expect(result.chargeId).toBe('pay_001');
    expect(result.status).toBe('pending');
    expect(result.paymentUrl).toBe('https://sandbox.asaas.com/i/pay_001');
    expect(result.qrCode).toBe('pix-copia-e-cola-001');
    expect(result.expiresAt).toBeDefined();
    expect(pendentes()).toBe(0);

    // Transporte: base sandbox + headers de auth em TODA chamada
    for (const c of chamadas) {
      expect(c.url.startsWith(ASAAS_SANDBOX_BASE_URL)).toBe(true);
      expect(c.headers['access_token']).toBe(SANDBOX_KEY);
      expect(c.headers['User-Agent']).toBe('leela-app');
      expect(c.headers['Content-Type']).toBe('application/json');
    }

    // Cliente criado com cpfCnpj SÓ dígitos + rastreio de tenant
    const bodyCliente = chamadas[2]?.body;
    expect(bodyCliente?.['cpfCnpj']).toBe('52998224725');
    expect(bodyCliente?.['mobilePhone']).toBe('11999999999');
    expect(bodyCliente?.['externalReference']).toBe('leela-tenant:tenant-1');

    // Cobrança: centavos→reais na borda (9999 → 99.99), 1x usa `value`
    const bodyCobranca = chamadas[3]?.body;
    expect(bodyCobranca?.['customer']).toBe('cus_001');
    expect(bodyCobranca?.['billingType']).toBe('PIX');
    expect(bodyCobranca?.['value']).toBe(99.99);
    expect(bodyCobranca?.['dueDate']).toBe('2026-07-13'); // now UTC + 1 dia
    expect(bodyCobranca?.['externalReference']).toBe('ped-1::charge-ped-1');
    expect(bodyCobranca?.['installmentCount']).toBeUndefined();
    expect(bodyCobranca?.['totalValue']).toBeUndefined();
  });

  it('cliente EXISTENTE (lookup por cpfCnpj) → não cria duplicado', async () => {
    const { provider, chamadas, pendentes } = novoProvider([
      {
        method: 'GET',
        url: '/payments?externalReference=',
        json: { data: [] },
      },
      {
        method: 'GET',
        url: '/customers?cpfCnpj=52998224725',
        json: { data: [{ id: 'cus_reuso' }] },
      },
      {
        method: 'POST',
        url: '/payments',
        json: { id: 'pay_002', status: 'PENDING', billingType: 'PIX' },
      },
      {
        method: 'GET',
        url: '/payments/pay_002/pixQrCode',
        json: { payload: 'qr-002' },
      },
    ]);

    const result = await provider.createCharge(paramsPix());
    expect(result.chargeId).toBe('pay_002');
    expect(chamadas[2]?.body?.['customer']).toBe('cus_reuso');
    expect(pendentes()).toBe(0); // nenhum POST /customers aconteceu
  });

  it('falha no pixQrCode NÃO orfana a cobrança (degrada sem qrCode)', async () => {
    const { provider } = novoProvider([
      { method: 'GET', url: '/payments?externalReference=', json: { data: [] } },
      { method: 'GET', url: '/customers?', json: { data: [{ id: 'cus_1' }] } },
      {
        method: 'POST',
        url: '/payments',
        json: {
          id: 'pay_003',
          status: 'PENDING',
          billingType: 'PIX',
          invoiceUrl: 'https://sandbox.asaas.com/i/pay_003',
        },
      },
      {
        method: 'GET',
        url: '/payments/pay_003/pixQrCode',
        status: 404,
        json: { errors: [{ code: 'not_found', description: 'não pronto' }] },
      },
    ]);

    const result = await provider.createCharge(paramsPix());
    expect(result.chargeId).toBe('pay_003');
    expect(result.qrCode).toBeUndefined();
    expect(result.paymentUrl).toBe('https://sandbox.asaas.com/i/pay_003');
  });
});

// ---------------------------------------------------------------------------
// 4. createCharge — cartão (regra 1x vs 2x+ do Asaas)
// ---------------------------------------------------------------------------

describe('createCharge cartão — parcelamento', () => {
  const paramsCartao = (parcelas?: number): CreateChargeParams =>
    paramsPix({
      paymentMethod: 'credit_card',
      amount: 30_000,
      ...(parcelas !== undefined ? { installments: parcelas } : {}),
    });

  it('3x → installmentCount + totalValue, NUNCA value', async () => {
    const { provider, chamadas } = novoProvider([
      { method: 'GET', url: '/payments?externalReference=', json: { data: [] } },
      { method: 'GET', url: '/customers?', json: { data: [{ id: 'cus_1' }] } },
      {
        method: 'POST',
        url: '/payments',
        json: { id: 'pay_c3', status: 'PENDING', billingType: 'CREDIT_CARD' },
      },
    ]);

    const result = await provider.createCharge(paramsCartao(3));
    expect(result.chargeId).toBe('pay_c3');

    const body = chamadas[2]?.body;
    expect(body?.['billingType']).toBe('CREDIT_CARD');
    expect(body?.['installmentCount']).toBe(3);
    expect(body?.['totalValue']).toBe(300);
    expect(body?.['value']).toBeUndefined();
  });

  it('1x → value, NUNCA installmentCount (e sem chamada de pixQrCode)', async () => {
    const { provider, chamadas, pendentes } = novoProvider([
      { method: 'GET', url: '/payments?externalReference=', json: { data: [] } },
      { method: 'GET', url: '/customers?', json: { data: [{ id: 'cus_1' }] } },
      {
        method: 'POST',
        url: '/payments',
        json: { id: 'pay_c1', status: 'PENDING', billingType: 'CREDIT_CARD' },
      },
    ]);

    await provider.createCharge(paramsCartao(1));
    const body = chamadas[2]?.body;
    expect(body?.['value']).toBe(300);
    expect(body?.['installmentCount']).toBeUndefined();
    expect(pendentes()).toBe(0);
  });

  it('parcelas > 1 fora do cartão → AsaasValidationError SEM HTTP', async () => {
    const { provider, chamadas } = novoProvider([]);
    await expect(
      provider.createCharge(paramsPix({ installments: 3 }))
    ).rejects.toThrow(AsaasValidationError);
    expect(chamadas).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 5. Idempotência do createCharge (Kleppmann — replay sem duplicar)
// ---------------------------------------------------------------------------

describe('createCharge — idempotência via externalReference', () => {
  it('cobrança JÁ existente → devolve o resultado SEM novo POST', async () => {
    const { provider, pendentes } = novoProvider([
      {
        method: 'GET',
        url: '/payments?externalReference=ped-1%3A%3Acharge-ped-1',
        json: {
          data: [
            {
              id: 'pay_777',
              status: 'PENDING',
              billingType: 'PIX',
              invoiceUrl: 'https://sandbox.asaas.com/i/pay_777',
            },
          ],
        },
      },
      {
        method: 'GET',
        url: '/payments/pay_777/pixQrCode',
        json: { payload: 'qr-777' },
      },
    ]);

    const result = await provider.createCharge(paramsPix());
    expect(result.chargeId).toBe('pay_777');
    expect(result.qrCode).toBe('qr-777');
    expect(pendentes()).toBe(0); // fila sem POST: qualquer POST teria lançado
  });

  it('cobrança existente JÁ confirmada → status confirmed, sem QR', async () => {
    const { provider, pendentes } = novoProvider([
      {
        method: 'GET',
        url: '/payments?externalReference=',
        json: { data: [{ id: 'pay_888', status: 'CONFIRMED', billingType: 'PIX' }] },
      },
    ]);

    const result = await provider.createCharge(paramsPix());
    expect(result.status).toBe('confirmed');
    expect(pendentes()).toBe(0);
  });

  it('DUAS cobranças com a mesma chave → erro alto (nunca escolher em silêncio)', async () => {
    const { provider } = novoProvider([
      {
        method: 'GET',
        url: '/payments?externalReference=',
        json: { data: [{ id: 'pay_a' }, { id: 'pay_b' }] },
      },
    ]);

    await expect(provider.createCharge(paramsPix())).rejects.toThrow(
      AsaasMappingError
    );
  });

  it('validações locais falham ANTES de qualquer HTTP', async () => {
    const { provider, chamadas } = novoProvider([]);
    await expect(
      provider.createCharge(paramsPix({ amount: 0 }))
    ).rejects.toThrow(AsaasValidationError);
    await expect(
      provider.createCharge(paramsPix({ amount: 99.5 }))
    ).rejects.toThrow(AsaasValidationError);
    await expect(
      provider.createCharge(paramsPix({ orderId: 'ped::1' }))
    ).rejects.toThrow(AsaasValidationError);
    await expect(
      provider.createCharge(paramsPix({ idempotencyKey: '  ' }))
    ).rejects.toThrow(AsaasValidationError);
    expect(chamadas).toHaveLength(0);
  });

  it('taxId ausente → erro claro (Asaas exige cpfCnpj no cliente)', async () => {
    const { provider } = novoProvider([
      { method: 'GET', url: '/payments?externalReference=', json: { data: [] } },
    ]);
    await expect(
      provider.createCharge(
        paramsPix({
          customer: { name: 'Sem CPF', email: 'x@example.com' },
        })
      )
    ).rejects.toThrow(/taxId/);
  });
});

// ---------------------------------------------------------------------------
// 6. Erros HTTP → AsaasApiError (sem vazar a chave)
// ---------------------------------------------------------------------------

describe('erros do gateway — 4xx/5xx/429 viram erro de domínio', () => {
  it('400 com errors[] → httpStatus, code e description; SEM a apiKey', async () => {
    const { provider } = novoProvider([
      { method: 'GET', url: '/payments?externalReference=', json: { data: [] } },
      { method: 'GET', url: '/customers?', json: { data: [{ id: 'cus_1' }] } },
      {
        method: 'POST',
        url: '/payments',
        status: 400,
        json: {
          errors: [{ code: 'invalid_value', description: 'Valor inválido' }],
        },
      },
    ]);

    let capturado: unknown;
    try {
      await provider.createCharge(paramsPix());
    } catch (err) {
      capturado = err;
    }
    expect(capturado).toBeInstanceOf(AsaasApiError);
    const apiErr = capturado as AsaasApiError;
    expect(apiErr.httpStatus).toBe(400);
    expect(apiErr.codes).toContain('invalid_value');
    expect(apiErr.message).toContain('Valor inválido');
    expect(apiErr.message).not.toContain(SANDBOX_KEY);
  });

  it('500 com corpo não-JSON → AsaasApiError httpStatus 500', async () => {
    const { provider } = novoProvider([
      {
        method: 'GET',
        url: '/payments?externalReference=',
        status: 500,
        json: undefined,
      },
    ]);
    let capturado: unknown;
    try {
      await provider.createCharge(paramsPix());
    } catch (err) {
      capturado = err;
    }
    expect(capturado).toBeInstanceOf(AsaasApiError);
    expect((capturado as AsaasApiError).httpStatus).toBe(500);
  });

  it('401 invalid_environment (chave×URL trocadas) é reportado como veio', async () => {
    const { provider } = novoProvider([
      {
        method: 'GET',
        url: '/payments?externalReference=',
        status: 401,
        json: { errors: [{ code: 'invalid_environment', description: 'env' }] },
      },
    ]);
    await expect(provider.createCharge(paramsPix())).rejects.toMatchObject({
      httpStatus: 401,
      codes: ['invalid_environment'],
    });
  });

  it('429 expõe RateLimit-Reset (não há Retry-After no Asaas)', async () => {
    const { provider } = novoProvider([
      {
        method: 'GET',
        url: '/payments?externalReference=',
        status: 429,
        json: {},
        headers: { 'RateLimit-Reset': '30' },
      },
    ]);
    await expect(provider.createCharge(paramsPix())).rejects.toMatchObject({
      httpStatus: 429,
      rateLimitResetSeconds: 30,
    });
  });
});

// ---------------------------------------------------------------------------
// 7. refund
// ---------------------------------------------------------------------------

describe('refund — total/parcial, mapa de status, idempotência', () => {
  const refundParams = (amount?: number) => ({
    chargeId: 'pay_1',
    tenantId: 'tenant-1',
    reason: 'Cancelamento a pedido do inscrito',
    idempotencyKey: 'refund-ped-1',
    ...(amount !== undefined ? { amount } : {}),
  });

  const respostaRefund = (status: string, value: number) => ({
    id: 'pay_1',
    status: 'REFUNDED',
    refunds: [
      {
        id: 'ref_001',
        status,
        value,
        dateCreated: '2026-07-12 10:00:00',
        description: 'Cancelamento a pedido do inscrito',
      },
    ],
  });

  it('estorno TOTAL: body SEM value; DONE → approved; reais→centavos', async () => {
    const { provider, chamadas } = novoProvider([
      {
        method: 'POST',
        url: '/payments/pay_1/refund',
        json: respostaRefund('DONE', 99.99),
      },
    ]);

    const result = await provider.refund(refundParams());
    expect(result.refundId).toBe('ref_001');
    expect(result.chargeId).toBe('pay_1');
    expect(result.status).toBe('approved');
    expect(result.amount).toBe(9_999);

    const body = chamadas[0]?.body;
    expect(body?.['value']).toBeUndefined(); // total = omitir value
    expect(body?.['description']).toBe('Cancelamento a pedido do inscrito');
  });

  it('estorno PARCIAL: value em reais; PENDING → pending', async () => {
    const { provider, chamadas } = novoProvider([
      {
        method: 'POST',
        url: '/payments/pay_1/refund',
        json: respostaRefund('PENDING', 50),
      },
    ]);

    const result = await provider.refund(refundParams(5_000));
    expect(result.status).toBe('pending');
    expect(result.amount).toBe(5_000);
    expect(chamadas[0]?.body?.['value']).toBe(50);
  });

  it('CANCELLED → rejected', async () => {
    const { provider } = novoProvider([
      {
        method: 'POST',
        url: '/payments/pay_1/refund',
        json: respostaRefund('CANCELLED', 99.99),
      },
    ]);
    const result = await provider.refund(refundParams());
    expect(result.status).toBe('rejected');
  });

  it('múltiplos refunds (PIX parcial) → usa o mais recente', async () => {
    const { provider } = novoProvider([
      {
        method: 'POST',
        url: '/payments/pay_1/refund',
        json: {
          refunds: [
            { status: 'DONE', value: 10, dateCreated: '2026-07-10 09:00:00' },
            {
              id: 'ref_novo',
              status: 'PENDING',
              value: 20,
              dateCreated: '2026-07-12 11:00:00',
            },
          ],
        },
      },
    ]);
    const result = await provider.refund(refundParams(2_000));
    expect(result.refundId).toBe('ref_novo');
    expect(result.amount).toBe(2_000);
  });

  it('idempotente: MESMA idempotencyKey → mesmo resultado, SEM novo HTTP', async () => {
    const { provider, chamadas } = novoProvider([
      {
        method: 'POST',
        url: '/payments/pay_1/refund',
        json: respostaRefund('DONE', 99.99),
      },
    ]);

    const r1 = await provider.refund(refundParams());
    const r2 = await provider.refund(refundParams());
    expect(r2).toBe(r1); // cache — replay devolve o MESMO resultado
    expect(chamadas).toHaveLength(1);
  });

  it('400 (ex.: PIX sem saldo) → erro de OPERAÇÃO e NÃO cacheia (retry re-tenta)', async () => {
    const { provider, chamadas } = novoProvider([
      {
        method: 'POST',
        url: '/payments/pay_1/refund',
        status: 400,
        json: { errors: [{ code: 'insufficient_balance', description: 'saldo' }] },
      },
      {
        method: 'POST',
        url: '/payments/pay_1/refund',
        json: respostaRefund('DONE', 99.99),
      },
    ]);

    await expect(provider.refund(refundParams())).rejects.toThrow(AsaasApiError);
    const result = await provider.refund(refundParams()); // retry vai ao gateway
    expect(result.status).toBe('approved');
    expect(chamadas).toHaveLength(2);
  });

  it('resposta sem refunds[] ou status desconhecido → AsaasMappingError', async () => {
    const casos = novoProvider([
      { method: 'POST', url: '/refund', json: { id: 'pay_1', status: 'REFUNDED' } },
      {
        method: 'POST',
        url: '/refund',
        json: { refunds: [{ status: 'ALIEN', value: 1, dateCreated: 'x' }] },
      },
    ]);
    await expect(casos.provider.refund(refundParams())).rejects.toThrow(
      AsaasMappingError
    );
    await expect(
      casos.provider.refund({ ...refundParams(), idempotencyKey: 'outra-k' })
    ).rejects.toThrow(AsaasMappingError);
  });
});

// ---------------------------------------------------------------------------
// 8. Webhook — autenticidade ANTES de tudo (Schneier), idempotência, mapa
// ---------------------------------------------------------------------------

describe('handleWebhook — verificação de autenticidade em tempo constante', () => {
  const paymentPix = (over: Record<string, unknown> = {}) => ({
    id: 'pay_001',
    value: 189.9,
    netValue: 183.55,
    billingType: 'PIX',
    externalReference: 'ped-9::charge-ped-9',
    ...over,
  });

  it('token válido + PAYMENT_CONFIRMED → confirmed com amount em centavos', async () => {
    const { provider } = novoProvider([]);
    const result = await provider.handleWebhook(
      webhookPayload('PAYMENT_CONFIRMED', paymentPix())
    );
    expect(result.chargeId).toBe('pay_001');
    expect(result.status).toBe('confirmed');
    expect(result.amount).toBe(18_990); // 189.9 × 100, arredondado
  });

  it('amount SEMPRE de payment.value — nunca netValue (cross-check do checkout)', async () => {
    const { provider } = novoProvider([]);
    const result = await provider.handleWebhook(
      webhookPayload('PAYMENT_RECEIVED', paymentPix({ value: 100, netValue: 94.51 }))
    );
    expect(result.amount).toBe(10_000);
  });

  it('token INVÁLIDO → rejeita com "assinatura" (mapeia 401 no endpoint)', async () => {
    const { provider } = novoProvider([]);
    await expect(
      provider.handleWebhook(
        webhookPayload('PAYMENT_CONFIRMED', paymentPix(), {
          signature: 'token-errado-mas-do-mesmo-tamanho-000000000000',
        })
      )
    ).rejects.toThrow(/assinatura/);
    await expect(
      provider.handleWebhook(
        webhookPayload('PAYMENT_CONFIRMED', paymentPix(), { signature: '' })
      )
    ).rejects.toThrow(AsaasWebhookAssinaturaError);
  });

  it('verificação vem ANTES do parse: payload lixo + token errado → erro de ASSINATURA', async () => {
    const { provider } = novoProvider([]);
    const payloadLixo: WebhookPayload = {
      event: 'PAYMENT_CONFIRMED',
      data: {}, // sem payment — o parse falharia, mas nem chega lá
      signature: 'nao-autentico',
      deliveredAt: 'x',
    };
    await expect(provider.handleWebhook(payloadLixo)).rejects.toThrow(
      AsaasWebhookAssinaturaError
    );
  });

  it('idempotente por ENTREGA: mesmo evt_ id → MESMO resultado, sem reprocessar', async () => {
    const { provider } = novoProvider([]);
    const payload = webhookPayload('PAYMENT_CONFIRMED', paymentPix(), {
      eventId: 'evt_replay',
    });
    const r1 = await provider.handleWebhook(payload);
    const r2 = await provider.handleWebhook(payload);
    expect(r2).toBe(r1);
  });

  it('entregas DISTINTAS do mesmo charge processam (confirmed → refunded)', async () => {
    const { provider } = novoProvider([]);
    const r1 = await provider.handleWebhook(
      webhookPayload('PAYMENT_CONFIRMED', paymentPix(), { eventId: 'evt_1' })
    );
    const r2 = await provider.handleWebhook(
      webhookPayload('PAYMENT_REFUNDED', paymentPix(), { eventId: 'evt_2' })
    );
    expect(r1.status).toBe('confirmed');
    expect(r2.status).toBe('refunded');
  });

  it('mapa evento→status cobre a tabela coletada', async () => {
    const { provider } = novoProvider([]);
    const casos: Array<[string, string]> = [
      ['PAYMENT_RECEIVED', 'confirmed'],
      ['PAYMENT_OVERDUE', 'failed'],
      ['PAYMENT_REFUNDED', 'refunded'],
      ['PAYMENT_DELETED', 'cancelled'],
      ['PAYMENT_RESTORED', 'pending'],
      ['PAYMENT_CREDIT_CARD_CAPTURE_REFUSED', 'failed'],
      ['PAYMENT_REPROVED_BY_RISK_ANALYSIS', 'failed'],
    ];
    for (const [evento, esperado] of casos) {
      const r = await provider.handleWebhook(
        webhookPayload(evento, paymentPix(), { eventId: `evt_${evento}` })
      );
      expect(r.status, evento).toBe(esperado);
    }
  });

  it('PAYMENT_* autêntico não mapeado → pending (ACK sem efeito; protege a fila)', async () => {
    const { provider } = novoProvider([]);
    for (const evento of [
      'PAYMENT_CREATED',
      'PAYMENT_UPDATED',
      'PAYMENT_REFUND_IN_PROGRESS',
    ]) {
      const r = await provider.handleWebhook(
        webhookPayload(evento, paymentPix(), { eventId: `evt_${evento}` })
      );
      expect(r.status, evento).toBe('pending');
    }
  });

  it('evento fora do domínio de cobrança (TRANSFER_*) → erro alto', async () => {
    const { provider } = novoProvider([]);
    await expect(
      provider.handleWebhook(webhookPayload('TRANSFER_CREATED', paymentPix()))
    ).rejects.toThrow(AsaasMappingError);
  });

  it('payment sem id ou sem value → AsaasMappingError', async () => {
    const { provider } = novoProvider([]);
    await expect(
      provider.handleWebhook(
        webhookPayload('PAYMENT_CONFIRMED', { value: 10 }, { eventId: 'e1' })
      )
    ).rejects.toThrow(AsaasMappingError);
    await expect(
      provider.handleWebhook(
        webhookPayload('PAYMENT_CONFIRMED', { id: 'pay_x' }, { eventId: 'e2' })
      )
    ).rejects.toThrow(AsaasMappingError);
  });

  it('parseWebhook expõe orderId (do externalReference) e o bloco cartao', () => {
    const { provider } = novoProvider([]);
    const detalhes = provider.parseWebhook(
      webhookPayload(
        'PAYMENT_CONFIRMED',
        paymentPix({
          billingType: 'CREDIT_CARD',
          installmentCount: 3,
          creditCard: {
            creditCardBrand: 'MASTERCARD',
            creditCardNumber: '8829',
            creditCardToken: 'tok-que-nao-pode-vazar',
          },
        })
      )
    );
    expect(detalhes.orderId).toBe('ped-9');
    expect(detalhes.externalReference).toBe('ped-9::charge-ped-9');
    expect(detalhes.cartao).toEqual({
      bandeira: 'MASTERCARD',
      ultimos4: '8829',
      parcelas: 3,
    });
    // Minimização: o token do cartão NUNCA sai do adapter
    expect(JSON.stringify(detalhes)).not.toContain('tok-que-nao-pode-vazar');
  });

  it('PIX confirmado não tem bloco cartao (brief: PIX não exige)', () => {
    const { provider } = novoProvider([]);
    const detalhes = provider.parseWebhook(
      webhookPayload('PAYMENT_CONFIRMED', paymentPix())
    );
    expect(detalhes.cartao).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 9. Operações sem mapeamento seguro — falham ALTO (nunca simular dinheiro)
// ---------------------------------------------------------------------------

describe('splitRules / getPayout — gaps explícitos da discovery', () => {
  it('splitRules lança AsaasOperacaoNaoSuportadaError (split é embutido no POST /payments)', async () => {
    const { provider } = novoProvider([]);
    await expect(
      provider.splitRules({
        chargeId: 'pay_1',
        tenantId: 't1',
        platformFeePct: 5,
        recipients: [{ recipientId: 'w1', percentage: 95 }],
      })
    ).rejects.toThrow(AsaasOperacaoNaoSuportadaError);
  });

  it('getPayout lança AsaasOperacaoNaoSuportadaError (endpoints não coletados)', async () => {
    const { provider } = novoProvider([]);
    await expect(provider.getPayout({ tenantId: 't1' })).rejects.toThrow(
      AsaasOperacaoNaoSuportadaError
    );
  });
});

// ---------------------------------------------------------------------------
// 10. Sanidade read-only contra conta REAL — SEMPRE SKIP nesta suíte.
//     Quem decide rodar é o MAESTRO (gated por RUN_ASAAS_READONLY=1 e
//     chave em ASAAS_READONLY_API_KEY — nomes deliberadamente DIFERENTES
//     de ASAAS_API_KEY para nunca interagir com o fail-safe do checkout).
// ---------------------------------------------------------------------------

describe.skip('integração read-only (maestro-only — GET /myAccount)', () => {
  it('GET /myAccount responde 200 com a conta', async () => {
    if (process.env['RUN_ASAAS_READONLY'] !== '1') return;
    const apiKey = process.env['ASAAS_READONLY_API_KEY'];
    const webhookAuthToken = process.env['ASAAS_WEBHOOK_AUTH_TOKEN'];
    if (!apiKey || !webhookAuthToken) return;

    // READ-ONLY por construção: getAccountInfo só faz GET /myAccount.
    const provider = new AsaasProvider({
      apiKey,
      webhookAuthToken,
      permitirProducao: true,
    });
    const conta = await provider.getAccountInfo();
    expect(conta).toBeTruthy();
  });
});
