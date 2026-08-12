// @ts-check
/**
 * eslint-plugin leela-canon — a trava de PROCEDÊNCIA do componente (S005-T5).
 *
 * O projeto tinha gate de marca (`leela-tokens`), gate de rolagem
 * (`leela-scroll`) e gate de fronteira (`leela-auth`). Nenhum dos três julgava
 * de ONDE veio o componente. Um combobox artesanal construído 100% com token
 * semântico passa nos três — e a medição encontrou 223 instâncias exatamente
 * assim: marca conforme, gate verde, procedência errada.
 *
 * O precedente é literal, e esta é a generalização dele:
 *
 *   "Eram DEZESSETE campos de senha em nove arquivos, nos dois apps. O décimo
 *    oitavo será escrito por alguém que não leu nenhum dos outros — e é ele que
 *    esta regra pega." — `leela-auth-plugin.mjs`, regra `senha-fora-do-ds`
 *
 * Onde `senha-fora-do-ds` trava UM controle, `leela-canon` trava a família
 * inteira nomeada no cânone (`leela-specs/03-canon/canone-de-componentes.md`).
 *
 * A fronteira do que vira lint e do que vira contagem é deliberada: **o que é
 * ambíguo não vira erro de lint.** Uma regra que dispara falso positivo é
 * desligada em duas semanas, e gate desligado é pior que gate nenhum, porque
 * mente sobre a cobertura. O ambíguo (`<button>` que replica variante,
 * superfície crua, receita de grid) é contado com catraca por
 * `scripts/gate-canon.mjs`.
 *
 * Escopo por config (`eslint.config.mjs`), como manda o precedente do
 * `senha-fora-do-ds`: o design system PRECISA do elemento cru — é ele que
 * constrói o primitivo.
 */

// ---------------------------------------------------------------------------
// Walker — o mesmo do leela-auth: o parser TS emite JSX dentro de expressões,
// arrays e chamadas, e um walker só-de-JSX perderia esses caminhos.
// ---------------------------------------------------------------------------

/**
 * @param {any} no
 * @param {(n: any) => void} visitar
 */
function percorrer(no, visitar) {
  if (no === null || typeof no !== 'object') return;
  if (Array.isArray(no)) {
    for (const item of no) percorrer(item, visitar);
    return;
  }
  if (typeof no.type === 'string') visitar(no);
  for (const chave of Object.keys(no)) {
    if (chave === 'parent') continue;
    percorrer(no[chave], visitar);
  }
}

// ===========================================================================
// Regra 1 — controle-cru-fora-do-ds
// ===========================================================================

/**
 * Elementos intrínsecos que SÃO um controle com canônico publicado.
 * A coluna do meio é o que a mensagem sugere; a terceira é o critério de
 * escolha, quando existe vizinho (o cânone §1 separa os quatro casos de
 * seleção, e a mensagem carrega a régua para quem for consertar).
 */
const CONTROLES = {
  select: {
    canonico: 'Select (baixa cardinalidade) ou Combobox (busca/alta cardinalidade)',
    criterio:
      'até ~7 opções conhecidas e sem busca é Select; quando rolar é pior que digitar, Combobox. Filtro de lista nunca é nenhum dos dois — é FilterMenu.',
  },
  option: {
    canonico: 'Select (baixa cardinalidade) ou Combobox (busca/alta cardinalidade)',
    criterio:
      'a lista do <select> nativo é desenhada pelo sistema operacional e não aceita os tokens do DS.',
  },
  textarea: { canonico: 'Textarea', criterio: '' },
  dialog: {
    canonico: 'Modal / ConfirmModal / Dialog / Drawer',
    criterio:
      'Modal no painel; Dialog na superfície pública (Radix-free, ADR-017); Drawer quando o painel é lateral.',
  },
};

/**
 * `<input>` é o caso em que o elemento sozinho não diz nada — o `type` decide
 * qual canônico serve. O que NÃO está aqui não é violação: `hidden`, `submit`,
 * `button`, `range` e `color` não têm equivalente publicado.
 *
 * `password` está fora de propósito: já é a `leela-auth/senha-fora-do-ds`, que
 * existe desde a FRONTEIRA-AUTH. Regra nova não duplica regra velha — duas
 * regras sobre o mesmo fato dão duas mensagens diferentes para o mesmo
 * conserto, e a segunda envelhece.
 */
