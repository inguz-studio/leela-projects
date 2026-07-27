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
 * ── REALINHAMENTO PIXCANCEL-RET · contrato A1-REV (commit 82f7969) ──────────
 * A review PIXCARRINHO-REV mudou o contrato: quando o DELETE não prova a morte
 * da cobrança, o adapter RECONCILIA POR LEITURA (`GET /payments/{id}`) e só
 * devolve sucesso com prova POSITIVA — `status: DELETED`, ou GET 404 (o
 * gateway não conhece a cobrança ⇒ não existe QR vivo). A reconciliação roda
 * SÓ em 4xx≠429; 5xx, 429 e rede caída custam UMA chamada, porque o comprador
 * está no caminho quente.
 *
 * O ataque NÃO afrouxou por causa disso: a matriz de shapes divergentes segue
 * INTEIRA e todos os casos continuam LANÇANDO, e agora cada um cobra também a
 * SEQUÊNCIA de chamadas — a reconciliação existe e é medida, ou não existe e
 * é medida também. Um único caso mudou de lado (HTTP 404), com o porquê no
 * próprio teste. Este arquivo é dono da matriz de contrato do DELETE; a
 * matriz de estados lidos na reconciliação (DELETED/RECEIVED/RESTORED/…) é de
 * `asaasProvider.test.ts` (bloco A1-REV, C1–C12) e não se repete aqui.
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
  AsaasTimeoutError,
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

/** Chamada registrada. O MÉTODO importa desde o A1-REV: DELETE ≠ GET. */
interface ChamadaFake {
  method: string;
  url: string;
}

function novoProvider(fetchFn: FetchLike): AsaasProvider {
  return new AsaasProvider({
    apiKey: SANDBOX_KEY,
    webhookAuthToken: WEBHOOK_TOKEN,
    fetchFn,
    now: () => AGORA,
  });
}

/**
 * Provider cujo transporte devolve SEMPRE a mesma resposta — inclusive ao GET
 * de reconciliação. É o pior cenário honesto: o gateway que respondeu torto
 * continua torto quando perguntado de novo, então nenhuma leitura vira prova.
 */
function providerCom(resposta: RespostaFake): {
  provider: AsaasProvider;
  chamadas: ChamadaFake[];
} {
  const chamadas: ChamadaFake[] = [];
  const fetchFn: FetchLike = async (url, init) => {
    chamadas.push({ method: init.method, url });
    return {
      status: resposta.status ?? 200,
      headers: { get: () => null },
      text: async () => resposta.texto ?? '',
    };
  };
  return { provider: novoProvider(fetchFn), chamadas };
}

/** Só os métodos, na ordem — é o que prova (ou nega) a reconciliação. */
const metodosDe = (chamadas: readonly ChamadaFake[]): string[] =>
  chamadas.map((c) => c.method);

