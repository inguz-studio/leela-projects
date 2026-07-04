// =============================================================================
// Lógica pura da tela de desafios (S105-T2) — filtros combináveis, badges,
// KPIs e agrupamento ativos/encerrados. Sem React/DOM: 100% testável.
// Cor NUNCA é hex — variantes semânticas de Badge (governança de design).
// =============================================================================

import type {
  Desafio,
  ModeloDesafio,
  RecompensaTipo,
  StatusDesafio,
} from '@leela/core';
import type { BadgeProps } from '@leela/design-system';

// ---------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------

const MODELO_MAPA: Record<ModeloDesafio, string> = {
  A: 'Meta por ação',
  B: 'Meta de pontos',
  C: 'Equilíbrio (3 pilares)',
};

/** Rótulo pt-BR do modelo de conclusão (RN-110). */
export function modeloDesafioLabel(modelo: ModeloDesafio): string {
  return MODELO_MAPA[modelo] ?? modelo;
}

export interface StatusBadgeInfo {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

const STATUS_MAPA: Record<StatusDesafio, StatusBadgeInfo> = {
  rascunho: { label: 'Rascunho', variant: 'neutro' },
  ativo: { label: 'Ativo', variant: 'vitoria' },
  encerrado: { label: 'Encerrado', variant: 'alerta' },
};

/** Rótulo + variante semântica para o status do desafio (RN-110). */
export function statusDesafioBadge(status: StatusDesafio): StatusBadgeInfo {
  return STATUS_MAPA[status] ?? STATUS_MAPA.rascunho;
}

const RECOMPENSA_MAPA: Record<RecompensaTipo, string> = {
  medalha_digital: 'Medalha digital',
  cupom: 'Cupom',
  medalha_fisica: 'Medalha física',
  custom: 'Recompensa personalizada',
};

/** Rótulo pt-BR do tipo de recompensa (RN-116). */
export function recompensaLabel(tipo: RecompensaTipo): string {
  return RECOMPENSA_MAPA[tipo] ?? tipo;
}

// ---------------------------------------------------------------------------
// Filtros combináveis
//   - busca: substring do nome (case-insensitive);
//   - status: EXCLUSIVO (um por vez, SPEC §2.5);
//   - modelos: TOGGLES (multi-seleção — desafio passa se seu modelo está no
//     conjunto selecionado, ou se nenhum modelo foi selecionado).
//   Todos os critérios ativos são INTERSEÇÃO.
// ---------------------------------------------------------------------------

export interface FiltrosDesafios {
  busca?: string;
  status?: StatusDesafio | null;
  modelos?: readonly ModeloDesafio[];
}

/** Aplica busca + status (exclusivo) + modelos (toggles) como interseção. */
export function filtrarDesafios(
  desafios: Desafio[],
  filtros: FiltrosDesafios = {},
): Desafio[] {
  const { busca, status, modelos } = filtros;
  const q = busca?.trim().toLowerCase() ?? '';
  const modelosSet = modelos && modelos.length > 0 ? new Set(modelos) : null;
  return desafios.filter((d) => {
    if (status && d.status !== status) return false;
    if (modelosSet && !modelosSet.has(d.modelo)) return false;
    if (q && !d.nome.toLowerCase().includes(q)) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Agrupamento (SPEC §2.5: seção "ativos" + seção "encerrados")
// Rascunho e ativo entram em "em andamento"; encerrado na seção de baixo.
// ---------------------------------------------------------------------------

export interface GruposDesafios {
  emAndamento: Desafio[];
  encerrados: Desafio[];
}

/** Separa a lista já filtrada em "em andamento" (rascunho+ativo) e encerrados. */
export function agruparDesafios(desafios: Desafio[]): GruposDesafios {
  const emAndamento: Desafio[] = [];
  const encerrados: Desafio[] = [];
  for (const d of desafios) {
    if (d.status === 'encerrado') encerrados.push(d);
    else emAndamento.push(d);
  }
  return { emAndamento, encerrados };
}

// ---------------------------------------------------------------------------
// KPIs (4 cards, SPEC §2.5)
// ---------------------------------------------------------------------------

export interface KpisDesafios {
  total: number;
  ativos: number;
  participantes: number;
  /** Progresso médio (0–100) dos desafios ativos; 0 quando não há ativos. */
  progressoMedio: number;
}

/** Agrega os KPIs da lista de desafios (sobre o conjunto completo, não filtrado). */
export function kpisDesafios(desafios: Desafio[]): KpisDesafios {
  let ativos = 0;
  let participantes = 0;
  let somaProgressoAtivos = 0;
  for (const d of desafios) {
    participantes += d.qtdParticipantes;
    if (d.status === 'ativo') {
      ativos += 1;
      somaProgressoAtivos += d.progressoPct;
    }
  }
  return {
    total: desafios.length,
    ativos,
    participantes,
    progressoMedio: ativos > 0 ? Math.round(somaProgressoAtivos / ativos) : 0,
  };
}
