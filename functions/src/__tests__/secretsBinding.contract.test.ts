// =============================================================================
// functions/src/__tests__/secretsBinding.contract.test.ts
//
// A GUARDA CONTRA A CLASSE DE DEFEITO QUE JÁ CUSTOU DINHEIRO TRÊS VEZES
// (PIXREAL-FIX T6 · 2026-08-04). Estático: não sobe Emulator, não fala com
// rede, roda em milissegundos.
//
// O DEFEITO, sempre igual: uma function usa um segredo que o `runWith` dela
// não declara. Em produção o Cloud Functions injeta o secret SÓ em quem o
// declara, então o código lê `undefined` — e a falha nunca se parece com
// "faltou uma linha de config":
//
//   · 2026-07-29 · `CRM_ID_PEPPER` ausente em `createInscricaoCharge` ⇒ 500
//     antes de falar com o gateway. Três tentativas de compra do dono
//     morreram; o QR nunca chegou a existir.
//   · 2026-08-04 · `ASAAS_WEBHOOK_AUTH_TOKEN` ausente em
//     `confirmarPagamentoSandbox` ⇒ `AsaasConfigError` na construção do
//     provider ⇒ `internal` na cara do comprador (T1/T2 desta lane).
//   · 2026-08-04 · `QR_TOKEN_KEYS` ausente em `asaasWebhook` ⇒ keyring nulo ⇒
//     `emitirIngressosDoPedido` devolve lista vazia com `sem_keyring` ⇒ o
//     e-mail, que só sai com `ingressos.length > 0`, nunca é chamado. O
//     dinheiro entra e o comprador não recebe ingresso NEM erro (T5).
//
// O EMULADOR NÃO PEGA NADA DISSO, e é por isso que a suíte inteira passava
// verde enquanto a produção quebrava: local, as variáveis vivem no
// `process.env` do processo inteiro (`.env.local`), então todo mundo enxerga
// todo mundo. O binding só existe em produção — logo a prova precisa ser
// sobre o CÓDIGO, não sobre a execução.
//
// COMO A ANÁLISE FUNCIONA
//   1. lê os exports de `functions/src/index.ts` (a superfície deployável —
//      o que não está aqui não vira Function e não precisa de binding);
//   2. acha a declaração de cada um e extrai os `secrets: [...]` do `runWith`;
//   3. fecha o grafo de imports RELATIVOS a partir do módulo de cada export;
//   4. em cada módulo do fecho, procura CHAMADAS aos acessores de segredo
//      (`obterQrKeyring()`, `selectEmailProvider()`, …) e leituras diretas de
//      `process.env['SEGREDO']`;
//   5. exige que tudo que o fecho pode ler esteja declarado.
//
// APROXIMAÇÃO DELIBERADA (e a direção do erro): o passo 3 é por IMPORT, não
// por caminho de execução. Uma function que importa um módulo que chama o
// acessor conta como usuária do segredo, mesmo que aquele galho nunca rode
// naquela invocação. Isso gera binding a mais, nunca a menos — e binding a
// mais custa uma linha de config, enquanto binding a menos custou as três
// falhas acima. Kleppmann: o dado sobrevive ao código, e aqui o "dado" é o
// dinheiro que já entrou.
//
// A EXCEÇÃO, E POR QUE ELA NÃO VIRA LIXEIRA (ver `HERDADO_OK`): existem dois
// casos em que a aproximação erra para um lado caro — uma function de LEITURA
// que importa um módulo do dinheiro para pegar um helper e, por causa disso,
// receberia a chave da conta Asaas. Dar chave de pagamento a quem só cota
// preço é violação de menor privilégio, e o conserto certo é quebrar o
// import, não distribuir o segredo. Até isso acontecer, cada dispensa é
// nominal por (function, segredo), carrega o motivo, e — o ponto que a
// mantém honesta — só vale para necessidade HERDADA do fecho. Se alguém
// escrever a chamada do acessor DENTRO do módulo da própria function, a
// dispensa não cobre e o teste fica vermelho.

// =============================================================================

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = resolve(__dirname, '..');
const INDEX = join(SRC, 'index.ts');

