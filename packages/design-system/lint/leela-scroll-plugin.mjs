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
 * Separa o prefixo de modificador do utilitário. O corte é o ÚLTIMO `:`, que é
 * o que o Tailwind usa: `max-lg:overflow-x-auto` → (`max-lg:`, `overflow-x-auto`);
 * `overflow-y-hidden` → (``, `overflow-y-hidden`).
 * @param {string} token
 * @returns {{ prefixo: string, util: string }}
 */
function separar(token) {
  const corte = token.lastIndexOf(':');
  return corte === -1
    ? { prefixo: '', util: token }
    : { prefixo: token.slice(0, corte + 1), util: token.slice(corte + 1) };
}

/**
 * Devolve a classe ofensora (um eixo declarado sem o par) ou null.
 * @param {string} value
 * @returns {string | null}
 */
export function findEixoSolto(value) {
  if (!value.includes('overflow-')) return null;

  /** @type {Map<string, Map<string, string>>} prefixo → (eixo → classe) */
  const porPrefixo = new Map();

  for (const token of value.split(/\s+/)) {
    if (token.length === 0) continue;
    const { prefixo, util } = separar(token);
    if (!util.startsWith('overflow-')) continue;

    const resto = util.slice('overflow-'.length);
    const eixo = resto.startsWith('x-') ? 'x' : resto.startsWith('y-') ? 'y' : 'ambos';

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
      const eixo = separar(classe).util.startsWith('overflow-x-') ? 'x' : 'y';
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
