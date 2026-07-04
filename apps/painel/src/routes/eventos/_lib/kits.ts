// =============================================================================
// Derivações puras das telas de kits (S205/S206). Nomenclatura SEMPRE "kit",
// nunca "tier" (RN-216). Sem I/O — testável.
// =============================================================================

import type { ItemKit, Kit } from '@leela/core';
import type { BadgeProps } from '@leela/design-system';
import { formatBRL } from './format';

export interface BadgeInfo {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

/**
 * Formata o preço do kit (delta sobre a inscrição). Negativo = desconto do
 * "Sem kit" (RN-211); zero = sem custo adicional.
 */
export function formatPrecoKit(preco: number): string {
  if (preco < 0) return `Desconto de ${formatBRL(Math.abs(preco))}`;
  if (preco === 0) return 'Sem custo adicional';
  return formatBRL(preco);
}

/** Badge de tipo do item (RN-212): tamanhado (camiseta) x único. */
export function itemTipoBadge(tamanhado: boolean): BadgeInfo {
  return tamanhado
    ? { label: 'Tamanhado', variant: 'heroico' }
    : { label: 'Único', variant: 'neutro' };
}

/** Badge de origem do item (RN-213): organizador x patrocinador. */
export function itemOrigemBadge(origem: ItemKit['origem']): BadgeInfo {
  return origem === 'patrocinador'
    ? { label: 'Patrocinador', variant: 'brand' }
    : { label: 'Organizador', variant: 'neutro' };
}

/** Texto "Usado em: [kits]" (RN-215). Vazio → "Ainda não usado". */
export function usadoEmTexto(item: Pick<ItemKit, 'usadoEm'>): string {
  const nomes = (item.usadoEm ?? []).map((u) => u.nome);
  return nomes.length > 0 ? `Usado em: ${nomes.join(', ')}` : 'Ainda não usado em nenhum kit';
}

/** Resumo do rodapé — apenas contagens reais (sem custo fabricado). */
export interface ResumoKits {
  kits: number;
  itens: number;
  /** Marcas patrocinadoras distintas com logo ativado (RN-214). */
  marcasAtivadas: number;
}

/** Deriva o resumo do rodapé a partir dos kits + catálogo. @pure */
export function resumoKits(kits: readonly Kit[], itens: readonly ItemKit[]): ResumoKits {
  const marcas = new Set<string>();
  for (const item of itens) {
    if (item.origem === 'patrocinador' && item.exibirLogo && item.marca) {
      marcas.add(item.marca);
    }
  }
  return { kits: kits.length, itens: itens.length, marcasAtivadas: marcas.size };
}
