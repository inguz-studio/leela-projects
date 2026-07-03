// @ts-check
/**
 * eslint-plugin leela-tokens — lint de tokens do design system (LEELA-S001-4-T2).
 *
 * Barra valores visuais hardcoded em componentes e telas:
 *   - cores hex (#FF450C, #fff, #ffffff80)
 *   - funções de cor (rgb/rgba/hsl/hsla/oklch/lab/lch)
 *   - px/rem/em crus em arbitrary values do Tailwind (h-[64px], p-[1.5rem])
 *
 * Regra de ouro: componente referencia token semântico (`var(--...)`),
 * nunca primitivo nem valor cru. Segmentos `[...]` que contêm `var(--`
 * são permitidos: `h-[var(--table-row-height)]`, `max-w-[calc(100vw-var(--spacing-8))]`.
 *
 * Fontes legítimas de valores crus (geradores de token, preset Tailwind,
 * arquivos de tema) ficam fora do escopo via `files`/`ignores` no
 * eslint.config.mjs da raiz — não desabilite a regra inline em tela.
 */

const HEX_COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/;
const COLOR_FN = /\b(?:rgba?|hsla?|oklch|lab|lch)\(/;
const ARBITRARY_SEGMENT = /\[([^[\]]+)\]/g;
const RAW_UNIT = /\d(?:\.\d+)?(?:px|rem|em)\b/;

/**
 * @param {string} value
 * @returns {string | null} trecho ofensor ou null
 */
function findViolation(value) {
  const hex = value.match(HEX_COLOR);
  if (hex) return hex[0];

  const colorFn = value.match(COLOR_FN);
  if (colorFn) return colorFn[0].trim();

  // px/rem/em crus só ofendem dentro de arbitrary values sem var(--
  for (const segment of value.matchAll(ARBITRARY_SEGMENT)) {
    const inner = segment[1] ?? '';
    if (inner.includes('var(--')) continue;
    if (RAW_UNIT.test(inner)) return `[${inner}]`;
  }
  return null;
}

/** @type {import('eslint').Rule.RuleModule} */
const noHardcodedTokens = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Proíbe cor/spacing/radius hardcoded (hex, rgb/hsl, px/rem/em em arbitrary values) fora dos tokens do design system',
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
  meta: { name: 'leela-tokens', version: '1.0.0' },
  rules: {
    'no-hardcoded-tokens': noHardcodedTokens,
  },
};

export default plugin;
