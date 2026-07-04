// =============================================================================
// Rótulos e variantes de Badge para o `kit` do inscrito (RN-202/216).
// Nomenclatura SEMPRE "Kit …" — nunca "tier" (RN-216). Pura e testável.
// =============================================================================

import type { KitInscrito } from '@leela/core';
import type { BadgeProps } from '@leela/design-system';

export interface KitBadgeInfo {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

/** Rótulo canônico do kit — "Kit" explícito, nunca "tier" (RN-216). */
const MAPA: Record<KitInscrito, KitBadgeInfo> = {
  kit_ouro: { label: 'Kit Ouro', variant: 'alerta' },
  kit_prata: { label: 'Kit Prata', variant: 'neutro' },
  kit_basico: { label: 'Kit Básico', variant: 'heroico' },
  sem_kit: { label: 'Sem kit', variant: 'neutro' },
};

/** Rótulo + variante semântica do kit do inscrito (RN-202/216). */
export function kitInscritoBadge(kit: KitInscrito): KitBadgeInfo {
  return MAPA[kit] ?? MAPA.sem_kit;
}

/** Só o rótulo textual do kit (para células/CSV). */
export function kitInscritoLabel(kit: KitInscrito): string {
  return kitInscritoBadge(kit).label;
}