/**
 * Os segredos DE VERDADE — os que vivem no Secret Manager e só chegam ao
 * runtime pelo binding. Variáveis não-secretas do `functions/.env`
 * (`QR_TOKEN_KID_ATIVO`, `BREVO_SENDER_EMAIL`, `LEELA_PUBLIC_URL`) sobem com
 * TODA function e por isso ficam fora: elas não têm binding a esquecer.
 */
const SEGREDOS = [
  'ASAAS_API_KEY',
  'ASAAS_WEBHOOK_AUTH_TOKEN',
  'BREVO_API_KEY',
  'CRM_ID_PEPPER',
  'QR_TOKEN_KEYS',
] as const;
type Segredo = (typeof SEGREDOS)[number];

/**
 * Acessores: a função que, ao ser CHAMADA, lê o segredo do ambiente. O módulo
 * que DEFINE o acessor não conta como usuário (senão qualquer import de
 * `qrToken.ts` arrastaria o keyring); quem conta é quem chama.
 */
const ACESSORES: { chamada: string; defineEm: string; exige: Segredo[] }[] = [
  {
    chamada: 'obterQrKeyring(',
    defineEm: 'eventos/qrToken.ts',
    exige: ['QR_TOKEN_KEYS'],
  },
  {
    chamada: 'carregarQrKeyring(',
    defineEm: 'eventos/qrToken.ts',
    exige: ['QR_TOKEN_KEYS'],
  },
  {
    chamada: 'selectEmailProvider(',
    defineEm: 'email/selectEmailProvider.ts',
    exige: ['BREVO_API_KEY'],
  },
  {
    // O selector constrói o AsaasProvider, e a construção exige os DOIS —
    // faltar o token do webhook é o que levantou `AsaasConfigError` no T1.
    chamada: 'selectPaymentProvider(',
    defineEm: 'payments/selectProvider.ts',
    exige: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_AUTH_TOKEN'],
  },
  {
    chamada: 'asaasConfigFromEnv(',
    defineEm: 'payments/asaasProvider.ts',
    exige: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_AUTH_TOKEN'],
  },
  {
    chamada: 'crmIdPepper(',
    defineEm: 'crm/agregarClientes.ts',
    exige: ['CRM_ID_PEPPER'],
  },
];

// ---------------------------------------------------------------------------
// Leitura do código (sem AST — regex sobre fonte, e o repo é o teste do repo)
// ---------------------------------------------------------------------------

const cache = new Map<string, string>();
function ler(arquivo: string): string {
  const posto = cache.get(arquivo);
  if (posto !== undefined) return posto;
  const txt = readFileSync(arquivo, 'utf8');
  cache.set(arquivo, txt);
  return txt;
}

/** Comentários fora: um `selectEmailProvider()` citado em prosa não é chamada. */
function semComentarios(fonte: string): string {
  return fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
}

function resolverImport(deArquivo: string, especificador: string): string | null {
  const base = resolve(dirname(deArquivo), especificador);
  for (const tentativa of [`${base}.ts`, join(base, 'index.ts')]) {
    if (existsSync(tentativa)) return tentativa;
  }
  return null;
}

/** Imports/reexports relativos do módulo (o bundle embute tudo isto). */
function importsDe(arquivo: string): string[] {
  const fonte = semComentarios(ler(arquivo));
  const alvos: string[] = [];
  for (const m of fonte.matchAll(/from\s+'(\.[^']+)'/g)) {
    const r = resolverImport(arquivo, m[1] as string);
    if (r !== null) alvos.push(r);
  }
  return alvos;
}

/** Fecho transitivo de imports a partir de um módulo. */
function fechoDe(raiz: string): Set<string> {
  const visto = new Set<string>();
  const fila = [raiz];
  while (fila.length > 0) {
    const atual = fila.pop() as string;
    if (visto.has(atual)) continue;
    visto.add(atual);
    fila.push(...importsDe(atual));
  }
  return visto;
}