const TIPOS_DE_INPUT = {
  checkbox: { canonico: 'Checkbox', criterio: '' },
  radio: { canonico: 'Radio / RadioGroup / RadioCard', criterio: 'RadioCard quando a opção tem descrição e peso.' },
  date: { canonico: 'DatePicker / DateRangePicker / Calendar', criterio: 'o calendário do sistema operacional é proibido pela governança §8.' },
  'datetime-local': { canonico: 'DatePicker + hora (no painel, components/fields/DateTimeField)', criterio: 'o calendário do sistema operacional é proibido pela governança §8.' },
  month: { canonico: 'DatePicker / Calendar', criterio: 'o calendário do sistema operacional é proibido pela governança §8.' },
  week: { canonico: 'DatePicker / Calendar', criterio: 'o calendário do sistema operacional é proibido pela governança §8.' },
  time: { canonico: 'components/fields/DateTimeField', criterio: 'o spinner de hora só é legítimo DENTRO do DateTimeField (cânone §2) — fora dele, entra pelo campo do painel.' },
  file: { canonico: 'FileInput', criterio: 'imagem com preview é components/upload/ImageUploadField.' },
  search: { canonico: 'SearchInput', criterio: '' },
  text: { canonico: 'Input (ou Field, quando há rótulo e validação)', criterio: '' },
  email: { canonico: 'Input (ou Field, quando há rótulo e validação)', criterio: '' },
  tel: { canonico: 'Input (ou Field, quando há rótulo e validação)', criterio: '' },
  number: { canonico: 'Input (ou Field, quando há rótulo e validação)', criterio: '' },
  url: { canonico: 'Input (ou Field, quando há rótulo e validação)', criterio: '' },
};

/** Nome do elemento intrínseco (minúsculo) do JSXOpeningElement, ou null. */
function nomeIntrinseco(abertura) {
  const nome = abertura?.name;
  if (nome?.type !== 'JSXIdentifier') return null;
  return /^[a-z]/.test(nome.name) ? nome.name : null;
}

/** Valor literal de um atributo JSX (`x="a"` e `x={'a'}`), ou null. */
function atributoLiteral(abertura, alvo) {
  for (const attr of abertura?.attributes ?? []) {
    if (attr.type !== 'JSXAttribute') continue;
    if (attr.name?.name !== alvo) continue;
    const v = attr.value;
    if (v?.type === 'Literal' && typeof v.value === 'string') return v.value;
    if (
      v?.type === 'JSXExpressionContainer' &&
      v.expression?.type === 'Literal' &&
      typeof v.expression.value === 'string'
    ) {
      return v.expression.value;
    }
    // `type={algumaVariavel}` — indeterminado. Não é ambíguo por descuido: é
    // desconhecido, e desconhecido não vira erro.
    return null;
  }
  return undefined;
}

/** true quando o elemento tem o atributo, com qualquer valor. */
function temAtributo(abertura, alvo) {
  return (abertura?.attributes ?? []).some(
    (a) => a.type === 'JSXAttribute' && a.name?.name === alvo,
  );
}

/**
 * Encontra os controles crus de uma AST.
 *
 * @param {any} ast
 * @param {{ permitidos?: string[] }} [opcoes]
 * @returns {Array<{ no: any, elemento: string, canonico: string, criterio: string }>}
 */