/** Corpo de erro no formato real do Asaas (`errors[]`). */
const corpoErro = (descricao: string): string =>
  JSON.stringify({ errors: [{ code: 'x', description: descricao }] });

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
  //
  // A1-REV acrescentou a coluna `sequencia`, e ela separa duas famílias:
  //   - corpo que nem vira OBJETO morre no parse do próprio DELETE
  //     (AsaasMappingError, não AsaasApiError) ⇒ reconciliação nem é
  //     cogitada: 1 chamada;
  //   - objeto legítimo SEM prova de morte ⇒ o adapter PERGUNTA ao gateway
  //     (DELETE + GET) e, como a leitura devolve o mesmo lixo, LANÇA.
  const divergencias: readonly {
    nome: string;
    texto: string | undefined;
    sequencia: readonly string[];
  }[] = [
    { nome: 'corpo VAZIO com 200', texto: undefined, sequencia: ['DELETE'] },
    {
      nome: 'objeto sem o campo `deleted`',
      texto: JSON.stringify({ id: 'pay_ataque' }),
      sequencia: ['DELETE', 'GET'],
    },
    {
      nome: '`deleted: false` explícito',
      texto: JSON.stringify({ deleted: false, id: 'pay_ataque' }),
      sequencia: ['DELETE', 'GET'],
    },
    {
      nome: '`deleted` como STRING "true" (JSON frouxo)',
      texto: JSON.stringify({ deleted: 'true' }),
      sequencia: ['DELETE', 'GET'],
    },
    {
      nome: '`deleted` como 1 (truthy que não é true)',
      texto: JSON.stringify({ deleted: 1 }),
      sequencia: ['DELETE', 'GET'],
    },
    {
      nome: 'campo renomeado (`success: true`)',
      texto: JSON.stringify({ success: true }),
      sequencia: ['DELETE', 'GET'],
    },
    { nome: 'null literal', texto: 'null', sequencia: ['DELETE'] },
    {
      nome: 'ARRAY (lista de cobranças)',
      texto: JSON.stringify([{ deleted: true }]),
      sequencia: ['DELETE'],
    },
    {
      nome: 'string JSON solta',
      texto: JSON.stringify('deleted'),
      sequencia: ['DELETE'],
    },
    {
      nome: 'HTML de página de erro (corpo não-JSON com 200)',
      texto: '<html>502</html>',
      sequencia: ['DELETE'],
    },
    {
      nome: 'envelope `{data: {deleted: true}}`',
      texto: JSON.stringify({ data: { deleted: true } }),
      sequencia: ['DELETE', 'GET'],
    },
  ];

  for (const caso of divergencias) {
    it(`FAIL-CLOSED: ${caso.nome} ⇒ LANÇA (nunca "cancelado")`, async () => {
      const p = providerCom(caso.texto === undefined ? {} : { texto: caso.texto });
      await expect(p.provider.cancelCharge(params())).rejects.toBeInstanceOf(
        AsaasMappingError
      );
      // O custo da reconciliação é medido linha a linha: nem a mais (viagem
      // extra no colo do comprador), nem a menos (gateway não perguntado).
      expect(metodosDe(p.chamadas)).toEqual(caso.sequencia);
    });
  }

  it('o ÚNICO shape que passa é o da doc — `deleted: true` literal', async () => {
    const p = providerCom({ texto: JSON.stringify({ deleted: true, id: 'pay_ataque' }) });
    const r = await p.provider.cancelCharge(params());
    expect(r.status).toBe('cancelled');
    expect(r.jaCancelada).toBe(false);
    // A1-REV não encareceu o caminho feliz: uma chamada, como antes.
    expect(metodosDe(p.chamadas)).toEqual(['DELETE']);
  });

  // A divergência de shape NÃO pode ficar cacheada: se o Asaas responder
  // torto uma vez e certo na seguinte, a segunda tentativa tem de voltar ao
  // gateway. Cachear a falha travaria o pedido para sempre.
  it('resposta divergente NÃO entra no cache de idempotência (a próxima tentativa volta ao gateway)', async () => {
    // A1-REV: o mock passa a responder por (MÉTODO, nº da chamada daquele
    // método). Índice cego não distinguiria o DELETE do GET de reconciliação
    // e serviria a resposta errada — e é justamente a contagem que sustenta
    // o invariante deste teste.
    const roteiro: Record<string, readonly string[]> = {
      DELETE: [
        // 1ª tentativa: corpo divergente…
        JSON.stringify({ deleted: false }),
        // …e, depois do erro, o gateway volta ao contrato da doc.
        JSON.stringify({ deleted: true, id: 'pay_ataque' }),
      ],
      // …a reconciliação da 1ª tentativa lê uma cobrança VIVA: sem prova de
      // morte não sai sucesso, nem otimista nem por cansaço.
      GET: [JSON.stringify({ id: 'pay_ataque', status: 'PENDING' })],
    };
    const chamadas: ChamadaFake[] = [];
    const usos: Record<string, number> = {};
    const fetchFn: FetchLike = async (url, init) => {
      const i = usos[init.method] ?? 0;
      usos[init.method] = i + 1;
      chamadas.push({ method: init.method, url });
      const corpo = roteiro[init.method]?.[i];
      if (corpo === undefined) {
        throw new Error(
          `Chamada HTTP não roteirizada: ${init.method} ${url} (#${i + 1})`
        );
      }
      return {
        status: 200,
        headers: { get: () => null },
        text: async () => corpo,
      };
    };
    const provider = novoProvider(fetchFn);

    await expect(provider.cancelCharge(params())).rejects.toBeInstanceOf(
      AsaasMappingError
    );
    const ok = await provider.cancelCharge(params());
    expect(ok.status).toBe('cancelled');
    // Quem matou a cobrança foi ESTA chamada: a tentativa torta não deixou
    // carimbo nenhum no dedup.
    expect(ok.jaCancelada).toBe(false);
    // DELETE torto → GET que não prova nada → DELETE de novo no gateway.
    expect(metodosDe(chamadas)).toEqual(['DELETE', 'GET', 'DELETE']);
  });

  // ── HTTP 404: o caso que MUDOU DE LADO (A1-REV) ───────────────────────────
  // Até S1209-PIXBE o 404 era só mais um HTTP que subia. Pelo contrato
  // ratificado ele é o oposto: DELETE-404 é um veredito do gateway sobre esta
  // cobrança, dispara a reconciliação, e o GET-404 é prova POSITIVA de morte —
  // a conta não conhece a cobrança, logo não há código PIX vivo para o banco
  // aceitar. Subir erro aqui era o deadlock permanente de compra do
  // PIX-CARRINHO-T1 (a chave da sentinela é determinística: o mesmo 404 se
  // repetiria para sempre). A asserção antiga ("sobe AsaasApiError") sai
  // trocada por três mais fortes: o resultado, o carimbo de quem matou, e as
  // duas leituras exatas sobre a MESMA cobrança.
  it('HTTP 404 no DELETE + GET 404 ⇒ cancelado por RECONCILIAÇÃO, não por otimismo (A1-REV)', async () => {
    const p = providerCom({
      status: 404,
      texto: corpoErro('Não foi possível encontrar a cobrança.'),
    });
    const r = await p.provider.cancelCharge(params());
    expect(r.status).toBe('cancelled');
    expect(r.chargeId).toBe('pay_ataque');
    // `jaCancelada` é o que separa "eu matei agora" de "já estava morta" —
    // sucesso sem esse carimbo esconderia a reconciliação de quem lê o log.
    expect(r.jaCancelada).toBe(true);
    expect(metodosDe(p.chamadas)).toEqual(['DELETE', 'GET']);
    // A leitura é sobre a MESMA cobrança: reconciliar outra não prova nada.
    expect(
      p.chamadas.every((c) => c.url.endsWith('/payments/pay_ataque'))
    ).toBe(true);
  });

  // Os status HTTP que o Asaas usa para "não dá para deletar". Todos SOBEM —
  // é essa subida que impede o timer de matar um pedido cujo dinheiro entrou.
  // O que A1-REV acrescenta é QUANTAS viagens cada família custa.

  // 4xx≠429 é veredito do gateway sobre ESTA cobrança ⇒ reconcilia. Aqui o GET
  // falha igual ao DELETE: leitura que não responde não é prova de morte, e o
  // erro do DELETE sobe intacto (com o httpStatus original, sem ser trocado
  // pelo do GET).
  for (const status of [400, 401, 403, 409] as const) {
    it(`HTTP ${status} ⇒ AsaasApiError SOBE (o pedido não morre) — 2 chamadas: DELETE + GET que não prova`, async () => {
      const p = providerCom({ status, texto: corpoErro('nao pode') });
      const err = await p.provider.cancelCharge(params()).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(AsaasApiError);
      expect((err as AsaasApiError).httpStatus).toBe(status);
      expect(metodosDe(p.chamadas)).toEqual(['DELETE', 'GET']);
    });
  }

  // 429 e 5xx são o gateway NÃO respondendo. O GET devolveria a mesma ausência
  // de resposta e a espera cairia no colo de quem está no checkout — então a
  // reconciliação NÃO roda, e a contagem é a única forma de provar isso.
  for (const status of [429, 500, 502, 503] as const) {
    it(`HTTP ${status} ⇒ AsaasApiError SOBE (o pedido não morre) — 1 chamada: sem reconciliar gateway mudo`, async () => {
      const p = providerCom({ status, texto: corpoErro('nao pode') });
      const err = await p.provider.cancelCharge(params()).catch((e: unknown) => e);
      expect(err).toBeInstanceOf(AsaasApiError);
      expect((err as AsaasApiError).httpStatus).toBe(status);
      expect(metodosDe(p.chamadas)).toEqual(['DELETE']);
    });
  }

  // DEC-0727 · o teto de 15s entra nesta MESMA família. Um gateway que não
  // respondeu não deu veredito nenhum sobre a cobrança, então a leitura de
  // reconciliação não teria o que ler — e os outros 15s sairiam do bolso de
  // quem está parado no checkout. A contagem é a única prova disso, e o
  // relógio é falso porque esperar 15s de verdade num teste seria pagar
  // exatamente o preço que o teto existe para não pagar.
  it('TIMEOUT de 15s ⇒ AsaasTimeoutError SOBE (o pedido não morre) — 1 chamada: gateway mudo não se reconcilia', async () => {
    vi.useFakeTimers();
    try {
      const chamadas: ChamadaFake[] = [];
      const provider = novoProvider((url, init) => {
        chamadas.push({ method: init.method, url });
        return new Promise<never>(() => {}); // nunca responde
      });
      const capturado = provider
        .cancelCharge(params())
        .then((r) => r as unknown)
        .catch((e: unknown) => e);
      await vi.advanceTimersByTimeAsync(15_000);
      const err = await capturado;

      expect(err).toBeInstanceOf(AsaasTimeoutError);
      // Estado DESCONHECIDO carimbado no próprio erro: a camada de cima é
      // proibida de contar ao comprador que "nada foi cobrado".
      expect((err as AsaasTimeoutError).estadoNoGateway).toBe('desconhecido');
      expect(metodosDe(chamadas)).toEqual(['DELETE']);
      expect(String((err as Error).message)).not.toContain(SANDBOX_KEY);
    } finally {
      vi.useRealTimers();
    }
  });

  // Regressão do vazamento de segredo: a chave nunca pode aparecer na
  // mensagem do erro que sobe até o log do expirarPixPendente — nem na URL
  // da chamada NOVA que o A1-REV acrescentou (a reconciliação também é HTTP).
  it('o erro que sobe NÃO carrega a chave de API', async () => {
    const p = providerCom({ status: 401, texto: JSON.stringify({ errors: [] }) });
    const err = await p.provider.cancelCharge(params()).catch((e: unknown) => e);
    expect(String((err as Error).message)).not.toContain(SANDBOX_KEY);
    expect(JSON.stringify(err)).not.toContain(SANDBOX_KEY);
    expect(metodosDe(p.chamadas)).toEqual(['DELETE', 'GET']);
    expect(p.chamadas.some((c) => c.url.includes(SANDBOX_KEY))).toBe(false);
  });
});
