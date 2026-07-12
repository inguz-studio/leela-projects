// =============================================================================
// Rótulo + variante de Badge para o status do inscrito (RN-204). Pura.
// =============================================================================

import type { StatusInscrito } from '@leela/core';
import type { BadgeProps } from '@leela/design-system';

export interface StatusInscritoBadge {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

const MAPA: Record<StatusInscrito, StatusInscritoBadge> = {
  confirmado: { label: 'Confirmado', variant: 'vitoria' },
  pendente: { label: 'Pendente', variant: 'alerta' },
  cancelado: { label: 'Cancelado', variant: 'vulcao' },
  // RN-341/FABLE-B: inscrição paga com valor devolvido (neutro, como o
  // pagamento estornado no slide-in [pag])
  estornado: { label: 'Estornado', variant: 'neutro' },
};

/** Rótulo + variante semântica do status do inscrito (RN-204). */
export function statusInscritoBadge(status: StatusInscrito): StatusInscritoBadge {
  return MAPA[status] ?? MAPA.pendente;
}
