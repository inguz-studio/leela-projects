// =============================================================================
// Lógica pura da tela de parcerias (S107-T2) — agrupamento em 3 blocos
// (convites pendentes · eventos promovidos · patrocinadores), rótulos e
// formatação. Sem React/DOM: 100% testável. Cor nunca é hex — variantes Badge.
// =============================================================================

import type {
  ModeloComercial,
  Parceria,
  ParceriaEventoAfiliado,
  ParceriaPatrocinador,
  StatusParceria,
} from '@leela/core';
import { isParceriaEventoAfiliado, isParceriaPatrocinador } from '@leela/core';
import type { BadgeProps } from '@leela/design-system';

// ---------------------------------------------------------------------------
// Agrupamento nos 3 blocos da SPEC §2.7
// ---------------------------------------------------------------------------

export interface BlocosParcerias {
  /** Convites de afiliação a aceitar/recusar (evento_afiliado pendente). */
  convitesPendentes: ParceriaEventoAfiliado[];
  /** Eventos já promovidos pelo clube (evento_afiliado ativo). */
  eventosPromovidos: ParceriaEventoAfiliado[];
  /** Patrocinadores institucionais ativos (inativos somem — SPEC §2.7). */
  patrocinadores: ParceriaPatrocinador[];
}

export function separarParcerias(parcerias: Parceria[]): BlocosParcerias {
  const convitesPendentes: ParceriaEventoAfiliado[] = [];
  const eventosPromovidos: ParceriaEventoAfiliado[] = [];
  const patrocinadores: ParceriaPatrocinador[] = [];
  for (const p of parcerias) {
    if (isParceriaEventoAfiliado(p)) {
      if (p.status === 'convite_pendente') convitesPendentes.push(p);
      else if (p.status === 'ativa') eventosPromovidos.push(p);
    } else if (isParceriaPatrocinador(p) && p.status !== 'inativa') {
      patrocinadores.push(p);
    }
  }
  return { convitesPendentes, eventosPromovidos, patrocinadores };
}

// ---------------------------------------------------------------------------
// Rótulos
// ---------------------------------------------------------------------------

export interface StatusBadgeInfo {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

const STATUS_MAPA: Record<StatusParceria, StatusBadgeInfo> = {
  convite_pendente: { label: 'Convite pendente', variant: 'heroico' },
  ativa: { label: 'Ativa', variant: 'vitoria' },
  inativa: { label: 'Inativa', variant: 'neutro' },
};

export function statusParceriaBadge(status: StatusParceria): StatusBadgeInfo {
  return STATUS_MAPA[status] ?? STATUS_MAPA.inativa;
}

const MODELO_MAPA: Record<ModeloComercial, string> = {
  financeiro: 'Financeiro',
  permuta: 'Permuta',
};

export function modeloComercialLabel(modelo: ModeloComercial): string {
  return MODELO_MAPA[modelo] ?? modelo;
}

// ---------------------------------------------------------------------------
// Formatação de moeda (R$) — pt-BR
// ---------------------------------------------------------------------------

/** Formata reais em pt-BR (1234.5 → "R$ 1.234,50"). */
export function formatBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}
