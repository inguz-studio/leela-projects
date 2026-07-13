// =============================================================================
// Agregação PURA dos tamanhos de camiseta mais pedidos (RN-820, entrega
// pré-preparada). Soma `qtdVendida` por TAMANHO dos SKUs de aprovisionamento de
// todos os eventos do organizador (agregado FABLE-D `agregarEstoque` — ∑ pronto,
// NUNCA varre inscritos no cliente; RN-224). Devolve barras prontas para o DS,
// do mais pedido para o menos, com a ordem de grade (PP..GG) desempatando.
// =============================================================================

import type { Aprovisionamento } from '@leela/core';
import type { BarChartDatum } from '@leela/design-system';

/**
 * Ordem canônica de grade (menor → maior) para DESEMPATE estável quando dois
 * tamanhos têm a mesma quantidade. Tamanhos fora desta lista vão para o fim
 * (ordem alfabética entre si) — nunca somem, só não competem pela grade padrão.
 */
const ORDEM_GRADE: readonly string[] = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XGG', 'EG', 'EGG'];

function ordemDe(tamanho: string): number {
  const i = ORDEM_GRADE.indexOf(tamanho.toUpperCase());
  return i === -1 ? ORDEM_GRADE.length : i;
}

/** Soma `qtdVendida` por tamanho, através de todos os SKUs. @pure */
export function agregarTamanhos(skus: readonly Aprovisionamento[]): Record<string, number> {
  const total: Record<string, number> = {};
  for (const sku of skus) {
    if (sku.qtdVendida > 0) {
      total[sku.tamanho] = (total[sku.tamanho] ?? 0) + sku.qtdVendida;
    }
  }
  return total;
}

/**
 * Tamanhos mais pedidos → barras do DS (mais pedido primeiro; empate resolvido
 * pela ordem de grade PP..GG). Vazio quando não há SKU tamanhado com venda (a
 * tela mostra EmptyState — nem toda corrida tem camiseta no kit). @pure
 */
export function tamanhosMaisPedidos(skus: readonly Aprovisionamento[]): BarChartDatum[] {
  const total = agregarTamanhos(skus);
  return Object.entries(total)
    .map(([label, value]): BarChartDatum => ({ label, value }))
    .sort((a, b) => b.value - a.value || ordemDe(a.label) - ordemDe(b.label));
}
