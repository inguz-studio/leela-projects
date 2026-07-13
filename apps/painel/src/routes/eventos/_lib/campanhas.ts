// =============================================================================
// Lógica pura da lista de Campanhas do evento (S401-T2 · E06-L3). Rótulos (com
// os códigos MASCULINOS do dado rotulados no FEMININO na UI — item 9 do brief:
// "Enviada/Agendada" é rótulo, `enviado/agendado` é o dado), agrupamento por
// estado (RN-130), filtros combináveis, KPIs e ações contextuais do popover.
// Sem React/DOM: 100% testável. Cor nunca é hex — sempre token.
//
// Reuso-first: os códigos/enum vêm de `@leela/core` (fonte única compartilhada
// com o clube via `core/comunicacao`); os rótulos de kit/status do segmento
// reusam `kitInscritoLabel`/`statusInscritoBadge` (não redeclaro nomes).
// =============================================================================

import type {
  Campanha,
  CanalCampanha,
  SegmentoCampanha,
  StatusCampanha,
} from '@leela/core';
import type { BadgeProps } from '@leela/design-system';
import { kitInscritoLabel } from './kitLabels';
import { statusInscritoBadge } from './statusInscrito';

// ---------------------------------------------------------------------------
// Rótulos (feminino na UI; o dado permanece masculino — item 9)
// ---------------------------------------------------------------------------

export interface StatusCampanhaBadgeInfo {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
  /** Token da cor da borda esquerda do card (§2.8). */
  borderVar: string;
}

const STATUS_MAPA: Record<StatusCampanha, StatusCampanhaBadgeInfo> = {
  rascunho: { label: 'Rascunho', variant: 'neutro', borderVar: '--border-subtle' },
  agendado: { label: 'Agendada', variant: 'heroico', borderVar: '--feedback-info' },
  enviado: { label: 'Enviada', variant: 'vitoria', borderVar: '--feedback-success' },
};

/** Rótulo + variante + borda para o estado da campanha (RN-130). */
export function statusCampanhaBadge(status: StatusCampanha): StatusCampanhaBadgeInfo {
  return STATUS_MAPA[status] ?? STATUS_MAPA.rascunho;
}

const CANAL_MAPA: Record<CanalCampanha, string> = {
  push: 'Push',
  email: 'E-mail',
};

export function canalCampanhaLabel(canal: CanalCampanha): string {
  return CANAL_MAPA[canal] ?? canal;
}

/**
 * Rótulo humano do segmento embutido na campanha. Reusa os rótulos canônicos
 * do Inscrito (kit RN-202 / status RN-204) — a modalidade é string livre do
 * evento. @pure
 */
export function segmentoCampanhaLabel(segmento: SegmentoCampanha): string {
  switch (segmento.tipo) {
    case 'todos_inscritos':
      return 'Todos os inscritos';
    case 'por_modalidade':
      return segmento.referencia ? `Modalidade ${segmento.referencia}` : 'Por modalidade';
    case 'por_kit':
      return segmento.referencia
        ? kitInscritoLabel(segmento.referencia as never)
        : 'Por kit';
    case 'por_status':
      return segmento.referencia
        ? `Inscritos ${statusInscritoBadge(segmento.referencia as never).label.toLowerCase()}`
        : 'Por status';
    default:
      return 'Segmento';
  }
}

// ---------------------------------------------------------------------------
// Filtros combináveis (busca × canal — interseção)
// ---------------------------------------------------------------------------

export interface FiltrosCampanhas {
  busca?: string;
  /** Canais selecionados (toggle) — campanha passa se intersecta algum. */
  canais?: readonly CanalCampanha[];
}

/** Filtra as campanhas por título (substring) e canal (interseção). @pure */
export function filtrarCampanhas(
  campanhas: Campanha[],
  filtros: FiltrosCampanhas = {},
): Campanha[] {
  const { busca, canais } = filtros;
  const q = busca?.trim().toLowerCase() ?? '';
  const canaisSet = canais && canais.length > 0 ? new Set(canais) : null;
  return campanhas.filter((c) => {
    if (canaisSet && !c.canal.some((canal) => canaisSet.has(canal))) return false;
    if (q && !c.titulo.toLowerCase().includes(q)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Agrupamento por estado (RN-130) — 3 grupos: enviadas, agendadas, rascunhos
// ---------------------------------------------------------------------------

/** Ordem canônica dos grupos da lista (brief L3-T2). */
export const ORDEM_GRUPOS_CAMPANHA: readonly StatusCampanha[] = [
  'enviado',
  'agendado',
  'rascunho',
];

export interface GrupoCampanhas {
  status: StatusCampanha;
  campanhas: Campanha[];
}

/**
 * Agrupa as campanhas por estado na ordem canônica (enviadas → agendadas →
 * rascunhos). Grupos vazios são omitidos. @pure
 */
export function agruparPorEstado(campanhas: Campanha[]): GrupoCampanhas[] {
  return ORDEM_GRUPOS_CAMPANHA.map((status) => ({
    status,
    campanhas: campanhas.filter((c) => c.status === status),
  })).filter((g) => g.campanhas.length > 0);
}

// ---------------------------------------------------------------------------
// KPIs
// ---------------------------------------------------------------------------

export interface KpisCampanhas {
  total: number;
  enviadas: number;
  agendadas: number;
  /** Soma do alcance das campanhas enviadas. */
  alcanceTotal: number;
}

export function kpisCampanhas(campanhas: Campanha[]): KpisCampanhas {
  let enviadas = 0;
  let agendadas = 0;
  let alcanceTotal = 0;
  for (const c of campanhas) {
    if (c.status === 'enviado') {
      enviadas += 1;
      alcanceTotal += c.alcance;
    } else if (c.status === 'agendado') {
      agendadas += 1;
    }
  }
  return { total: campanhas.length, enviadas, agendadas, alcanceTotal };
}

// ---------------------------------------------------------------------------
// Ações contextuais do popover (por estado — RN-130)
// ---------------------------------------------------------------------------

export type AcaoCampanhaId =
  | 'editar'
  | 'duplicar'
  | 'excluir'
  | 'cancelar-agendamento'
  | 'relatorio';

export interface AcaoCampanhaDef {
  id: AcaoCampanhaId;
  label: string;
  destructive?: boolean;
}

/** Ações disponíveis para uma campanha conforme seu estado (RN-130). */
export function acoesCampanha(status: StatusCampanha): AcaoCampanhaDef[] {
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
        { id: 'relatorio', label: 'Ver relatório de envios' },
        { id: 'duplicar', label: 'Duplicar' },
      ];
    default:
      return [];
  }
}
