// =============================================================================
// Lógica pura da tela de comunicados (S108-T2) — filtros por 3 grupos (status ×
// canal × origem = interseção), rótulos, cor de borda por status, KPIs e ações
// contextuais do popover. Sem React/DOM: 100% testável. Cor nunca é hex.
// =============================================================================

import type {
  CanalComunicado,
  Comunicado,
  OrigemComunicado,
  StatusComunicado,
} from '@leela/core';
import type { BadgeProps } from '@leela/design-system';

// ---------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------

export interface StatusBadgeInfo {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
  /** Token de cor da borda esquerda do card (SPEC §2.8). */
  borderVar: string;
}

const STATUS_MAPA: Record<StatusComunicado, StatusBadgeInfo> = {
  rascunho: { label: 'Rascunho', variant: 'neutro', borderVar: '--border-subtle' },
  agendado: { label: 'Agendado', variant: 'heroico', borderVar: '--feedback-info' },
  enviado: { label: 'Enviado', variant: 'vitoria', borderVar: '--feedback-success' },
};

export function statusComunicadoBadge(status: StatusComunicado): StatusBadgeInfo {
  return STATUS_MAPA[status] ?? STATUS_MAPA.rascunho;
}

const CANAL_MAPA: Record<CanalComunicado, string> = {
  push: 'Push',
  email: 'Email',
};

export function canalLabel(canal: CanalComunicado): string {
  return CANAL_MAPA[canal] ?? canal;
}

const ORIGEM_MAPA: Record<OrigemComunicado, string> = {
  manual: 'Manual',
  automatizada: 'Automatizada',
};

export function origemLabel(origem: OrigemComunicado): string {
  return ORIGEM_MAPA[origem] ?? origem;
}

// ---------------------------------------------------------------------------
// Filtros combináveis (3 grupos — interseção)
// ---------------------------------------------------------------------------

export interface FiltrosComunicados {
  busca?: string;
  status?: StatusComunicado | null;
  /** Canais selecionados (toggle) — comunicado passa se intersecta. */
  canais?: readonly CanalComunicado[];
  origem?: OrigemComunicado | null;
}

export function filtrarComunicados(
  comunicados: Comunicado[],
  filtros: FiltrosComunicados = {},
): Comunicado[] {
  const { busca, status, canais, origem } = filtros;
  const q = busca?.trim().toLowerCase() ?? '';
  const canaisSet = canais && canais.length > 0 ? new Set(canais) : null;
  return comunicados.filter((c) => {
    if (status && c.status !== status) return false;
    if (origem && c.origem !== origem) return false;
    if (canaisSet && !c.canal.some((canal) => canaisSet.has(canal))) return false;
    if (q && !c.titulo.toLowerCase().includes(q)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// KPIs (4 cards, SPEC §2.8)
// ---------------------------------------------------------------------------

export interface KpisComunicados {
  total: number;
  enviados: number;
  agendados: number;
  /** Soma do alcance dos comunicados enviados. */
  alcanceTotal: number;
}

export function kpisComunicados(comunicados: Comunicado[]): KpisComunicados {
  let enviados = 0;
  let agendados = 0;
  let alcanceTotal = 0;
  for (const c of comunicados) {
    if (c.status === 'enviado') {
      enviados += 1;
      alcanceTotal += c.alcance;
    } else if (c.status === 'agendado') {
      agendados += 1;
    }
  }
  return { total: comunicados.length, enviados, agendados, alcanceTotal };
}

// ---------------------------------------------------------------------------
// Ações contextuais do popover (por status — SPEC §2.8)
// ---------------------------------------------------------------------------

export type AcaoComunicadoId =
  | 'editar'
  | 'excluir'
  | 'cancelar-agendamento'
  | 'relatorio'
  | 'duplicar';

export interface AcaoComunicadoDef {
  id: AcaoComunicadoId;
  label: string;
  destructive?: boolean;
}

/** Ações disponíveis para um comunicado conforme seu status (RN-130). */
export function acoesComunicado(status: StatusComunicado): AcaoComunicadoDef[] {
  switch (status) {
    case 'rascunho':
      return [
        { id: 'editar', label: 'Editar' },
        { id: 'duplicar', label: 'Duplicar' },
        { id: 'excluir', label: 'Excluir', destructive: true },
      ];
    case 'agendado':
      return [
        { id: 'editar', label: 'Editar' },
        { id: 'cancelar-agendamento', label: 'Cancelar agendamento' },
        { id: 'excluir', label: 'Excluir', destructive: true },
      ];
    case 'enviado':
      return [
        { id: 'relatorio', label: 'Ver relatório' },
        { id: 'duplicar', label: 'Duplicar' },
      ];
    default:
      return [];
  }
}