/**
 * As formas de LER um segredo do ambiente que a análise reconhece.
 *
 * ⚠ PIXREAL-REV (2026-08-04) — a versão original desta função procurava DUAS
 * strings literais (`process.env['X']` e `env['X']`), e três sondas plantadas
 * numa cópia isolada de `functions/src` atravessaram a guarda inteira sem
 * arranhão: `process.env.X` (ponto), `const { X } = process.env`
 * (desestruturação) e `ambiente['X']` (parâmetro de env com outro nome). Todas
 * compilam — o `tsconfig` não liga `noPropertyAccessFromIndexSignature` —, e
 * qualquer uma delas reintroduziria em silêncio a classe de defeito que já
 * custou três incidentes. Aqui o reconhecimento é por FORMA, não por literal:
 *
 *   1. colchete sobre QUALQUER identificador — `process.env['X']`, `env['X']`,
 *      `ambiente['X']`. O nome do parâmetro não pode ser a diferença entre
 *      pegar e não pegar;
 *   2. ponto sobre algo que termina em `env`/`Env` — `process.env.X`;
 *   3. desestruturação a partir de env — `const { X, Y } = process.env`.
 *
 * Erra para o lado seguro (binding a mais) por construção: uma menção em
 * string de log casa o padrão 1 se estiver entre colchetes, e não casa nada
 * fora disso.
 */
function leEnv(fonte: string, s: Segredo): boolean {
  const colchete = new RegExp(`\\[\\s*(['"\`])${s}\\1\\s*\\]`);
  const ponto = new RegExp(`[A-Za-z0-9_$]*[eE]nv\\s*\\.\\s*${s}\\b`);
  const desestrutura = new RegExp(
    `\\{[^{}]*\\b${s}\\b[^{}]*\\}\\s*=\\s*[A-Za-z0-9_$.]*[eE]nv\\b`
  );
  return colchete.test(fonte) || ponto.test(fonte) || desestrutura.test(fonte);
}

/** União dos fechos de todos os exports do index (+ o próprio index). */
function fechoDeTodosOsExports(): Set<string> {
  const todos = new Set<string>([INDEX]);
  for (const fn of exportsDoIndex()) {
    for (const modulo of fechoDe(fn.arquivo)) todos.add(modulo);
  }
  return todos;
}

/** Segredos que ESTE módulo pode ler (chamadas de acessor + env direto). */
function segredosDoModulo(arquivo: string): Set<Segredo> {
  const fonte = semComentarios(ler(arquivo));
  const precisa = new Set<Segredo>();
  for (const acessor of ACESSORES) {
    if (arquivo.replace(/\\/g, '/').endsWith(acessor.defineEm)) continue;
    if (fonte.includes(acessor.chamada)) {
      for (const s of acessor.exige) precisa.add(s);
    }
  }
  for (const s of SEGREDOS) {
    if (leEnv(fonte, s)) precisa.add(s);
  }
  return precisa;
}

/**
 * Dispensas NOMINAIS de necessidade HERDADA (nunca de chamada própria).
 *
 * Cada entrada afirma: "esta function importa um módulo que chama o acessor,
 * mas a execução dela não alcança a chamada". Evidência lida no código, e é
 * por isso que a dispensa é estreita — ela não cobre uma chamada escrita no
 * módulo da própria function, então a próxima pessoa que precisar do segredo
 * de verdade encontra o teste vermelho, não uma exceção pronta.
 *
 * ⚠ PIXREAL-REV (2026-08-04) — a dispensa passou a nomear a ORIGEM, e não só
 * o par (function, segredo). Sem isso ela era um cheque em branco vitalício:
 * plantei um helper novo com `selectPaymentProvider()` no caminho de execução
 * do `requestTransfer` (uma necessidade REAL de chave de gateway numa function
 * que sobe sem nenhum segredo) e a guarda seguiu VERDE, porque a dispensa
 * antiga cobria "requestTransfer + ASAAS_API_KEY" viesse de onde viesse.
 * Agora ela cobre exatamente os módulos listados em `via`: qualquer caminho
 * NOVO para o mesmo segredo volta a ser reportado, e uma via que deixou de
 * existir derruba o teste em vez de virar exceção órfã.
 */
