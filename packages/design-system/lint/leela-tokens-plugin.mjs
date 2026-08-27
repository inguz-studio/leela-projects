// @ts-check
/**
 * eslint-plugin leela-tokens — lint de tokens do design system (LEELA-S001-4-T2).
 *
 * Barra valores visuais hardcoded em componentes e telas:
 *   - cores hex (#FF450C, #fff, #ffffff80)
 *   - funções de cor (rgb/rgba/hsl/hsla/oklch/oklab/lab/lch/hwb/color-mix/color)
 *   - classes da paleta default do Tailwind (text-white, bg-black, bg-red-500…)
 *     — bypass de token sem hex nenhum
 *   - cores nomeadas em arbitrary values (bg-[white])
 *   - px/rem/em/pt crus em arbitrary values do Tailwind (h-[64px], p-[1.5rem]),
 *     inclusive DENTRO de calc() misturado com var(): w-[calc(100px+var(--x))]
 *     ofende — só os trechos var(--…) são descontados, não o segmento inteiro.
 *
 * Regra de ouro: componente referencia token semântico (`var(--...)`),
 * nunca primitivo nem valor cru. Segmentos `[...]` cujo conteúdo (removidas
 * as chamadas var(--…)) não sobra valor cru são permitidos:
 * `h-[var(--table-row-height)]`, `max-w-[calc(100vw-var(--spacing-8))]`.
 *
 * Fontes legítimas de valores crus (geradores de token, preset Tailwind,
 * arquivos de tema) ficam fora do escopo via `files`/`ignores` no
 * eslint.config.mjs da raiz — não desabilite a regra inline em tela.
 */

const HEX_COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/;
const COLOR_FN = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb|color-mix|color)\(/;
const ARBITRARY_SEGMENT = /\[([^[\]]+)\]/g;
const RAW_UNIT = /\d(?:\.\d+)?(?:px|rem|em|pt)\b/;

// Furo #2: utilitários de cor da paleta default do Tailwind — cor hardcoded
// sem hex (text-white, bg-black, border-red-500, from-slate-900…).
const TW_PALETTE_UTILITY =
  /\b(?:bg|text|border|ring|ring-offset|divide|outline|decoration|fill|stroke|from|via|to|accent|caret|shadow)-(?:white|black|(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))(?![\w-])/;

// Furo #3 (parte b): cores nomeadas CSS dentro de arbitrary values (bg-[white])
const NAMED_COLOR =
  /\b(?:white|black|red|blue|green|yellow|orange|purple|pink|gray|grey|silver|gold|navy|teal|maroon|olive|aqua|fuchsia|lime|rebeccapurple)\b/;

/**
 * Remove todas as chamadas var(--…) de um trecho, para inspecionar o que
 * sobra de valor cru (fecha o furo #1: calc() com var() + px cru passava).
 * @param {string} value
 * @returns {string}
 */
function stripVarCalls(value) {
  let previous;
  let current = value;
  do {
    previous = current;
    current = current.replace(/var\(--[^()]*\)/g, '');
  } while (current !== previous);
  return current;
}

/**
 * @param {string} value
 * @returns {string | null} trecho ofensor ou null
 */
export function findViolation(value) {
  const hex = value.match(HEX_COLOR);
  if (hex) return hex[0];

  const colorFn = value.match(COLOR_FN);
  if (colorFn) return colorFn[0].trim();

  const palette = value.match(TW_PALETTE_UTILITY);
  if (palette) return palette[0];

  // Arbitrary values: desconta apenas os var(--…) e inspeciona o resto —
  // um segmento com var() ainda ofende se sobrar px/rem/em/pt ou cor nomeada.
  //
  // FURO V2708-16(b): Tailwind converte `_` em espaço nos arbitrary values antes
  // de gerar o CSS — `shadow-[0_-6px_24px_-8px_rgba(0,0,0,0.5)]` é equivalente a
  // `shadow-[0 -6px 24px -8px rgba(0,0,0,0.5)]`. Os regex RAW_UNIT e COLOR_FN
  // usam \b (word boundary) que não transpõe `_` (também é \w). Solução:
  // normalizar `_` → espaço em `bare` antes das verificações e também testar
  // COLOR_FN dentro do segmento (a verificação global falhava por \b pós-`_`).
  for (const segment of value.matchAll(ARBITRARY_SEGMENT)) {
    const inner = segment[1] ?? '';
    // Normaliza underscore → espaço para que \b funcione corretamente.
    const bare = stripVarCalls(inner).replace(/_/g, ' ');
    if (RAW_UNIT.test(bare)) return `[${inner}]`;
    if (NAMED_COLOR.test(bare)) return `[${inner}]`;
    // COLOR_FN global (linhas acima) falha quando `_rgba(` não tem \b entre
    // `_` e `r`; verificamos aqui sobre o `bare` normalizado.
    if (COLOR_FN.test(bare)) return `[${inner}]`;
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
const noHardcodedTokens = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Proíbe cor/spacing/radius hardcoded (hex, rgb/hsl, paleta Tailwind, px/rem/em em arbitrary values) fora dos tokens do design system',
    },
    messages: {
      hardcoded:
        "Valor hardcoded '{{snippet}}' — use token semântico do design system (var(--...)). Ver leela-specs/governanca-design.md.",
    },
    schema: [],
  },
  create(context) {
    /**
     * @param {import('estree').Node} node
     * @param {string} value
     */
    function check(node, value) {
      const snippet = findViolation(value);
      if (snippet) {
        context.report({ node, messageId: 'hardcoded', data: { snippet } });
      }
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
  meta: { name: 'leela-tokens', version: '1.1.0' },
  rules: {
    'no-hardcoded-tokens': noHardcodedTokens,
  },
};

export default plugin;
