// =============================================================================
// Mapa StatusEvento → apresentação (rótulo + variante de Badge do DS).
// Pura. A cor NUNCA é hex: usa as variantes semânticas do Badge (§2.16).
// =============================================================================

import type { StatusEvento } from '@leela/core';
import type { BadgeProps } from '@leela/design-system';

export interface StatusBadgeInfo {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

const MAPA: Record<StatusEvento, StatusBadgeInfo> = {
  rascunho: { label: 'Rascunho', variant: 'neutro' },
  publicado: { label: 'Publicado', variant: 'heroico' },
  ao_vivo: { label: 'Ao vivo', variant: 'vitoria' },
  encerrado: { label: 'Encerrado', variant: 'neutro' },
};

/** Rótulo + variante semântica para o status de um evento. */
export function statusEventoBadge(status: StatusEvento): StatusBadgeInfo {
  return MAPA[status] ?? MAPA.rascunho;
}
