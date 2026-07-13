// =============================================================================
// Agregação PURA das modalidades com mais inscritos (RN-820, análise de vendas).
// Soma `inscritos.porModalidade` de `financeiro/current` de TODOS os eventos do
// organizador (agregado ∑ que a Function já mantém — NUNCA varre inscritos no
// cliente) e devolve as barras prontas para o BarChart do DS, do maior para o
// menor. A cor segue a ordem (rank) — categórica em ordem fixa (dataviz §cor).
// =============================================================================

import type { BarChartDatum } from '@leela/design-system';
import type { EventoFinanceiroRow } from '../../../../lib/query/queries';

/** Soma as inscrições por modalidade de todos os eventos (agregado ∑). @pure */
export function agregarModalidades(rows: readonly EventoFinanceiroRow[]): Record<string, number> {
  const total: Record<string, number> = {};
  for (const { financeiro } of rows) {
    if (financeiro === null) continue;
    for (const [modalidade, qtd] of Object.entries(financeiro.inscritos.porModalidade)) {
      if (qtd > 0) total[modalidade] = (total[modalidade] ?? 0) + qtd;
    }
  }
  return total;
}

/**
 * Modalidades com mais inscritos → barras do DS (maior primeiro). `limite` corta
 * a cauda longa (default 8 — a paleta categórica do DS tem 8 slots). Vazio
 * quando nenhum evento tem inscrição por modalidade (a tela mostra EmptyState).
 * @pure
 */
export function modalidadesMaisInscritos(
  rows: readonly EventoFinanceiroRow[],
  limite = 8,
): BarChartDatum[] {
  const total = agregarModalidades(rows);
  return Object.entries(total)
    .map(([label, value]): BarChartDatum => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limite);
}
