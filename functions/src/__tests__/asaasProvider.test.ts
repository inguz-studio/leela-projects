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
 *  10. pixExpiraEmSegundos (RN-157 · CK2-T5).
 *  11. cancelCharge sobre cobrança já morta — reconciliação por leitura
 *      (contrato A1-REV, C1–C12).
 *  12. Teto de 15s por chamada (DEC-0727 · item 28): AsaasTimeoutError,
 *      estado DESCONHECIDO, e o invariante "gateway mudo = UMA chamada".
 */

import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import type {
  CancelChargeParams,
  ChargeResult,
  CreateChargeParams,
  WebhookPayload,
} from '@leela/core';
import {
  AsaasProvider,
  AsaasApiError,
  AsaasConfigError,
  AsaasError,
  AsaasMappingError,
  AsaasOperacaoNaoSuportadaError,
  AsaasTimeoutError,
  AsaasValidationError,
  AsaasWebhookAssinaturaError,
  ASAAS_PRODUCTION_BASE_URL,
  ASAAS_SANDBOX_BASE_URL,
  ASAAS_TIMEOUT_MS,
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
  // DELETE entrou com o cancelCharge (RN-157 · PIXBE-T3).
  method: 'GET' | 'POST' | 'DELETE';
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

// =============================================================================
// cancelCharge — LEELA-S1209-PIXBE-T3 (RN-157)
//
// A operação que faltava para a expiração do PIX ser real. O que estes casos
// travam é a REGRA DE OURO do fail-safe: o adapter só devolve sucesso com
// prova (`deleted: true`); em qualquer outra situação ele LANÇA, porque quem
// chama (expirarPixPendente) transforma sucesso em "pedido cancelado" — e um
// sucesso mentiroso aqui vira pedido morto com código PIX pagável.
// =============================================================================
describe('cancelCharge — cancelamento no gateway (RN-157 · PIXBE-T3)', () => {
  const cancelParams = (over: Partial<CancelChargeParams> = {}): CancelChargeParams => ({
    chargeId: 'pay_1',
    tenantId: 'tenant-1',
    reason: 'Expiração do PIX por prazo (RN-157)',
    idempotencyKey: 'cancel-ped-1',
    ...over,
  });

  it('DELETE /payments/{id} com deleted=true ⇒ cancelled (1 chamada, sem body)', async () => {
    const { provider, chamadas, pendentes } = novoProvider([
      { method: 'DELETE', url: '/payments/pay_1', json: { deleted: true, id: 'pay_1' } },
    ]);

    const r = await provider.cancelCharge(cancelParams());
    expect(r.chargeId).toBe('pay_1');
    expect(r.status).toBe('cancelled');
    expect(r.jaCancelada).toBe(false);
    expect(r.processedAt.toMillis()).toBe(AGORA.getTime());
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]?.method).toBe('DELETE');
    expect(chamadas[0]?.body).toBeUndefined();
    expect(pendentes()).toBe(0);
  });

  it('REPLAY da mesma chave não repete o DELETE e marca jaCancelada', async () => {
    const { provider, chamadas } = novoProvider([
      { method: 'DELETE', url: '/payments/pay_1', json: { deleted: true, id: 'pay_1' } },
    ]);

    await provider.cancelCharge(cancelParams());
    const replay = await provider.cancelCharge(cancelParams());
    expect(replay.status).toBe('cancelled');
    expect(replay.jaCancelada).toBe(true);
    // Nenhuma chamada extra — a fila teria lançado em HTTP inesperado.
    expect(chamadas).toHaveLength(1);
  });

  it('resposta SEM deleted=true ⇒ AsaasMappingError (nunca sucesso sem prova)', async () => {
    const { provider } = novoProvider([
      { method: 'DELETE', url: '/payments/pay_1', json: { id: 'pay_1' } },
    ]);
    await expect(provider.cancelCharge(cancelParams())).rejects.toThrow(
      AsaasMappingError
    );
  });

  it('cobrança JÁ RECEBIDA (4xx do Asaas) ⇒ o erro SOBE — é o que impede o timer de matar pedido pago', async () => {
    const { provider } = novoProvider([
      {
        method: 'DELETE',
        url: '/payments/pay_1',
        status: 400,
        json: {
          errors: [
            {
              code: 'invalid_action',
              description: 'Não é possível remover uma cobrança já recebida.',
            },
          ],
        },
      },
    ]);
    await expect(provider.cancelCharge(cancelParams())).rejects.toBeInstanceOf(
      AsaasApiError
    );
  });

  // ⚠️ INTOCADO em PIXCARRINHO-REV, e isso é uma asserção: a reconciliação do
  // A1-REV NÃO roda em 5xx (gateway sem resposta é gateway sem resposta), então
  // o 5xx segue custando exatamente uma chamada e a contagem continua 2.
  it('falha de rede/5xx NÃO fica cacheada: a tentativa seguinte volta ao gateway', async () => {
    const { provider, chamadas } = novoProvider([
      { method: 'DELETE', url: '/payments/pay_1', status: 502, json: {} },
      { method: 'DELETE', url: '/payments/pay_1', json: { deleted: true, id: 'pay_1' } },
    ]);
    await expect(provider.cancelCharge(cancelParams())).rejects.toBeInstanceOf(
      AsaasApiError
    );
    const ok = await provider.cancelCharge(cancelParams());
    expect(ok.status).toBe('cancelled');
    expect(ok.jaCancelada).toBe(false);
    expect(chamadas).toHaveLength(2);
  });

  it('parâmetros inválidos morrem ANTES de qualquer HTTP', async () => {
    const { provider, chamadas } = novoProvider([]);
    await expect(
      provider.cancelCharge(cancelParams({ chargeId: '  ' }))
    ).rejects.toThrow(AsaasValidationError);
    await expect(
      provider.cancelCharge(cancelParams({ idempotencyKey: '' }))
    ).rejects.toThrow(AsaasValidationError);
    expect(chamadas).toHaveLength(0);
  });
});

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