const HERDADO_OK: {
  fn: string;
  segredo: Segredo;
  /** Módulos (sufixo do caminho em `src/`) que produzem a necessidade herdada. */
  via: string[];
  porque: string;
}[] = [
  {
    fn: 'cotarInscricaoCheckout',
    segredo: 'ASAAS_API_KEY',
    via: [
      'checkout/createInscricaoCharge.ts',
      'checkout/expirarPixPendente.ts',
      'payments/selectProvider.ts',
    ],
    porque:
      'importa `carregarInsumos` de createInscricaoCharge.ts, onde o ' +
      '`selectPaymentProvider()` mora DENTRO da callable de cobrança. Cotar é ' +
      'read-only e não emite cobrança; dar a chave da conta Asaas a ela seria ' +
      'menor privilégio ao contrário. Contrato registrado na lane DEPLOY-FINAL ' +
      '("sobe com zero segredos — ela cota, não cobra").',
  },
  {
    fn: 'cotarInscricaoCheckout',
    segredo: 'ASAAS_WEBHOOK_AUTH_TOKEN',
    via: [
      'checkout/createInscricaoCharge.ts',
      'checkout/expirarPixPendente.ts',
      'payments/selectProvider.ts',
    ],
    porque:
      'viaja em par com o ASAAS_API_KEY porque `asaasConfigFromEnv` exige os ' +
      'dois para construir o provider — e a cotação não constrói provider ' +
      'nenhum. Vale a mesma leitura: o import é do helper, não do caminho.',
  },
  {
    fn: 'cotarInscricaoCheckout',
    segredo: 'CRM_ID_PEPPER',
    via: [
      'checkout/createInscricaoCharge.ts',
      'checkout/pessoaRegistry.ts',
      'checkout/travaCobrancaPix.ts',
      'crm/agregarClientes.ts',
    ],
    porque:
      'o `crmIdPepper()` de createInscricaoCharge.ts é chamado em ' +
      '`derivarOrigemAceite`, que só roda no caminho de CRIAÇÃO (hash do IP do ' +
      'aceite). A cotação não deriva aceite nem grava pessoa.',
  },
  {
    fn: 'requestTransfer',
    segredo: 'ASAAS_API_KEY',
    via: [
      'checkout/estornarInscricao.ts',
      'finance/requestRefund.ts',
      'payments/selectProvider.ts',
    ],
    porque:
      'importa `lerPoliticaVendasTx` de requestRefund.ts, cujo ' +
      '`selectPaymentProvider()` vive nas callables de estorno. O saque é uma ' +
      'solicitação gravada no Firestore para a fila de repasse — não fala com ' +
      'o gateway.',
  },
  {
    fn: 'requestTransfer',
    segredo: 'ASAAS_WEBHOOK_AUTH_TOKEN',
    via: [
      'checkout/estornarInscricao.ts',
      'finance/requestRefund.ts',
      'payments/selectProvider.ts',
    ],
    porque:
      'par obrigatório do ASAAS_API_KEY na construção do provider, e o saque ' +
      'não constrói provider. Quem fala com o gateway na cadeia de repasse é ' +
      'a function de execução, não a de solicitação.',
  },
];

// ---------------------------------------------------------------------------
// A superfície deployável: cada export de index.ts vira uma Cloud Function
// ---------------------------------------------------------------------------

interface Exportada {
  nome: string;
  arquivo: string;
  declarados: Segredo[];
}

function exportsDoIndex(): Exportada[] {
  const fonte = semComentarios(ler(INDEX));
  const saida: Exportada[] = [];
  for (const m of fonte.matchAll(/export\s*\{([^}]+)\}\s*from\s*'(\.[^']+)'/g)) {
    const arquivo = resolverImport(INDEX, m[2] as string);
    if (arquivo === null) continue;
    for (const bruto of (m[1] as string).split(',')) {
      const nome = bruto.trim().split(/\s+as\s+/).pop()?.trim();
      if (nome === undefined || nome.length === 0) continue;
      saida.push({ nome, arquivo, declarados: declaradosDe(arquivo, nome) });
    }
  }
  return saida;
}

