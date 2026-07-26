// =============================================================================
// Mapeamento PURO do estado do repasse → badge (variante + rótulo) e apoio ao
// comprovante (E09s-L3-T4). Sem React/DOM.
//
// Cores por estado (aceite T4): solicitado/aprovado = `alerta` (em andamento),
// pago = `vitoria`, recusado = `vulcao`, cancelado = `neutro` (encerrado pelo
// próprio owner). A cor segue a SEMÂNTICA do estado, não o rank.
// =============================================================================

import type { EstadoRepasse, Repasse, Timestamp } from '@leela/core';

/** Variantes de Badge usadas pelo histórico (subconjunto do DS). */
export type EstadoBadgeVariant = 'alerta' | 'vitoria' | 'vulcao' | 'neutro';

export interface EstadoBadge {
  variant: EstadoBadgeVariant;
  label: string;
}

const MAPA: Record<EstadoRepasse, EstadoBadge> = {
  solicitado: { variant: 'alerta', label: 'Solicitado' },
  aprovado: { variant: 'alerta', label: 'Aprovado' },
  pago: { variant: 'vitoria', label: 'Pago' },
  recusado: { variant: 'vulcao', label: 'Recusado' },
  cancelado: { variant: 'neutro', label: 'Cancelado' },
};

/** Badge (variante + rótulo pt-BR) do estado do repasse. @pure */
export function badgeEstado(estado: EstadoRepasse): EstadoBadge {
  return MAPA[estado];
}

/**
 * Instante em que o repasse foi PAGO — última transição para `pago`
 * (fallback `atualizadoEm`). `null` quando o repasse não está pago. @pure
 */
export function pagoEm(repasse: Repasse): Timestamp | null {
  if (repasse.estado !== 'pago') return null;
  for (let i = repasse.transicoes.length - 1; i >= 0; i -= 1) {
    const t = repasse.transicoes[i];
    if (t && t.para === 'pago') return t.em;
  }
  return repasse.atualizadoEm;
}
