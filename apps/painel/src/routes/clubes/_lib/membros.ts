// =============================================================================
// Lógica pura da tela de membros (S103-T2) — filtros combináveis, badges e
// KPIs. Sem React/DOM: 100% testável. A cor NUNCA é hex — variantes de Badge.
// =============================================================================

import type { Membro, PapelMembro, StatusMembro } from '@leela/core';
import type { BadgeProps } from '@leela/design-system';

export interface StatusBadgeInfo {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

const STATUS_MAPA: Record<StatusMembro, StatusBadgeInfo> = {
  ativo: { label: 'Ativo', variant: 'vitoria' },
  novo: { label: 'Novo', variant: 'heroico' },
  inativo: { label: 'Inativo', variant: 'alerta' },
};

/** Rótulo + variante semântica para o status derivado do membro (RN-102). */
export function statusMembroBadge(status: StatusMembro): StatusBadgeInfo {
  return STATUS_MAPA[status] ?? STATUS_MAPA.ativo;
}

const PAPEL_MAPA: Record<PapelMembro, string> = {
  owner: 'Owner',
  admin: 'Admin',
  membro: 'Membro',
};

/** Rótulo pt-BR do papel do membro (RN-103). */
export function papelMembroLabel(papel: PapelMembro): string {
  return PAPEL_MAPA[papel] ?? papel;
}

// ---------------------------------------------------------------------------
// Filtros combináveis (interseção — nunca união)
// ---------------------------------------------------------------------------

export interface FiltrosMembros {
  /** Filtro por status derivado (RN-102). Combinável com papel. */
  status?: StatusMembro | null;
  /** Filtro por papel no clube (RN-103). Combinável com status. */
  papel?: PapelMembro | null;
  /** Busca textual por nome (case-insensitive, sem acento-fold). */
  busca?: string;
}

/**
 * Aplica busca + status + papel como INTERSEÇÃO (todos os critérios ativos
 * precisam casar). Filtro vazio ⇒ retorna tudo. A busca casa por substring do
 * nome do atleta (case-insensitive). Pura — a tela chama e conta o resultado.
 */
export function filtrarMembros(
  membros: Membro[],
  filtros: FiltrosMembros = {},
): Membro[] {
  const { status, papel, busca } = filtros;
  const q = busca?.trim().toLowerCase() ?? '';
  return membros.filter((m) => {
    if (status && m.status !== status) return false;
    if (papel && m.papel !== papel) return false;
    if (q && !m.atletaNome.toLowerCase().includes(q)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// KPIs de membros (bloco de indicadores da tela)
// ---------------------------------------------------------------------------

export interface KpisMembros {
  total: number;
  ativos: number;
  novos: number;
  inativos: number;
  admins: number;
}

/** Agrega os KPIs da lista de membros a partir do status derivado. */
export function kpisMembros(membros: Membro[]): KpisMembros {
  const kpis: KpisMembros = { total: membros.length, ativos: 0, novos: 0, inativos: 0, admins: 0 };
  for (const m of membros) {
    if (m.status === 'ativo') kpis.ativos += 1;
    else if (m.status === 'novo') kpis.novos += 1;
    else if (m.status === 'inativo') kpis.inativos += 1;
    if (m.papel === 'admin' || m.papel === 'owner') kpis.admins += 1;
  }
  return kpis;
}
