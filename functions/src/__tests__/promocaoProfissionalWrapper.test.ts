/**
 * promocaoProfissionalWrapper.test.ts — PONTE-REV · vetor 12 ⚔
 *
 * O WRAPPER `https.onCall`, QUE NUNCA TINHA SIDO EXERCITADO.
 *
 * A A4 (`promocaoProfissionalPonte.integration.test.ts`) provou o CORE contra
 * um Firestore de verdade e disse, no próprio sumário: *"não é navegador.
 * Rodou o core; o wrapper `https.onCall` não foi exercitado por HTTP."* Duas
 * coisas moram só no wrapper, e as duas gateiam o deploy:
 *
 *   1. a recusa `sem_sessao` — ela é lançada NO WRAPPER (`!context.auth`) e não
 *      existe no core. Das cinco recusas nomeadas, era a ÚNICA sem um caso de
 *      teste em lugar nenhum do repositório;
 *
 *      (PONTE-ELEGIVEL-1 · 09/08) as cinco viraram SEIS: `conta_inelegivel`;
 *      (PONTE-NOME-1 · 11/08) a sétima é `nome_profissional_invalido`
 *      entrou pela mesma porta e é exercitada aqui pelo transporte, junto das
 *      outras. A recusa nova depende de uma claim que a tradução do token
 *      passou a ler — `demotedFromRole` —, e o transporte é o único lugar onde
 *      essa leitura é provada de ponta a ponta a partir de um JWT de verdade.
 *
 *   2. o `details.motivo` sobreviver à serialização. Se a `HttpsError` que o
 *      módulo lança não for a MESMA classe que o runtime carrega — e num
 *      monorepo pnpm com duas cópias de `firebase-functions` isso é possível —,
 *      o `instanceof HttpsError` do `wrapOnCallHandler` falha e TODA recusa sai
 *      como `internal`, com a mensagem apagada. É literalmente o DEF-B da
 *      ONBOARD-REV acontecendo de novo, e nenhum teste do core o pegaria: o
 *      core lança o objeto certo, quem o traduz é o wrapper.
 *
 * COMO ISTO RODA SEM EMULATOR DE FUNCTIONS
 * A função exportada por `https.onCall` É um handler estilo Express. Aqui ela
 * recebe requisição e resposta de mentira e o `skipTokenVerification` do
 * próprio SDK (`FIREBASE_DEBUG_MODE`), que é o mesmo atalho que o Emulator usa
 * para não verificar assinatura. O caminho percorrido é o real: CORS →
 * `isValidRequest` → `checkTokens` → `decode(body.data)` → handler →
 * `res.status().send()`, inclusive o `catch` que decide entre a recusa tipada e
 * o `internal`.
 *
 * ⛔ O QUE ELE CONTINUA NÃO PROVANDO, e está dito para ninguém arredondar: não
 * há socket, não há Cloud Run e não há navegador. O que ele fecha é a camada
 * entre o transporte e o core — que estava inteira sem cobertura.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// O `debugMode` do SDK é lido UMA vez, no load de `common/debug.js`. Sem o
// hoist, `firebase-functions` já teria sido importado com a flag desligada e o
// wrapper tentaria verificar a assinatura do token contra um app que não existe.
vi.hoisted(() => {
  process.env['FIREBASE_DEBUG_MODE'] = 'true';
  process.env['FIREBASE_DEBUG_FEATURES'] = JSON.stringify({ skipTokenVerification: true });
});

const estado = vi.hoisted(() => ({
  escritas: [] as { colecao: string; id: string; dados: Record<string, unknown> }[],
  existe: false,
  explodir: false,
}));

vi.mock('firebase-admin', () => ({
  firestore: () => ({
    collection: (colecao: string) => ({
      doc: (id: string) => ({ __colecao: colecao, __id: id }),
    }),
    runTransaction: async <T>(
      fn: (tx: {
        get: (r: { __colecao: string; __id: string }) => Promise<{ exists: boolean }>;
        set: (r: { __colecao: string; __id: string }, d: Record<string, unknown>) => void;
      }) => Promise<T>
    ): Promise<T> => {
      // O sexto caminho: a infraestrutura caindo no meio da transação. Não é
      // recusa de regra, e por isso NÃO tem motivo nomeado.
      if (estado.explodir) throw new Error('UNAVAILABLE: emulator caiu no meio');
      return fn({
        get: async () => ({ exists: estado.existe }),
        set: (ref, dados) => {
          estado.escritas.push({ colecao: ref.__colecao, id: ref.__id, dados });
        },
      });
    },
  }),
}));

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: { serverTimestamp: () => '<<serverTimestamp>>' },
}));

// ---------------------------------------------------------------------------
// Requisição e resposta de mentira, com a superfície que o SDK realmente usa
// ---------------------------------------------------------------------------

interface RespostaFake {
  statusCode: number;
  corpo: unknown;
  cabecalhos: Record<string, unknown>;
}

function requisicao(
  corpo: unknown,
  cabecalhos: Record<string, string> = {}
): Record<string, unknown> {
  const h: Record<string, string> = { 'content-type': 'application/json', ...cabecalhos };
  return {
    method: 'POST',
    body: corpo,
    headers: h,
    header: (nome: string) => h[nome.toLowerCase()],
    get: (nome: string) => h[nome.toLowerCase()],
  };
}

function resposta(): { res: Record<string, unknown>; lido: RespostaFake } {
  const lido: RespostaFake = { statusCode: 0, corpo: undefined, cabecalhos: {} };
  const res: Record<string, unknown> = {
    get statusCode() {
      return lido.statusCode;
    },
    set statusCode(c: number) {
      lido.statusCode = c;
    },
    status: (c: number) => {
      lido.statusCode = c;
      return res;
    },
    send: (b: unknown) => {
      lido.corpo = b;
      return res;
    },
    setHeader: (k: string, v: unknown) => {
      lido.cabecalhos[k] = v;
      return res;
    },
    getHeader: (k: string) => lido.cabecalhos[k],
    write: () => true,
    end: () => res,
    on: () => res,
  };
  return { res, lido };
}

/**
 * Um ID token no formato de arame: três partes, assinatura de mentira. É
 * exatamente o que o Emulator aceita, e é o que o `unsafeDecodeIdToken` lê.
 */
