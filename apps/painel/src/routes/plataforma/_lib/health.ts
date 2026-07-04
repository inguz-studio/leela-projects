// =============================================================================
// Mapeamento puro status/saúde do tenant → Badge do design system (§2.5).
// Sem dependência de React/DOM — 100% testável.
//
// Semântica de cor (nunca misturar — DS §Badge):
//   vitoria (verde)  = ok/ativo/saudável
//   alerta  (âmbar)  = atenção/pendente
//   vulcao  (vermelho) = crítico/suspenso
// =============================================================================

import type { TenantStatus, TenantHealth } from '@leela/core';

/** Variante de Badge do DS (subset semântico usado nas telas de plataforma). */
export type BadgeVariant = 'vitoria' | 'alerta' | 'vulcao' | 'neutro';

export interface BadgeSpec {
  label: string;
  variant: BadgeVariant;
}

/** Rótulo + variante para o ciclo de vida do tenant (RN-402). */
export function statusTenantBadge(status: TenantStatus): BadgeSpec {
  switch (status) {
    case 'ativo':
      return { label: 'Ativo', variant: 'vitoria' };
    case 'pending':
      return { label: 'Aguardando', variant: 'alerta' };
    case 'suspenso':
      return { label: 'Suspenso', variant: 'vulcao' };
    default:
      return { label: status, variant: 'neutro' };
  }
}

/** Rótulo + variante para a saúde operacional do tenant (heurística V1). */
export function healthTenantBadge(health: TenantHealth): BadgeSpec {
  switch (health) {
    case 'saudavel':
      return { label: 'Saudável', variant: 'vitoria' };
    case 'atencao':
      return { label: 'Atenção', variant: 'alerta' };
    case 'critico':
      return { label: 'Crítico', variant: 'vulcao' };
    default:
      return { label: health, variant: 'neutro' };
  }
}

/** Um tenant suspenso é crítico — dispara o card border-left Vulcão (§2.15). */
export function isTenantCritico(status: TenantStatus): boolean {
  return status === 'suspenso';
}