/**
 * Os `secrets: [...]` do `runWith` da declaração. Recorta a partir de
 * `export const <nome> =` até a próxima declaração de topo — as duas formas do
 * repo (`runWith({...}).https.onCall` e `runWith({...}).pubsub.schedule`) caem
 * na mesma janela; `pubsub.schedule` sem `runWith` devolve vazio, que é o
 * contrato dela.
 */
function declaradosDe(arquivo: string, nome: string): Segredo[] {
  const fonte = semComentarios(ler(arquivo));
  const inicio = fonte.search(new RegExp(`export\\s+const\\s+${nome}\\s*=`));
  if (inicio < 0) return [];
  const resto = fonte.slice(inicio);
  const fim = resto.slice(1).search(/\nexport\s+(const|function|async)\s/);
  const janela = fim < 0 ? resto : resto.slice(0, fim + 1);
  const bloco = /secrets\s*:\s*\[([^\]]*)\]/.exec(janela);
  if (bloco === null) return [];
  return SEGREDOS.filter((s) => (bloco[1] as string).includes(`'${s}'`));
}

// ---------------------------------------------------------------------------
// O contrato
// ---------------------------------------------------------------------------

const exportadas = exportsDoIndex();

/** Caminho do módulo relativo a `src/`, com barras normais (chave de `via`). */
function relSrc(arquivo: string): string {
  return arquivo.replace(/\\/g, '/').split('/src/').pop() as string;
}

/**
 * Origem de cada necessidade HERDADA: segredo → módulos do fecho que o leem.
 * Necessidade PRÓPRIA (chamada no módulo da própria function) fica de fora —
 * ela nunca é dispensável.
 */
function origensHerdadas(fn: Exportada): Map<Segredo, string[]> {
  const propria = segredosDoModulo(fn.arquivo);
  const origens = new Map<Segredo, string[]>();
  for (const modulo of fechoDe(fn.arquivo)) {
    if (modulo === fn.arquivo) continue;
    for (const s of segredosDoModulo(modulo)) {
      if (propria.has(s)) continue;
      const lista = origens.get(s) ?? [];
      lista.push(relSrc(modulo));
      origens.set(s, lista);
    }
  }
  for (const [s, lista] of origens) origens.set(s, [...new Set(lista)].sort());
  return origens;
}

