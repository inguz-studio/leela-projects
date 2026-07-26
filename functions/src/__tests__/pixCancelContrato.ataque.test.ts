/**
 * pixCancelContrato.ataque.test.ts — review ANTAGONISTA S1209-PIXREV
 * (vetor 8 do brief · trace leela-build-2d6ee98d).
 *
 * O QUE ATACA: `AsaasProvider.cancelCharge` foi escrito contra o SHAPE DA
 * DOC (`{ deleted: true, id }`), nunca contra conta real. A pergunta que o
 * dinheiro faz é uma só: quando a resposta real DIVERGIR do shape, o código
 * falha FECHADO (pedido segue vivo, cobrança segue pagável e visível) ou
 * ABERTO (pedido morto com QR que o banco ainda aceita)?
 *
 * Fail-open aqui é o defeito mais caro possível nesta lane: `expirarPixPendente`
 * traduz sucesso do adapter em "pedido cancelado" e mostra ao comprador
 * "nada foi cobrado de você". Um `true` mentiroso vira exatamente o bug que
 * T3 existe para matar.
 *
 * ⛔ NENHUMA chamada de rede real — o transporte é injetado e o fetch global
 * é stubado para lançar (mesma disciplina de `asaasProvider.test.ts`).
 */

import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import type { CancelChargeParams } from '@leela/core';
import {
  AsaasProvider,
  AsaasApiError,
  AsaasMappingError,
  type FetchLike,
} from '../payments/asaasProvider';

