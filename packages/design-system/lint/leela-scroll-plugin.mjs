// @ts-check
/**
 * eslint-plugin leela-scroll — trava do padrão de rolagem (BUILD-SCROLL-PADRAO).
 *
 * Barra a declaração de UM eixo de overflow sozinho. A regra completa, com a
 * causa-raiz e as três formas legítimas de rolar, vive em
 * `packages/design-system/src/utils/scroll.ts` — este arquivo é o que a torna
 * verificável.
 *
 * O defeito que ela pega, em uma frase: pela CSS Overflow 3 §3.1, declarar um
 * eixo promove o outro de `visible` para `auto`. Então `overflow-y-auto` sozinho
 * cria DOIS contêineres de rolagem, e o segundo aparece como barra no dia em que
 * algum conteúdo estoura o eixo que ninguém declarou. No Windows/Chrome a barra
 * é clássica e come ~15px do eixo oposto, empurrando o conteúdo a estourar de
 * volta: a horizontal fabrica a vertical. O dono reportou isso três vezes (menu
 * secundário do evento, CRM, kits) antes de a regra existir.
 *
 * A análise é por LITERAL de string: os dois eixos precisam estar declarados no
 * mesmo literal, com o mesmo prefixo de modificador. Na prática isso quer dizer
 * "use a constante", porque é ela que já traz o par. O atalho `overflow-hidden`
 * / `overflow-auto` / `overflow-visible` passa: ele declara os dois eixos por
 * definição.
 *
 * Fora de escopo por `ignores` no eslint.config.mjs da raiz: arquivos de teste —
 * um `toHaveClass('overflow-y-hidden')` afirma uma classe, não declara CSS.
 */

/** Eixo oposto. */
const OPOSTO = /** @type {const} */ ({ x: 'y', y: 'x' });

/**
 * Separa o prefixo de modificador do utilitário. O corte é o último `:` FORA de
 * colchete — o `:` de dentro pertence à propriedade arbitrária, não ao
 * modificador (REV-SCROLL). `max-lg:overflow-x-auto` → (`max-lg:`,
 * `overflow-x-auto`); `max-lg:[overflow-y:auto]` → (`max-lg:`,
 * `[overflow-y:auto]`); `[scrollbar-width:none]` → (``, `[scrollbar-width:none]`).
 *
 * O `lastIndexOf(':')` cru cortava `[overflow-y:auto]` em (`[overflow-y:`,
 * `auto]`) e o token inteiro saía do radar — era o vetor de fuga nº 1.
 * @param {string} token
 * @returns {{ prefixo: string, util: string }}
 */
function separar(token) {
  let dentro = 0;
  let corte = -1;
  for (let i = 0; i < token.length; i += 1) {
    const c = token[i];
    if (c === '[') dentro += 1;
    else if (c === ']') dentro -= 1;
    else if (c === ':' && dentro === 0) corte = i;
  }
  return corte === -1
    ? { prefixo: '', util: token }
    : { prefixo: token.slice(0, corte + 1), util: token.slice(corte + 1) };
}

/** Propriedade arbitrária de eixo: `[overflow-y:auto]`, `[overflow:hidden]`. */
const ARBITRARIA = /^\[overflow(-x|-y)?:[^\]]+\]$/;

/**
 * Classifica o eixo que um utilitário declara, ou null se ele não declara eixo
 * nenhum. Cobre as DUAS grafias que o Tailwind aceita e que este repo usa lado
 * a lado: a utilitária (`overflow-y-auto`) e a arbitrária
 * (`[overflow-y:auto]`) — a segunda é idioma da casa (`[overflow-wrap:anywhere]`
 * na Table, `[scrollbar-width:none]` no SubNav), então era a mais provável de
 * reintroduzir o defeito por baixo do gate.
 * @param {string} util
 * @returns {'x' | 'y' | 'ambos' | null}
 */
function eixoDe(util) {
  if (ARBITRARIA.test(util)) {
    const prop = util.slice(1, util.indexOf(':'));
    return prop === 'overflow-x' ? 'x' : prop === 'overflow-y' ? 'y' : 'ambos';
  }
  if (!util.startsWith('overflow-')) return null;
  const resto = util.slice('overflow-'.length);
  return resto.startsWith('x-') ? 'x' : resto.startsWith('y-') ? 'y' : 'ambos';
}

/**
 * Devolve a classe ofensora (um eixo declarado sem o par) ou null.
 * @param {string} value
 * @returns {string | null}
 */