describe('CONTRATO · todo segredo usado está declarado no runWith', () => {
  it('a leitura do index encontrou a superfície deployável inteira', () => {
    // Sanidade da própria análise: um regex que para de casar transformaria
    // este arquivo num teste que passa sempre — o pior tipo de guarda.
    expect(exportadas.length).toBeGreaterThan(60);
    expect(exportadas.map((e) => e.nome)).toContain('createInscricaoCharge');
    expect(exportadas.map((e) => e.nome)).toContain('asaasWebhook');
  });

  it('o index não esconde function nenhuma atrás de `export *`', () => {
    // ⚠ PIXREAL-REV: a leitura acima só enxerga `export { … } from './x'`. Uma
    // function exportada por `export * from './x'` some da análise INTEIRA — e
    // some em silêncio, porque o total continua acima do piso de sanidade.
    // Plantei uma sonda assim numa cópia isolada: ela lia `QR_TOKEN_KEYS` sem
    // declarar e a guarda ficou verde. Enquanto a análise for por nome, a
    // forma que a esconde é proibida no index.
    const estrelas = [...semComentarios(ler(INDEX)).matchAll(/^export\s*\*.*$/gm)];
    expect(estrelas.map((m) => m[0])).toEqual([]);
  });

  it('a lista SEGREDOS cobre todo secret que algum runWith declara', () => {
    // A análise é fechada sobre 5 nomes. Um segredo NOVO amarrado a um
    // `runWith` sem entrar aqui nasce fora da guarda: ninguém confere se quem
    // o lê o declarou. Este caso falha no dia em que o sexto segredo aparecer.
    const declarados = new Set<string>();
    for (const arquivo of fechoDeTodosOsExports()) {
      const fonte = semComentarios(ler(arquivo));
      for (const bloco of fonte.matchAll(/secrets\s*:\s*\[([^\]]*)\]/g)) {
        for (const nome of (bloco[1] as string).matchAll(/'([A-Z][A-Z0-9_]{2,})'/g)) {
          declarados.add(nome[1] as string);
        }
      }
    }
    expect([...declarados].sort().filter((s) => !SEGREDOS.includes(s as Segredo))).toEqual([]);
  });

  it('a análise reconhece os bindings que já existem (controle positivo)', () => {
    const charge = exportadas.find((e) => e.nome === 'createInscricaoCharge');
    expect(charge?.declarados).toEqual(
      expect.arrayContaining(['ASAAS_API_KEY', 'ASAAS_WEBHOOK_AUTH_TOKEN', 'CRM_ID_PEPPER'])
    );
  });

  it('nenhuma function usa segredo que o runWith dela não declara', () => {
    const faltando: string[] = [];
    for (const fn of exportadas) {
      // Necessidade PRÓPRIA (o acessor é chamado no módulo da function) e
      // HERDADA (veio do resto do fecho de imports). A dispensa só alcança a
      // segunda — chamada própria nunca é dispensável.
      const propria = segredosDoModulo(fn.arquivo);
      const herdada = origensHerdadas(fn);

      // A dispensa vale POR ORIGEM: ela cobre o segredo enquanto TODOS os
      // módulos que o produzem estiverem na lista `via` que alguém leu e
      // assinou. Caminho novo para o mesmo segredo ⇒ volta a ser reportado.
      const dispensado = (s: Segredo, origens: string[]): boolean => {
        const permitidas = new Set(
          HERDADO_OK.filter((d) => d.fn === fn.nome && d.segredo === s).flatMap((d) => d.via)
        );
        return permitidas.size > 0 && origens.every((o) => permitidas.has(o));
      };

      const ausentes = [
        ...[...propria].filter((s) => !fn.declarados.includes(s)),
        ...[...herdada]
          .filter(([s, origens]) => !fn.declarados.includes(s) && !dispensado(s, origens))
          .map(([s]) => s),
      ];
      if (ausentes.length > 0) {
        faltando.push(`${fn.nome} → falta ${[...new Set(ausentes)].sort().join(', ')}`);
      }
    }
    // A mensagem é o conserto: cada linha vira uma linha de `secrets`.
    expect(faltando.sort()).toEqual([]);
  });

  it('toda dispensa aponta para uma function real e traz motivo escrito', () => {
    // Uma dispensa órfã (function renomeada/removida) é uma mutezinha que
    // sobrevive ao motivo dela — o começo de toda lixeira de exceção.
    for (const d of HERDADO_OK) {
      expect(exportadas.map((e) => e.nome)).toContain(d.fn);
      expect(d.porque.length).toBeGreaterThan(60);
      expect(d.via.length).toBeGreaterThan(0);
    }
  });

  it('toda dispensa é EXERCIDA hoje, e nenhuma via dela é caminho morto', () => {
    // O outro lado da dispensa por origem: uma `via` que deixou de produzir a
    // necessidade (import removido, módulo renomeado) é uma autorização que
    // sobreviveu ao fato. Ela não incomoda ninguém até o dia em que um caminho
    // NOVO para o mesmo segredo cai debaixo dela — e aí silencia um defeito
    // real. Este caso obriga a lista a descrever o repo de hoje.
    const sobrando: string[] = [];
    for (const d of HERDADO_OK) {
      const fn = exportadas.find((e) => e.nome === d.fn);
      if (fn === undefined) continue; // já reportado pelo caso anterior
      const origens = origensHerdadas(fn).get(d.segredo) ?? [];
      for (const via of d.via) {
        if (!origens.includes(via)) sobrando.push(`${d.fn}/${d.segredo} → via morta: ${via}`);
      }
      if (origens.length === 0) sobrando.push(`${d.fn}/${d.segredo} → dispensa sem necessidade`);
    }
    expect(sobrando.sort()).toEqual([]);
  });
});