function idToken(payload: Record<string, unknown>): string {
  const b64 = (o: unknown): string => Buffer.from(JSON.stringify(o)).toString('base64url');
  return [
    b64({ alg: 'none', typ: 'JWT' }),
    b64(payload),
    'assinatura-que-o-emulator-nao-verifica',
  ].join('.');
}

const TOKEN_PARTICIPANTE = {
  sub: 'uid-ana',
  email: 'ana@exemplo.dev',
  name: 'Ana Paula',
  role: 'athlete',
  firebase: { sign_in_provider: 'password' },
};

type HandlerHttp = (req: unknown, res: unknown) => Promise<unknown>;

async function chamar(
  corpo: unknown,
  token?: Record<string, unknown>
): Promise<RespostaFake> {
  const { promoverParaProfissional } = await import('../platform/promoverParaProfissional');
  const { res, lido } = resposta();
  const cabecalhos =
    token === undefined ? {} : { authorization: `Bearer ${idToken(token)}` };
  await (promoverParaProfissional as unknown as HandlerHttp)(
    requisicao(corpo, cabecalhos),
    res
  );
  return lido;
}

beforeEach(() => {
  estado.escritas = [];
  estado.existe = false;
  estado.explodir = false;
});

// ---------------------------------------------------------------------------

describe('⚔ vetor 12 · o wrapper https.onCall, pela primeira vez', () => {
  it('o caminho feliz atravessa o transporte e devolve o contrato inteiro', async () => {
    const r = await chamar({ data: { aceiteTermo: true } }, TOKEN_PARTICIPANTE);

    expect(r.statusCode).toBe(200);
    expect(r.corpo).toEqual({
      result: {
        statusOnboarding: 'aguardando_convite',
        jaExistia: false,
        // PONTE-FIX · B1 — o eco entra no contrato de TRANSPORTE, não só no do
        // core: é aqui que uma sonda de fumaça o lê.
        intencaoRegistrada: 'nao_declarada',
        nomeAplicado: false,
      },
    });
    expect(estado.escritas).toHaveLength(1);
    expect(estado.escritas[0]?.colecao).toBe('profissionais');
    expect(estado.escritas[0]?.id).toBe('uid-ana');
  });

  it('⚔ `sem_sessao` — a recusa que só existe no wrapper, e que nada cobria', async () => {
    const r = await chamar({ data: { aceiteTermo: true } });

    expect(r.statusCode).toBe(401);
    const erro = (r.corpo as { error: { status: string; details?: { motivo?: string } } }).error;
    expect(erro.status).toBe('UNAUTHENTICATED');
    expect(erro.details?.motivo).toBe('sem_sessao');
    expect(estado.escritas).toHaveLength(0);
  });

  it('⚔ o `details.motivo` sobrevive à serialização nas SETE recusas', async () => {
    // Se a HttpsError do módulo não fosse a mesma classe do runtime, todas
    // estas viriam com status INTERNAL e sem `details` — o DEF-B de novo.
    const casos: {
      nome: string;
      corpo: unknown;
      token?: Record<string, unknown>;
      motivo: string;
      status: string;
    }[] = [
      {
        nome: 'sem sessão',
        corpo: { data: { aceiteTermo: true } },
        motivo: 'sem_sessao',
        status: 'UNAUTHENTICATED',
      },
      {
        nome: 'sessão anônima do checkout',
        corpo: { data: { aceiteTermo: true } },
        token: { sub: 'uid-anon', firebase: { sign_in_provider: 'anonymous' } },
        motivo: 'sessao_anonima',
        status: 'FAILED_PRECONDITION',
      },
      {
        nome: 'administração da plataforma',
        corpo: { data: { aceiteTermo: true } },
        token: { ...TOKEN_PARTICIPANTE, role: 'platform_admin' },
        motivo: 'conta_de_plataforma',
        status: 'PERMISSION_DENIED',
      },
      {
        // PONTE-ELEGIVEL-1 · a sexta. O divulgador tem papel na Leela e o
        // portão do código o recusa; a porta passou a recusá-lo aqui, com nome,
        // em vez de deixá-lo esperar um convite que nunca seria aceito.
        nome: 'divulgador',
        corpo: { data: { aceiteTermo: true } },
        token: { ...TOKEN_PARTICIPANTE, role: 'promoter' },
        motivo: 'conta_inelegivel',
        status: 'FAILED_PRECONDITION',
      },
      {
        // A mesma recusa pelo OUTRO caminho: rebaixar apaga o `tenantId` e
        // deixa o marcador, então o crachá dela é `athlete` — o papel mais
        // comum do produto. É o marcador, e só ele, que a separa da
        // participante que atravessa no caso feliz acima.
        nome: 'ex-organizadora rebaixada de propósito',
        corpo: { data: { aceiteTermo: true } },
        token: { ...TOKEN_PARTICIPANTE, demotedFromRole: 'tenant_owner' },
        motivo: 'conta_inelegivel',
        status: 'FAILED_PRECONDITION',
      },
      {
        nome: 'aceite ausente',
        corpo: { data: {} },
        token: TOKEN_PARTICIPANTE,
        motivo: 'aceite_ausente',
        status: 'INVALID_ARGUMENT',
      },
      {
        nome: 'aceite datado pelo cliente',
        corpo: { data: { aceiteTermo: true, aceitoEm: '2020-01-01' } },
        token: TOKEN_PARTICIPANTE,
        motivo: 'aceite_datado_pelo_cliente',
        status: 'INVALID_ARGUMENT',
      },
      {
        // PONTE-NOME-1 · a sétima. `"!!"` tem o comprimento mínimo e mesmo
        // assim não vira endereço nenhum — se ela viajasse como sucesso, a
        // pessoa levaria o nome pessoal cunhado para sempre achando que tinha
        // escolhido outro.
        nome: 'nome de produtora que não vira slug',
        corpo: { data: { aceiteTermo: true, nomeProfissional: '!!' } },
        token: TOKEN_PARTICIPANTE,
        motivo: 'nome_profissional_invalido',
        status: 'INVALID_ARGUMENT',
      },
    ];

    for (const caso of casos) {
      estado.escritas = [];
      const r = await chamar(caso.corpo, caso.token);
      const erro = (r.corpo as { error: { status: string; message: string; details?: { motivo?: string } } })
        .error;
      expect(erro.status, caso.nome).toBe(caso.status);
      expect(erro.status, caso.nome).not.toBe('INTERNAL');
      expect(erro.details?.motivo, caso.nome).toBe(caso.motivo);
      expect(erro.message.length, caso.nome).toBeGreaterThan(0);
      expect(estado.escritas, caso.nome).toHaveLength(0);
    }
  });

  it('⚔ token PODRE é recusado pelo SDK antes do handler, e sem `details`', async () => {
    // O caso mais provável em produção: a aba ficou aberta, o token venceu. O
    // SDK devolve `unauthenticated` ANTES de o nosso código rodar, e sem
    // `details.motivo` — então a tela depende do fallback por `code` do
    // `motivoDaRecusaDaPromocao`. Este caso existe para provar que aquele
    // fallback é carga, e não enfeite: apagá-lo faz a pessoa ler "tente de novo
    // em instantes" quando o que ela precisa ler é "entre de novo".
    const { res, lido } = resposta();
    const { promoverParaProfissional } = await import('../platform/promoverParaProfissional');
    await (promoverParaProfissional as unknown as HandlerHttp)(
      requisicao({ data: { aceiteTermo: true } }, { authorization: 'Token qualquer-coisa' }),
      res
    );

    expect(lido.statusCode).toBe(401);
    const erro = (lido.corpo as { error: { status: string; details?: unknown } }).error;
    expect(erro.status).toBe('UNAUTHENTICATED');
    expect(erro.details).toBeUndefined();
    expect(estado.escritas).toHaveLength(0);
    // Quem traduz este erro para a pessoa é o `motivoDaRecusaDaPromocao` do
    // api-client, pelo fallback por `code` — e isso é provado do lado de lá,
    // porque `@leela/api-client` não é dependência de `functions`.
  });

  it('token sem provedor declarado é anônimo até no transporte (fail-closed)', async () => {
    const r = await chamar(
      { data: { aceiteTermo: true } },
      { sub: 'uid-sem-provedor', email: 'x@exemplo.dev' }
    );
    const erro = (r.corpo as { error: { details?: { motivo?: string } } }).error;
    expect(erro.details?.motivo).toBe('sessao_anonima');
  });

  it('⚔ o SEXTO caminho: infra caindo sai como `internal`, e é o único que sai', async () => {
    // A lista de cinco é exaustiva para RECUSAS DE REGRA — não para falhas de
    // infraestrutura. Esta sai `internal` sem motivo nomeado, de propósito, e
    // quem a traduz para a pessoa é o `motivoDaRecusaDaPromocao` do api-client,
    // que a joga em `indisponivel`. O caso existe para que essa fronteira seja
    // uma DECISÃO provada, e não uma descoberta em produção.
    estado.explodir = true;
    const r = await chamar({ data: { aceiteTermo: true } }, TOKEN_PARTICIPANTE);

    expect(r.statusCode).toBe(500);
    const erro = (r.corpo as { error: { status: string; details?: unknown } }).error;
    expect(erro.status).toBe('INTERNAL');
    expect(erro.details).toBeUndefined();
  });

  it('a promoção idempotente também atravessa: segunda chamada, zero escrita', async () => {
    estado.existe = true;
    const r = await chamar({ data: { aceiteTermo: true } }, TOKEN_PARTICIPANTE);
    expect(r.statusCode).toBe(200);
    expect(r.corpo).toEqual({
      result: {
        statusOnboarding: 'aguardando_convite',
        jaExistia: true,
        intencaoRegistrada: 'nao_declarada',
        nomeAplicado: false,
      },
    });
    expect(estado.escritas).toHaveLength(0);
  });

  it('⚔ PONTE-FIX · B1 · a SONDA DE FUMAÇA: o eco atravessa a serialização', async () => {
    // Este é o caso que fecha o vetor 5 de verdade. Uma sonda que mande
    // `intencao: 'clube'` e `nomeProfissional` e leia o corpo da resposta sabe,
    // por número e não por fé, se o servidor do outro lado conhece os dois
    // campos. Contra o contrato ANTERIOR, `intencaoRegistrada` chega
    // `undefined` — que é a assinatura do deploy fora de ordem.
    const r = await chamar(
      { data: { aceiteTermo: true, intencao: 'clube', nomeProfissional: 'Castelo Produções' } },
      TOKEN_PARTICIPANTE
    );
    expect(r.statusCode).toBe(200);
    const resultado = (r.corpo as { result: Record<string, unknown> }).result;
    expect(resultado['intencaoRegistrada']).toBe('clube');
    expect(resultado['nomeAplicado']).toBe(true);
    expect(estado.escritas[0]?.dados['organizacao']).toBe('Castelo Produções');
    // E o nome NÃO volta na resposta: o eco é booleano, como o log.
    expect(JSON.stringify(resultado)).not.toContain('Castelo');
  });

  it('⚔ PONTE-FIX · B1 · o typo do cliente novo volta ECOADO como `invalida`', async () => {
    const r = await chamar(
      { data: { aceiteTermo: true, intencao: 'clubes' } },
      TOKEN_PARTICIPANTE
    );
    expect(r.statusCode).toBe(200);
    expect((r.corpo as { result: Record<string, unknown> }).result['intencaoRegistrada']).toBe(
      'invalida'
    );
  });
});