export function findEixoSolto(value) {
  if (!value.includes('overflow')) return null;

  /** @type {Map<string, Map<string, string>>} prefixo → (eixo → classe) */
  const porPrefixo = new Map();

  for (const token of value.split(/\s+/)) {
    if (token.length === 0) continue;
    const { prefixo, util } = separar(token);
    const eixo = eixoDe(util);
    if (eixo === null) continue;

    let eixos = porPrefixo.get(prefixo);
    if (!eixos) {
      eixos = new Map();
      porPrefixo.set(prefixo, eixos);
    }
    eixos.set(eixo, token);
  }

  for (const eixos of porPrefixo.values()) {
    // O atalho declara os dois eixos; o par x+y também. Só sobra o eixo solto.
    if (eixos.has('ambos')) continue;
    if (eixos.has('x') && eixos.has('y')) continue;
    const solto = eixos.get('x') ?? eixos.get('y');
    if (solto !== undefined) return solto;
  }

  return null;
}

/**
 * Chaves de objeto de estilo que declaram eixo. Cobre a grafia camelCase do
 * React (`overflowY`) e a grafia CSS entre aspas (`'overflow-y'`), as duas
 * aceitas em `style={{ … }}`.
 * @type {Record<string, 'x' | 'y' | 'ambos'>}
 */
const ESTILO_EIXO = {
  overflow: 'ambos',
  overflowX: 'x',
  overflowY: 'y',
  'overflow-x': 'x',
  'overflow-y': 'y',
};

/** Constante sugerida na mensagem, pelo eixo que a pessoa quis rolar. */
const SUGESTAO = {
  x: 'SCROLL_X_ONLY (ou SCROLL_X_ONLY_SEM_CROMO, em navegação)',
  y: 'SCROLL_Y_ONLY',
};

/** @type {import('eslint').Rule.RuleModule} */
const noScrollDeUmEixo = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Proíbe declarar um eixo de overflow sozinho — o CSS promove o outro a `auto` e nasce a segunda barra de rolagem',
    },
    messages: {
      eixoSolto:
        "'{{classe}}' declara um eixo só. O CSS promove o eixo {{oposto}} de `visible` para `auto` (CSS Overflow 3 §3.1) e nasce uma segunda barra de rolagem — o defeito que o dono já reportou três vezes. Importe {{sugestao}} de '@leela/design-system' (ou de '../../utils/scroll' dentro do DS) e coloque a constante DEPOIS do `className` no cn(). A regra está em packages/design-system/src/utils/scroll.ts.",
      eixoSoltoEmEstilo:
        "`{{prop}}` sozinho num objeto de estilo declara um eixo só. O CSS promove o eixo {{oposto}} de `visible` para `auto` (CSS Overflow 3 §3.1) e nasce uma segunda barra de rolagem. Pior que pela classe: estilo inline vence qualquer utilitário, então a trava do componente não te protege aqui. Declare o par (`overflowX` E `overflowY`) ou, melhor, use {{sugestao}} de '@leela/design-system' em `className`. A regra está em packages/design-system/src/utils/scroll.ts.",
    },
    schema: [],
  },
  create(context) {
    /**
     * @param {import('estree').Node} node
     * @param {string} value
     */
    function check(node, value) {
      const classe = findEixoSolto(value);
      if (classe === null) return;
      const eixo = eixoDe(separar(classe).util) === 'x' ? 'x' : 'y';
      context.report({
        node,
        messageId: 'eixoSolto',
        data: { classe, oposto: OPOSTO[eixo], sugestao: SUGESTAO[eixo] },
      });
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.raw);
      },
      // O eixo solto também entra por objeto de estilo — `style={{ overflowY:
      // 'auto' }}` (REV-SCROLL). Este vetor é o MAIS perigoso dos três: estilo
      // inline ganha de qualquer utilitário, então nem a trava depois do
      // `className` no `cn()` segura. A análise por literal de classe não o via.
      ObjectExpression(node) {
        /** @type {Map<'x' | 'y' | 'ambos', string>} */
        const eixos = new Map();
        for (const prop of node.properties) {
          if (prop.type !== 'Property') continue;
          const nome =
            prop.key.type === 'Identifier' && !prop.computed
              ? prop.key.name
              : prop.key.type === 'Literal' && typeof prop.key.value === 'string'
                ? prop.key.value
                : null;
          if (nome === null) continue;
          const chave = ESTILO_EIXO[nome];
          if (chave !== undefined) eixos.set(chave, nome);
        }
        if (eixos.has('ambos')) return;
        if (eixos.has('x') && eixos.has('y')) return;
        const eixo = eixos.has('x') ? 'x' : eixos.has('y') ? 'y' : null;
        if (eixo === null) return;
        context.report({
          node,
          messageId: 'eixoSoltoEmEstilo',
          data: { prop: eixos.get(eixo), oposto: OPOSTO[eixo], sugestao: SUGESTAO[eixo] },
        });
      },
    };
  },
};

const plugin = {
  meta: { name: 'leela-scroll', version: '1.0.0' },
  rules: {
    'no-scroll-de-um-eixo': noScrollDeUmEixo,
  },
};

export default plugin;