// ---------------------------------------------------------------------------
// CK2-T5 (RN-157) — contrato de expiração do PIX no adapter real
// ---------------------------------------------------------------------------

describe('createCharge PIX — pixExpiraEmSegundos (RN-157 · CK2-T5)', () => {
  it('sem expirationDate do gateway: expiresAt cai no fallback relógio+30min (contrato SEMPRE devolve)', async () => {
    const { provider, pendentes } = novoProvider([
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
        json: {
          id: 'pay_pix_exp',
          status: 'PENDING',
          billingType: 'PIX',
          value: 99.99,
          invoiceUrl: 'https://sandbox.asaas.com/i/pay_pix_exp',
        },
      },
      // pixQrCode SEM expirationDate — o fallback do contrato assume
      { method: 'GET', url: '/payments/pay_pix_exp/pixQrCode', json: { payload: 'copia-cola' } },
    ]);

    const result = await provider.createCharge(
      paramsPix({ pixExpiraEmSegundos: 1800 })
    );
    expect(result.expiresAt?.toMillis()).toBe(AGORA.getTime() + 1800 * 1000);
    expect(pendentes()).toBe(0);
  });

  it('expirationDate do gateway VENCE o fallback (a verdade do QR é do gateway)', async () => {
    const { provider } = novoProvider([
      { method: 'GET', url: '/payments?externalReference=', json: { data: [] } },
      { method: 'GET', url: '/customers?cpfCnpj=52998224725', json: { data: [{ id: 'cus_r' }] } },
      {
        method: 'POST',
        url: '/payments',
        json: { id: 'pay_pix_gw', status: 'PENDING', billingType: 'PIX', value: 99.99 },
      },
      {
        method: 'GET',
        url: '/payments/pay_pix_gw/pixQrCode',
        json: { payload: 'copia-cola', expirationDate: '2026-07-12 12:30:00' },
      },
    ]);
    const result = await provider.createCharge(
      paramsPix({ pixExpiraEmSegundos: 1800 })
    );
    expect(result.expiresAt?.toDate().toISOString()).toBe(
      new Date('2026-07-12T12:30:00').toISOString()
    );
  });

  it('validação: inteiro > 0 e exclusivo do PIX (cartão com o campo = bug de chamador)', async () => {
    const { provider } = novoProvider([]);
    await expect(
      provider.createCharge(paramsPix({ pixExpiraEmSegundos: 0 }))
    ).rejects.toThrow(/pixExpiraEmSegundos/);
    await expect(
      provider.createCharge(
        paramsPix({ paymentMethod: 'credit_card', pixExpiraEmSegundos: 1800 })
      )
    ).rejects.toThrow(/só existe no PIX/);
  });
});