export function controlesCrus(ast, opcoes = {}) {
  const permitidos = new Set(opcoes.permitidos ?? []);
  /** @type {Array<{ no: any, elemento: string, canonico: string, criterio: string }>} */
  const achados = [];

  percorrer(ast, (no) => {
    if (no.type !== 'JSXOpeningElement') return;
    const nome = nomeIntrinseco(no);
    if (nome === null) return;
    if (permitidos.has(nome)) return;

    if (nome === 'input') {
      // `type={expressão}` é desconhecido; `type` ausente é campo de texto.
      const tipo = atributoLiteral(no, 'type');
      if (tipo === null) return;
      const chave = tipo === undefined ? 'text' : tipo.toLowerCase();
      if (chave === 'password') return; // leela-auth/senha-fora-do-ds
      const alvo = TIPOS_DE_INPUT[chave];
      if (!alvo) return;
      if (permitidos.has(`input[type=${chave}]`)) return;
      achados.push({
        no,
        elemento: chave === 'text' && tipo === undefined ? '<input>' : `<input type="${chave}">`,
        canonico: alvo.canonico,
        criterio: alvo.criterio,
      });
      return;
    }

    const alvo = CONTROLES[nome];
    if (!alvo) return;
    // `<dialog>` do HTML só é overlay quando é o elemento nativo; qualquer
    // `<dialog>` é, então nada a discriminar aqui — mas mantemos a checagem de
    // atributo para o caso `<select multiple>` merecer mensagem própria um dia.
    achados.push({
      no,
      elemento: nome === 'select' && temAtributo(no, 'multiple') ? '<select multiple>' : `<${nome}>`,
      canonico: alvo.canonico,
      criterio: alvo.criterio,
    });
  });

  return achados;
}

/** @type {import('eslint').Rule.RuleModule} */
const controleCruForaDoDs = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Controle nativo com componente canônico publicado no design system não se reconstrói na tela.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          permitidos: { type: 'array', items: { type: 'string' } },
          arquivosDeExcecao: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      cru: 'Controle cru: `{{elemento}}`. O canônico é `{{canonico}}` — importe do @leela/design-system em vez de reconstruir. {{criterio}}',
    },
  },
  create(context) {
    const opcoes = context.options[0] ?? {};
    // A porta ÚNICA de exceção (governança §8): entrar nela exige editar o
    // eslint.config.mjs, e a linha aparece sozinha no diff da revisão. É o
    // mesmo mecanismo do `rota-fora-da-fronteira`, e ele funcionou: a decisão
    // para de se esconder na indentação de um arquivo de tela.
    const excecoes = opcoes.arquivosDeExcecao ?? [];
    const arquivo = (context.filename ?? context.getFilename() ?? '').replace(/\\/g, '/');
    if (excecoes.some((p) => arquivo.endsWith(p))) return {};

    return {
      'Program:exit'() {
        const ast = context.sourceCode?.ast ?? context.getSourceCode().ast;
        for (const achado of controlesCrus(ast, opcoes)) {
          context.report({
            node: achado.no,
            messageId: 'cru',
            data: {
              elemento: achado.elemento,
              canonico: achado.canonico,
              criterio: achado.criterio,
            },
          });
        }
      },
    };
  },
};

// ===========================================================================
// Regra 2 — padrao-reimplementado-fora-do-ds
// ===========================================================================

/**
 * O segundo mecanismo da L-021, e o mais caro: a re-implementação BATIZADA.
 * Um `<div>` com a anatomia do Card é dívida; um componente CHAMADO `Card`
 * fora do DS é uma duplicata que parece oficial, e é ela que a próxima pessoa
 * importa achando que importou o cânone.
 *
 * O nome do ARQUIVO não é evidência e a regra não o usa: `KitCard.tsx` que
 * COMPÕE `Card` é o comportamento desejado. O que se pega é a DECLARAÇÃO.
 */

/**
 * Sinônimos reconhecidos por padrão — o batismo em outra língua ou outra moda.
 *
 * As seis últimas entradas nasceram na Onda 0 Parte B, junto com as peças de
 * moldura, e é onde o batismo mais acontece: "Bento", "VStack" e "KpiGrid" são
 * nomes que qualquer pessoa escreveria sem saber que o primitivo existe — a
 * moldura passou o projeto inteiro sem canônico, então ninguém tem o reflexo
 * de procurar.
 *
 * O que ficou DE FORA, e a razão importa mais que a lista: `ClubeCard`,
 * `ComunicadoCard` e `CampanhaCard` não são sinônimos de `CardDominio`. A §5
 * da spec protege explicitamente o wrapper que COMPÕE — `KitCard.tsx`
 * compondo `Card` é o comportamento desejado —, e pôr esses nomes aqui
 * proibiria para sempre o wrapper legítimo de uma família de domínio. A dívida
 * deles é de SUPERFÍCIE, e quem a mede é a catraca, não a regra dura.
 */