beforeEach(() => {
  vi.stubGlobal('fetch', () => {
    throw new Error('REDE REAL PROIBIDA na suíte (brief leela-asaas-adapter)');
  });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const SANDBOX_KEY = `$aact_hmlg_${'0'.repeat(40)}`;
const WEBHOOK_TOKEN = 'leela-webhook-token-0123456789abcdef0123456789';
const AGORA = new Date('2026-07-12T12:00:00.000Z');

interface RespostaFake {
  status?: number;
  /** Corpo CRU — a divergência de shape mora aqui. `undefined` = corpo vazio. */
  texto?: string;
}

function providerCom(resposta: RespostaFake): {
  provider: AsaasProvider;
  chamadas: number;
} {
  const contador = { n: 0 };
  const fetchFn: FetchLike = async (_url, _init) => {
    contador.n += 1;
    return {
      status: resposta.status ?? 200,
      headers: { get: () => null },
      text: async () => resposta.texto ?? '',
    };
  };
  const provider = new AsaasProvider({
    apiKey: SANDBOX_KEY,
    webhookAuthToken: WEBHOOK_TOKEN,
    fetchFn,
    now: () => AGORA,
  });
  return {
    provider,
    get chamadas() {
      return contador.n;
    },
  };
}

const params = (over: Partial<CancelChargeParams> = {}): CancelChargeParams => ({
  chargeId: 'pay_ataque',
  tenantId: 'tenant-1',
  reason: 'Expiração do PIX por prazo (RN-157)',
  idempotencyKey: 'cancel-ped-ataque',
  ...over,
});

describe('S1209-PIXREV · cancelCharge do Asaas sob resposta DIVERGENTE da doc', () => {
  // A tabela abaixo é o ataque: cada linha é um jeito plausível de o Asaas
  // real responder DIFERENTE do `{deleted: true}` da doc. TODAS têm de
  // LANÇAR — nenhuma pode virar "cancelado com sucesso".
  const divergencias: readonly { nome: string; texto: string | undefined }[] = [
    { nome: 'corpo VAZIO com 200', texto: undefined },
    { nome: 'objeto sem o campo `deleted`', texto: JSON.stringify({ id: 'pay_ataque' }) },
    { nome: '`deleted: false` explícito', texto: JSON.stringify({ deleted: false, id: 'pay_ataque' }) },
    { nome: '`deleted` como STRING "true" (JSON frouxo)', texto: JSON.stringify({ deleted: 'true' }) },
    { nome: '`deleted` como 1 (truthy que não é true)', texto: JSON.stringify({ deleted: 1 }) },
    { nome: 'campo renomeado (`success: true`)', texto: JSON.stringify({ success: true }) },
    { nome: 'null literal', texto: 'null' },
    { nome: 'ARRAY (lista de cobranças)', texto: JSON.stringify([{ deleted: true }]) },
    { nome: 'string JSON solta', texto: JSON.stringify('deleted') },
    { nome: 'HTML de página de erro (corpo não-JSON com 200)', texto: '<html>502</html>' },
    { nome: 'envelope `{data: {deleted: true}}`', texto: JSON.stringify({ data: { deleted: true } }) },
  ];

  for (const caso of divergencias) {
    it(`FAIL-CLOSED: ${caso.nome} ⇒ LANÇA (nunca "cancelado")`, async () => {
      const p = providerCom(caso.texto === undefined ? {} : { texto: caso.texto });
      await expect(p.provider.cancelCharge(params())).rejects.toBeInstanceOf(
        AsaasMappingError
      );
    });
  }

  it('o ÚNICO shape que passa é o da doc — `deleted: true` literal', async () => {
    const p = providerCom({ texto: JSON.stringify({ deleted: true, id: 'pay_ataque' }) });
    const r = await p.provider.cancelCharge(params());
    expect(r.status).toBe('cancelled');
    expect(r.jaCancelada).toBe(false);
  });

  // A divergência de shape NÃO pode ficar cacheada: se o Asaas responder
  // torto uma vez e certo na seguinte, a segunda tentativa tem de voltar ao
  // gateway. Cachear a falha travaria o pedido para sempre.
  it('resposta divergente NÃO entra no cache de idempotência (a próxima tentativa volta ao gateway)', async () => {
    const respostas: RespostaFake[] = [
      { texto: JSON.stringify({ deleted: false }) },
      { texto: JSON.stringify({ deleted: true, id: 'pay_ataque' }) },
    ];
    let i = 0;
    const fetchFn: FetchLike = async () => {
      const r = respostas[i++] ?? { texto: '' };
      return {
        status: r.status ?? 200,
        headers: { get: () => null },
        text: async () => r.texto ?? '',
      };
    };
    const provider = new AsaasProvider({
      apiKey: SANDBOX_KEY,
      webhookAuthToken: WEBHOOK_TOKEN,
      fetchFn,
      now: () => AGORA,
    });
    await expect(provider.cancelCharge(params())).rejects.toBeInstanceOf(
      AsaasMappingError
    );
    const ok = await provider.cancelCharge(params());
    expect(ok.status).toBe('cancelled');
    expect(i).toBe(2);
  });

  // Os status HTTP que o Asaas usa para "não dá para deletar". Todos SOBEM —
  // é essa subida que impede o timer de matar um pedido cujo dinheiro entrou.
  for (const status of [400, 401, 403, 404, 409, 429, 500, 502, 503] as const) {
    it(`HTTP ${status} ⇒ AsaasApiError SOBE (o pedido não morre)`, async () => {
      const p = providerCom({
        status,
        texto: JSON.stringify({ errors: [{ code: 'x', description: 'nao pode' }] }),
      });
      await expect(p.provider.cancelCharge(params())).rejects.toBeInstanceOf(
        AsaasApiError
      );
    });
  }

  // Regressão do vazamento de segredo: a chave nunca pode aparecer na
  // mensagem do erro que sobe até o log do expirarPixPendente.
  it('o erro que sobe NÃO carrega a chave de API', async () => {
    const p = providerCom({ status: 401, texto: JSON.stringify({ errors: [] }) });
    const err = await p.provider.cancelCharge(params()).catch((e: unknown) => e);
    expect(String((err as Error).message)).not.toContain(SANDBOX_KEY);
    expect(JSON.stringify(err)).not.toContain(SANDBOX_KEY);
  });
});