// =============================================================================
// cancelCharge · CONTRATO DO DELETE SOBRE COBRANÇA JÁ MORTA
// (LEELA-PIXCARRINHO-REV · achado A1-REV)
//
// POR QUE ESTA MATRIZ EXISTE. O PIX-CARRINHO-T1 pôs o cancelamento DENTRO do
// caminho de criação: gateway que não confirma a morte da cobrança anterior
// ⇒ a compra é NEGADA. A negativa foi declarada temporária ("tente de novo em
// alguns instantes"), e isso vale enquanto a recusa do gateway for
// TRANSITÓRIA (fora do ar, 5xx, timeout).
//
// Só que "não confirmei a morte" e "ela JÁ está morta" chegam pelo MESMO
// canal — um erro HTTP. Uma recusa PERMANENTE (a cobrança já foi removida, ou
// o gateway não a conhece mais) devolve o mesmo erro em toda tentativa, para
// sempre: a negativa deixa de ser temporária e o comprador nunca mais compra
// aquele carrinho, porque a chave da sentinela é determinística. A mensagem
// mandaria ele tentar de novo eternamente.
//
// A LINHA QUE NÃO SE ATRAVESSA: nada aqui devolve sucesso OTIMISTA. Sucesso
// só sai com LEITURA POSITIVA do gateway (GET /payments/{id}) dizendo que a
// cobrança está DELETED — ou que ela não existe mais. Cobrança RECEBIDA,
// CONFIRMADA, PENDENTE ou RESTAURADA continua LEVANTANDO, que é o que impede
// o timer de matar pedido cujo dinheiro entrou (invariante do PaymentProvider).
// =============================================================================
describe('cancelCharge — DELETE sobre cobrança JÁ morta (PIXCARRINHO-REV · A1-REV)', () => {
  const cancelParams = (over: Partial<CancelChargeParams> = {}): CancelChargeParams => ({
    chargeId: 'pay_1',
    tenantId: 'tenant-1',
    reason: 'Expiração do PIX por prazo (RN-157)',
    idempotencyKey: 'cancel-ped-x',
    ...over,
  });

  /** Erro 4xx/5xx do Asaas no formato do corpo real. */
  const erro = (
    status: number,
    code: string,
    description: string
  ): { status: number; json: unknown } => ({
    status,
    json: { errors: [{ code, description }] },
  });

  it('C1 · DELETE devolve deleted=true ⇒ cancelled sem nenhuma leitura extra (caminho feliz intocado)', async () => {
    const { provider, chamadas } = novoProvider([
      { method: 'DELETE', url: '/payments/pay_1', json: { deleted: true, id: 'pay_1' } },
    ]);
    const r = await provider.cancelCharge(cancelParams());
    expect(r.status).toBe('cancelled');
    expect(r.jaCancelada).toBe(false);
    // O custo de rede do caminho quente NÃO subiu: 1 chamada, como antes.
    expect(chamadas).toHaveLength(1);
  });

  it('C2 · 400 invalid_action "já removida" + GET status DELETED ⇒ cancelled/jaCancelada (destrava)', async () => {
    const { provider, chamadas } = novoProvider([
      {
        method: 'DELETE',
        url: '/payments/pay_1',
        ...erro(400, 'invalid_action', 'A cobrança já foi removida.'),
      },
      { method: 'GET', url: '/payments/pay_1', json: { id: 'pay_1', status: 'DELETED' } },
    ]);
    const r = await provider.cancelCharge(cancelParams());
    expect(r.status).toBe('cancelled');
    expect(r.jaCancelada).toBe(true);
    expect(chamadas).toHaveLength(2);
  });

  it('C3 · 404 not_found + GET 404 ⇒ cancelled/jaCancelada (o gateway não conhece a cobrança: nada é pagável)', async () => {
    const { provider } = novoProvider([
      {
        method: 'DELETE',
        url: '/payments/pay_1',
        ...erro(404, 'not_found', 'Não foi possível encontrar a cobrança.'),
      },
      {
        method: 'GET',
        url: '/payments/pay_1',
        ...erro(404, 'not_found', 'Não foi possível encontrar a cobrança.'),
      },
    ]);
    const r = await provider.cancelCharge(cancelParams());
    expect(r.status).toBe('cancelled');
    expect(r.jaCancelada).toBe(true);
  });

  it('C4 · ⛔ 400 "já recebida" + GET RECEIVED ⇒ LANÇA — dinheiro que entrou nunca vira cancelamento', async () => {
    const { provider } = novoProvider([
      {
        method: 'DELETE',
        url: '/payments/pay_1',
        ...erro(400, 'invalid_action', 'Não é possível remover uma cobrança já recebida.'),
      },
      { method: 'GET', url: '/payments/pay_1', json: { id: 'pay_1', status: 'RECEIVED' } },
    ]);
    await expect(provider.cancelCharge(cancelParams())).rejects.toBeInstanceOf(
      AsaasApiError
    );
  });

  it('C4b · ⛔ CONFIRMED também LANÇA (pago sem liquidar é pago)', async () => {
    const { provider } = novoProvider([
      {
        method: 'DELETE',
        url: '/payments/pay_1',
        ...erro(400, 'invalid_action', 'Cobrança já confirmada.'),
      },
      { method: 'GET', url: '/payments/pay_1', json: { id: 'pay_1', status: 'CONFIRMED' } },
    ]);
    await expect(provider.cancelCharge(cancelParams())).rejects.toBeInstanceOf(
      AsaasApiError
    );
  });

  it('C5 · ⛔ 200 sem deleted=true + GET PENDING ⇒ LANÇA (a cobrança segue viva e pagável)', async () => {
    const { provider } = novoProvider([
      { method: 'DELETE', url: '/payments/pay_1', json: { id: 'pay_1' } },
      { method: 'GET', url: '/payments/pay_1', json: { id: 'pay_1', status: 'PENDING' } },
    ]);
    await expect(provider.cancelCharge(cancelParams())).rejects.toBeInstanceOf(
      AsaasMappingError
    );
  });

  it('C6 · 200 sem deleted=true + GET DELETED ⇒ cancelled (corpo divergente não trava a venda)', async () => {
    const { provider } = novoProvider([
      { method: 'DELETE', url: '/payments/pay_1', json: { deleted: false, id: 'pay_1' } },
      { method: 'GET', url: '/payments/pay_1', json: { id: 'pay_1', status: 'DELETED' } },
    ]);
    const r = await provider.cancelCharge(cancelParams());
    expect(r.status).toBe('cancelled');
    expect(r.jaCancelada).toBe(true);
  });

  it('C7 · ⛔ 5xx ⇒ LANÇA SEM leitura extra (transitório: a próxima tentativa destrava, e o comprador não espera duas viagens)', async () => {
    const { provider, chamadas } = novoProvider([
      { method: 'DELETE', url: '/payments/pay_1', status: 502, json: {} },
      { method: 'DELETE', url: '/payments/pay_1', json: { deleted: true, id: 'pay_1' } },
    ]);
    await expect(provider.cancelCharge(cancelParams())).rejects.toBeInstanceOf(
      AsaasApiError
    );
    // Gateway de volta: a MESMA chamada encerra. Nada ficou cacheado do erro.
    const ok = await provider.cancelCharge(cancelParams());
    expect(ok.status).toBe('cancelled');
    expect(ok.jaCancelada).toBe(false);
    // 2 chamadas, não 3: o 5xx não paga o pedágio da reconciliação.
    expect(chamadas).toHaveLength(2);
  });

  it('C8 · ⛔ 429 rate limit ⇒ LANÇA SEM leitura extra (transitório; insistir agravaria o rate limit)', async () => {
    const { provider, chamadas } = novoProvider([
      {
        method: 'DELETE',
        url: '/payments/pay_1',
        status: 429,
        json: { errors: [{ code: 'rate_limit', description: 'Muitas requisições.' }] },
        headers: { 'RateLimit-Reset': '30' },
      },
    ]);
    await expect(provider.cancelCharge(cancelParams())).rejects.toBeInstanceOf(
      AsaasApiError
    );
    expect(chamadas).toHaveLength(1);
  });

  it('C9 · ⛔ RESTORED depois do DELETE ⇒ LANÇA (cobrança ressuscitada está VIVA)', async () => {
    const { provider } = novoProvider([
      {
        method: 'DELETE',
        url: '/payments/pay_1',
        ...erro(400, 'invalid_action', 'Ação inválida.'),
      },
      { method: 'GET', url: '/payments/pay_1', json: { id: 'pay_1', status: 'RESTORED' } },
    ]);
    await expect(provider.cancelCharge(cancelParams())).rejects.toBeInstanceOf(
      AsaasApiError
    );
  });

  it('C10 · ⛔ rede CAI no DELETE e no GET ⇒ LANÇA e o erro original sobe (transitório)', async () => {
    const provider = new AsaasProvider({
      apiKey: SANDBOX_KEY,
      webhookAuthToken: WEBHOOK_TOKEN,
      fetchFn: () => Promise.reject(new Error('ECONNRESET')),
      now: () => AGORA,
    });
    await expect(provider.cancelCharge(cancelParams())).rejects.toThrow(/ECONNRESET/);
  });

  it('C11 · o GET de reconciliação NÃO é tentado quando o DELETE vinga (custo zero no caminho feliz)', async () => {
    const { provider, chamadas, pendentes } = novoProvider([
      { method: 'DELETE', url: '/payments/pay_a', json: { deleted: true, id: 'pay_a' } },
      { method: 'DELETE', url: '/payments/pay_b', json: { deleted: true, id: 'pay_b' } },
    ]);
    await provider.cancelCharge(cancelParams({ chargeId: 'pay_a', idempotencyKey: 'k-a' }));
    await provider.cancelCharge(cancelParams({ chargeId: 'pay_b', idempotencyKey: 'k-b' }));
    expect(chamadas).toHaveLength(2);
    expect(pendentes()).toBe(0);
  });

  it('C12 · corpo do GET sem `status` ⇒ LANÇA (ausência de prova não é prova de morte)', async () => {
    const { provider } = novoProvider([
      {
        method: 'DELETE',
        url: '/payments/pay_1',
        ...erro(400, 'invalid_action', 'Ação inválida.'),
      },
      { method: 'GET', url: '/payments/pay_1', json: { id: 'pay_1' } },
    ]);
    await expect(provider.cancelCharge(cancelParams())).rejects.toBeInstanceOf(
      AsaasApiError
    );
  });
});