export const SINONIMOS_PADRAO = {
  Select: ['Dropdown', 'DropdownSelect', 'Picker', 'Seletor'],
  Combobox: ['Autocomplete', 'SelectSearch', 'BuscaSelect'],
  Modal: ['Overlay', 'Popup', 'Lightbox'],
  Card: ['Cartao', 'Painel', 'Box', 'Surface', 'Tile'],
  Table: ['DataTable', 'Tabela', 'Grid'],
  EmptyState: ['Vazio', 'SemDados', 'NoData'],
  // `Alert` SAIU daqui em 11/08 e virou nome canônico próprio: no shadcn, de
  // onde este DS puxa a proveniência, `alert` é o aviso em BLOCO e o flutuante
  // é `toast`. Enquanto o bloco não existia, mapear `Alert` para `Toast` era a
  // melhor aproximação; agora seria mandar a pessoa para o componente errado.
  Toast: ['Notificacao', 'Snackbar'],
  Alert: ['Callout', 'Aviso', 'Banner', 'InlineAlert', 'Notice'],
  Tooltip: ['Hint', 'Dica'],
  Stack: ['VStack', 'Empilhamento', 'Pilha'],
  FormGrid: ['GradeDeFormulario', 'FieldGrid', 'FormularioGrid'],
  MetricGrid: ['KpiGrid', 'GradeDeIndicadores', 'MetricsGrid'],
  SplitPanel: ['Bento', 'BentoGrid', 'SplitView', 'DoisPaineis'],
  SectionHeader: ['SecaoHead', 'SectionHead', 'BlocoHead', 'CabecalhoDeBloco'],
  CardDominio: ['CartaoDominio', 'EntityCard'],
};

/** true se a subárvore contém JSX — o que separa componente de função comum. */
function contemJsx(no) {
  let achou = false;
  percorrer(no, (n) => {
    if (n.type === 'JSXElement' || n.type === 'JSXFragment') achou = true;
  });
  return achou;
}

/** PascalCase de componente (`Card`, `KitCard`) e não CONSTANTE (`CARD_X`). */
function ehNomeDeComponente(nome) {
  return typeof nome === 'string' && /^[A-Z][A-Za-z0-9]*$/.test(nome) && !/^[A-Z0-9_]+$/.test(nome);
}

/**
 * Declarações de componente do arquivo: `function Nome()`, `const Nome = () =>`,
 * `const Nome = forwardRef(...)`, `const Nome = memo(...)`. O critério é o
 * mesmo nos quatro: nome PascalCase + JSX no corpo.
 *
 * @param {any} ast
 * @returns {Array<{ no: any, nome: string }>}
 */
export function componentesDeclarados(ast) {
  /** @type {Array<{ no: any, nome: string }>} */
  const achados = [];
  percorrer(ast, (no) => {
    if (no.type === 'FunctionDeclaration') {
      const nome = no.id?.name;
      if (ehNomeDeComponente(nome) && contemJsx(no.body)) achados.push({ no: no.id, nome });
      return;
    }
    if (no.type === 'VariableDeclarator') {
      const nome = no.id?.type === 'Identifier' ? no.id.name : null;
      if (!ehNomeDeComponente(nome)) return;
      if (no.init && contemJsx(no.init)) achados.push({ no: no.id, nome });
    }
  });
  return achados;
}

/**
 * @param {any} ast
 * @param {{ canone?: string[], sinonimos?: Record<string, string[]> }} [opcoes]
 * @returns {Array<{ no: any, nome: string, canonico: string, viaSinonimo: boolean }>}
 */
