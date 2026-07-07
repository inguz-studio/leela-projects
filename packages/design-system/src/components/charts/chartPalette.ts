// =============================================================================
// Paleta categórica dos gráficos do DS — fonte única (skill dataviz).
//
// Regra dataviz (não-negociável): cores categóricas em ORDEM FIXA, nunca
// cicladas por rank. A cor segue a ENTIDADE (índice estável), não a posição no
// ranking. A 6ª série+ não gera cor nova: cai em "Outros" (cat-5). As 5 famílias
// saem de token semântico (`--chart-cat-1..5`), tematizadas brasa/leela e
// validadas (validate_palette.js: CVD ΔE > 12, contraste ≥3:1 nos 2 temas).
// =============================================================================

/** Nº de famílias categóricas distintas antes de dobrar em "Outros". */
export const CHART_CATEGORY_COUNT = 5;

/**
 * Variável CSS da i-ésima família categórica (0-based). Índices ≥ 5 dobram na
 * última família (cat-5 = "Outros") — nunca uma cor gerada. @pure
 */
export function chartCategoryVar(index: number): string {
  const clamped = index < 0 ? 0 : Math.min(index, CHART_CATEGORY_COUNT - 1);
  return `var(--chart-cat-${clamped + 1})`;
}

/** Formatador padrão de valor (inteiro pt-BR). @pure */
export function formatChartInt(value: number): string {
  return new Intl.NumberFormat('pt-BR').format(value);
}

/** Percentual inteiro de `value` sobre `total` (0 quando total ≤ 0). @pure */
export function pctOf(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}