// ---------------------------------------------------------------------------
// 12. Teto de 15s por chamada (DEC-0727 · item 28 · lane ASAAS-TETO)
//
// O que esta seção prova, e por que cada asserção existe:
//
//   - o teto EXISTE e é do tamanho decidido pelo dono (15s, não 14,9s nem
//     16s — o número é decisão, não detalhe de implementação);
//   - ele é do TRANSPORTE: qualquer operação do adapter herda, inclusive as
//     que ninguém escreveu ainda;
//   - o estouro é um erro PRÓPRIO, distinguível de resposta do gateway —
//     nada que ramifica em `httpStatus` pode confundir os dois;
//   - o timeout NÃO dispara reconciliação por leitura (mesma família de
//     5xx/429/rede): a contagem de chamadas é a prova, e ela é medida;
//   - o teto não vira erro para o comprador quando a cobrança JÁ NASCEU (o
//     QR é acessório; a cobrança é o dinheiro);
//   - a chave nunca aparece na mensagem, e o timer não fica pendurado.
//
// Relógio FALSO em toda a seção: esperar 15s de verdade num teste seria
// pagar o preço que o teto existe para não pagar.
// ---------------------------------------------------------------------------

describe('teto de 15s por chamada (DEC-0727 · AsaasTimeoutError)', () => {
  /** fetchFn que NUNCA resolve — o gateway que engoliu a requisição. */
  const nuncaResponde: FetchLike = () => new Promise<never>(() => {});

  function providerLento(
    fetchFn: FetchLike,
    overrides: Partial<ConstructorParameters<typeof AsaasProvider>[0]> = {}
  ): AsaasProvider {
    return new AsaasProvider({
      apiKey: SANDBOX_KEY,
      webhookAuthToken: WEBHOOK_TOKEN,
      fetchFn,
      now: () => AGORA,
      ...overrides,
    });
  }

  /** Marca quando a promessa assenta, sem consumir a rejeição duas vezes. */
  function observar<T>(p: Promise<T>): {
    assentou: () => boolean;
    resultado: Promise<unknown>;
  } {
    let assentou = false;
    const resultado = p.then(
      (v: T) => {
        assentou = true;
        return v as unknown;
      },
      (e: unknown) => {
        assentou = true;
        return e;
      }
    );
    return { assentou: () => assentou, resultado };
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('o teto é 15s EXATOS: em 14.999ms ainda espera; em 15.000ms aborta', async () => {
    expect(ASAAS_TIMEOUT_MS).toBe(15_000);
    const provider = providerLento(nuncaResponde);
    const obs = observar(provider.getAccountInfo());

    await vi.advanceTimersByTimeAsync(ASAAS_TIMEOUT_MS - 1);
    // Um teto que dispara antes da hora transforma lentidão normal do
    // gateway em falha inventada — a espera é do tamanho que o dono aceitou.
    expect(obs.assentou()).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(obs.assentou()).toBe(true);
    expect(await obs.resultado).toBeInstanceOf(AsaasTimeoutError);
  });

  it('o erro tipado documenta o ESTADO DESCONHECIDO e a chamada abortada', async () => {
    const provider = providerLento(nuncaResponde);
    const obs = observar(
      provider.cancelCharge({
        chargeId: 'pay_teto',
        tenantId: 'tenant-1',
        reason: 'Expiração do PIX por prazo (RN-157)',
        idempotencyKey: 'cancel-teto',
      })
    );
    await vi.advanceTimersByTimeAsync(ASAAS_TIMEOUT_MS);
    const err = (await obs.resultado) as AsaasTimeoutError;

    expect(err).toBeInstanceOf(AsaasTimeoutError);
    expect(err.name).toBe('AsaasTimeoutError');
    expect(err.timeoutMs).toBe(15_000);
    expect(err.method).toBe('DELETE');
    expect(err.path).toBe('/payments/pay_teto');
    // O literal é o contrato: quem trata este erro é obrigado a NOMEAR que
    // não sabe o que aconteceu no gateway (nem sucesso, nem fracasso).
    expect(err.estadoNoGateway).toBe('desconhecido');
    // DELETE é ESCRITA: a cobrança pode ter sido removida de verdade.
    expect(err.efeitoPossivel).toBe(true);
    expect(err.message).toMatch(/DESCONHECIDO/);
    expect(err.message).toMatch(/15000ms/);
  });

  it('GET abortado sai com efeitoPossivel=false (leitura não muda nada)', async () => {
    const provider = providerLento(nuncaResponde);
    const obs = observar(provider.getAccountInfo());
    await vi.advanceTimersByTimeAsync(ASAAS_TIMEOUT_MS);
    const err = (await obs.resultado) as AsaasTimeoutError;

    expect(err.method).toBe('GET');
    // A distinção existe para que "confira o ledger antes de repetir" só
    // apareça onde há efeito a conferir — senão vira ruído e ninguém lê.
    expect(err.efeitoPossivel).toBe(false);
    expect(err.message).toMatch(/repetir é seguro/);
  });

  it('AsaasTimeoutError é AsaasError mas NÃO é AsaasApiError (nada ramifica por httpStatus)', async () => {
    const provider = providerLento(nuncaResponde);
    const obs = observar(provider.getAccountInfo());
    await vi.advanceTimersByTimeAsync(ASAAS_TIMEOUT_MS);
    const err = await obs.resultado;

    expect(err).toBeInstanceOf(AsaasError);
    // A separação é o que mantém o invariante A1-REV: reconciliação só nasce
    // de VEREDITO do gateway (4xx≠429), e ausência de resposta não é veredito.
    expect(err).not.toBeInstanceOf(AsaasApiError);
    expect(err).not.toBeInstanceOf(AsaasMappingError);
    expect((err as Error).message).not.toContain(SANDBOX_KEY);
    expect(JSON.stringify(err)).not.toContain(SANDBOX_KEY);
  });

  it('o AbortController é acionado: a conexão real morre, não fica socket órfão', async () => {
    const sinais: AbortSignal[] = [];
    const provider = providerLento((_url, init) => {
      if (init.signal !== undefined) sinais.push(init.signal);
      return new Promise<never>(() => {});
    });
    const obs = observar(provider.getAccountInfo());

    expect(sinais).toHaveLength(1);
    expect(sinais[0]?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(ASAAS_TIMEOUT_MS);
    await obs.resultado;
    // Sem isto, "abortar" seria só parar de esperar — e a conexão seguiria
    // consumindo quota do Asaas por uma resposta que ninguém mais lê.
    expect(sinais[0]?.aborted).toBe(true);
  });

  it('o teto cobre o CORPO, não só os headers (resposta que nunca termina de chegar)', async () => {
    // fetch resolve rápido; `text()` é que fica pendurado. Medir só até o
    // header deixaria justamente esta porta aberta.
    const provider = providerLento(async () => ({
      status: 200,
      headers: { get: () => null },
      text: () => new Promise<string>(() => {}),
    }));
    const obs = observar(provider.getAccountInfo());
    await vi.advanceTimersByTimeAsync(ASAAS_TIMEOUT_MS);
    expect(await obs.resultado).toBeInstanceOf(AsaasTimeoutError);
  });

  it('caminho feliz NÃO deixa timer pendurado (Function não fica presa por handle)', async () => {
    const { provider } = novoProvider([
      { method: 'GET', url: '/myAccount', json: { id: 'acc_1' } },
    ]);
    await provider.getAccountInfo();
    expect(vi.getTimerCount()).toBe(0);
  });

  // ── O invariante que o teto NÃO pode quebrar: 1 chamada ──────────────────

  it('TIMEOUT no DELETE ⇒ UMA chamada, ZERO reconciliação (mesma família de 5xx/429)', async () => {
    const chamadas: string[] = [];
    const provider = providerLento((_url, init) => {
      chamadas.push(init.method);
      return new Promise<never>(() => {});
    });
    const obs = observar(
      provider.cancelCharge({
        chargeId: 'pay_teto',
        tenantId: 'tenant-1',
        reason: 'Expiração do PIX por prazo (RN-157)',
        idempotencyKey: 'cancel-teto',
      })
    );
    await vi.advanceTimersByTimeAsync(ASAAS_TIMEOUT_MS);

    expect(await obs.resultado).toBeInstanceOf(AsaasTimeoutError);
    // Gateway que ficou 15s calado não fica falante na pergunta seguinte, e
    // os outros 15s sairiam do bolso de quem está parado no checkout.
    expect(chamadas).toEqual(['DELETE']);
  });

  it('timeout no GET de reconciliação ⇒ o 4xx ORIGINAL sobe (não saber ≠ saber que morreu)', async () => {
    // O DELETE dá veredito 400 (dispara a reconciliação, contrato A1-REV) e
    // é o GET que estoura. Ausência de prova não pode virar cancelamento.
    let n = 0;
    const provider = providerLento(async () => {
      n += 1;
      if (n === 1) {
        return {
          status: 400,
          headers: { get: () => null },
          text: async () =>
            JSON.stringify({
              errors: [{ code: 'invalid_action', description: 'x' }],
            }),
        };
      }
      return new Promise<never>(() => {});
    });
    const obs = observar(
      provider.cancelCharge({
        chargeId: 'pay_teto',
        tenantId: 'tenant-1',
        reason: 'Expiração do PIX por prazo (RN-157)',
        idempotencyKey: 'cancel-teto-2',
      })
    );
    await vi.advanceTimersByTimeAsync(ASAAS_TIMEOUT_MS);
    const err = await obs.resultado;

    expect(err).toBeInstanceOf(AsaasApiError);
    expect((err as AsaasApiError).httpStatus).toBe(400);
    expect(n).toBe(2);
  });

  it('TIMEOUT no lookup idempotente ⇒ NENHUM POST (a falha mais segura: nada criado)', async () => {
    const chamadas: { method: string; url: string }[] = [];
    const provider = providerLento((url, init) => {
      chamadas.push({ method: init.method, url });
      return new Promise<never>(() => {});
    });
    const obs = observar(provider.createCharge(paramsPix()));
    await vi.advanceTimersByTimeAsync(ASAAS_TIMEOUT_MS);

    expect(await obs.resultado).toBeInstanceOf(AsaasTimeoutError);
    expect(chamadas).toHaveLength(1);
    expect(chamadas[0]?.method).toBe('GET');
    expect(chamadas[0]?.url).toContain('/payments?externalReference=');
  });

  it('TIMEOUT no pixQrCode ⇒ a cobrança JÁ NASCIDA volta (degradar > orfanar dinheiro)', async () => {
    // O POST vingou: existe cobrança no gateway. Derrubar tudo por causa do
    // QR devolveria "erro" sobre dinheiro que o banco já pode receber.
    const roteiro: readonly { method: string; frag: string; json: unknown }[] = [
      { method: 'GET', frag: '/payments?externalReference=', json: { data: [] } },
      { method: 'GET', frag: '/customers?', json: { data: [{ id: 'cus_1' }] } },
      {
        method: 'POST',
        frag: '/payments',
        json: {
          id: 'pay_nasceu',
          status: 'PENDING',
          billingType: 'PIX',
          invoiceUrl: 'https://asaas.example/i/pay_nasceu',
          value: 99.99,
        },
      },
    ];
    const provider = providerLento(async (url, init) => {
      if (init.method === 'GET' && url.includes('/pixQrCode')) {
        return new Promise<never>(() => {});
      }
      const rota = roteiro.find(
        (r) => r.method === init.method && url.includes(r.frag)
      );
      if (rota === undefined) {
        throw new Error(`não roteirizado: ${init.method} ${url}`);
      }
      return {
        status: 200,
        headers: { get: () => null },
        text: async () => JSON.stringify(rota.json),
      };
    });

    const obs = observar(
      provider.createCharge(paramsPix({ pixExpiraEmSegundos: 1_800 }))
    );
    await vi.advanceTimersByTimeAsync(ASAAS_TIMEOUT_MS);
    const r = (await obs.resultado) as ChargeResult;

    expect(r).not.toBeInstanceOf(Error);
    expect(r.chargeId).toBe('pay_nasceu');
    expect(r.status).toBe('pending');
    expect(r.paymentUrl).toBe('https://asaas.example/i/pay_nasceu');
    expect(r.qrCode).toBeUndefined();
    // Contrato RN-157 (CK2-T5) intacto: PIX com validade SEMPRE devolve
    // expiresAt — aqui pelo fallback do relógio injetado.
    expect(r.expiresAt?.toMillis()).toBe(AGORA.getTime() + 1_800 * 1000);
  });

  // ── ESTORNO: o caso do risco R9 (INV-CANCEL-ESTORNO) ─────────────────────

  it('TIMEOUT no refund ⇒ UMA chamada e ZERO retry interno, com efeito POSSÍVEL declarado', async () => {
    // O estorno é a escrita sem rede de segurança: o Asaas não dá
    // idempotency-key HTTP para refund e o dedup daqui é em memória. Um retry
    // escondido no adapter seria estorno DUPLO; um erro que diga "falhou" ao
    // chamador seria estorno enviado-e-não-registrado. Sobra uma saída: uma
    // chamada, e um erro que obriga o chamador a olhar o ledger dele.
    const chamadas: string[] = [];
    const provider = providerLento((url, init) => {
      chamadas.push(`${init.method} ${url}`);
      return new Promise<never>(() => {});
    });
    const obs = observar(
      provider.refund({
        chargeId: 'pay_r9',
        tenantId: 'tenant-1',
        reason: 'estorno integral',
        idempotencyKey: 'refund-r9',
      })
    );
    await vi.advanceTimersByTimeAsync(ASAAS_TIMEOUT_MS);
    const err = (await obs.resultado) as AsaasTimeoutError;

    expect(err).toBeInstanceOf(AsaasTimeoutError);
    expect(err.method).toBe('POST');
    expect(err.path).toBe('/payments/pay_r9/refund');
    expect(err.estadoNoGateway).toBe('desconhecido');
    // A flag que a lane ESTORNO-ADMIN vai consumir: "o dinheiro pode ter
    // voltado ao comprador" — nunca "falhou, pode repetir à vontade".
    expect(err.efeitoPossivel).toBe(true);
    expect(err.message).toMatch(/estorno/);
    expect(err.message).toMatch(/conferir o ledger/);
    // ZERO segunda chamada: o adapter não re-tenta escrita de dinheiro.
    expect(chamadas).toEqual(['POST https://api-sandbox.asaas.com/v3/payments/pay_r9/refund']);
  });

  it('TIMEOUT no refund NÃO entra no cache (a tentativa seguinte volta ao gateway)', async () => {
    const chamadas: string[] = [];
    let n = 0;
    const provider = providerLento(async (url, init) => {
      chamadas.push(`${init.method} ${url}`);
      n += 1;
      if (n === 1) return new Promise<never>(() => {});
      return {
        status: 200,
        headers: { get: () => null },
        text: async () =>
          JSON.stringify({
            refunds: [
              {
                id: 'ref_1',
                status: 'DONE',
                value: 99.99,
                dateCreated: '2026-07-12',
              },
            ],
          }),
      };
    });
    const paramsRefund = {
      chargeId: 'pay_1',
      tenantId: 'tenant-1',
      reason: 'estorno',
      idempotencyKey: 'refund-teto',
    };
    const obs = observar(provider.refund(paramsRefund));
    await vi.advanceTimersByTimeAsync(ASAAS_TIMEOUT_MS);
    expect(await obs.resultado).toBeInstanceOf(AsaasTimeoutError);

    // A SEGUNDA chamada abaixo é decisão EXPLÍCITA de quem chama (aqui, o
    // teste no papel de chamador com ledger) — o adapter não a fez sozinho.
    // O que se prova é o outro lado do R9: um estado DESCONHECIDO não pode
    // ficar carimbado no dedup como resultado, senão o estorno legítimo
    // ficaria travado para sempre atrás de um erro que nunca foi resposta.
    const ok = await provider.refund(paramsRefund);
    expect(ok.status).toBe('approved');
    expect(chamadas).toHaveLength(2);
  });
});