export function padroesReimplementados(ast, opcoes = {}) {
  const canone = new Set(opcoes.canone ?? []);
  const sinonimos = opcoes.sinonimos ?? SINONIMOS_PADRAO;

  /** sinônimo → canônico */
  const porSinonimo = new Map();
  for (const [canonico, lista] of Object.entries(sinonimos)) {
    for (const s of lista) porSinonimo.set(s, canonico);
  }

  /** @type {Array<{ no: any, nome: string, canonico: string, viaSinonimo: boolean }>} */
  const achados = [];
  for (const { no, nome } of componentesDeclarados(ast)) {
    if (canone.has(nome)) {
      achados.push({ no, nome, canonico: nome, viaSinonimo: false });
      continue;
    }
    const canonico = porSinonimo.get(nome);
    // Sinônimo só acusa se o canônico correspondente EXISTE de fato no barrel —
    // senão a regra passa a inventar um componente que ninguém pode importar.
    if (canonico && canone.has(canonico)) {
      achados.push({ no, nome, canonico, viaSinonimo: true });
    }
  }
  return achados;
}

/** @type {import('eslint').Rule.RuleModule} */
const padraoReimplementadoForaDoDs = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Componente declarado fora do design system não pode usar o nome (nem o sinônimo) de um export canônico do barrel.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          canone: { type: 'array', items: { type: 'string' } },
          sinonimos: { type: 'object', additionalProperties: { type: 'array', items: { type: 'string' } } },
          arquivosDeExcecao: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      mesmoNome:
        'Componente `{{nome}}` declarado fora do design system colide com o export canônico `{{canonico}}` do @leela/design-system. Componha o do DS — o batismo é o que faz a duplicata parecer oficial e ser importada por engano.',
      sinonimo:
        'Componente `{{nome}}` é o `{{canonico}}` do @leela/design-system com outro nome. Componha o canônico; se o padrão for MESMO outro, o nome precisa dizer qual é.',
    },
  },
  create(context) {
    const opcoes = context.options[0] ?? {};
    const excecoes = opcoes.arquivosDeExcecao ?? [];
    const arquivo = (context.filename ?? context.getFilename() ?? '').replace(/\\/g, '/');
    if (excecoes.some((p) => arquivo.endsWith(p))) return {};

    return {
      'Program:exit'() {
        const ast = context.sourceCode?.ast ?? context.getSourceCode().ast;
        for (const achado of padroesReimplementados(ast, opcoes)) {
          context.report({
            node: achado.no,
            messageId: achado.viaSinonimo ? 'sinonimo' : 'mesmoNome',
            data: { nome: achado.nome, canonico: achado.canonico },
          });
        }
      },
    };
  },
};

// ===========================================================================
// A fonte do cânone — gerada do barrel, nunca escrita à mão
// ===========================================================================

/**
 * Extrai os componentes exportados de `packages/design-system/src/index.ts`.
 *
 * Uma lista copiada envelhece na primeira semana e passa a mentir — e essa
 * separação silenciosa entre o cânone escrito e o cânone real é o defeito que
 * a L-021 descreve, um nível acima. Por isso o `eslint.config.mjs` CHAMA esta
 * função em vez de listar nomes: a config não tem como divergir do barrel,
 * porque ela é o barrel.
 *
 * Critério de "componente": export de VALOR em PascalCase. Ficam de fora os
 * `export type`, os helpers camelCase (`buttonVariants`, `railNavIcon`,
 * `chartCategoryVar`, `cn`), os hooks (`useToast`) e as constantes
 * SCREAMING_SNAKE (`SCROLL_Y_ONLY`, `CHART_CATEGORY_COUNT`).
 *
 * @param {string} fonteDoBarrel conteúdo de src/index.ts
 * @returns {string[]} nomes ordenados
 */
export function canoneDoBarrel(fonteDoBarrel) {
  const nomes = new Set();
  const blocos = /export\s*\{([^}]*)\}/g;
  let m;
  while ((m = blocos.exec(fonteDoBarrel))) {
    for (let parte of m[1].split(',')) {
      parte = parte.trim();
      if (!parte || parte.startsWith('type ')) continue;
      const nome = parte.split(/\s+as\s+/)[0].trim();
      if (ehNomeDeComponente(nome)) nomes.add(nome);
    }
  }
  return [...nomes].sort();
}

const plugin = {
  meta: { name: 'leela-canon', version: '1.0.0' },
  rules: {
    'controle-cru-fora-do-ds': controleCruForaDoDs,
    'padrao-reimplementado-fora-do-ds': padraoReimplementadoForaDoDs,
  },
};

export default plugin;
