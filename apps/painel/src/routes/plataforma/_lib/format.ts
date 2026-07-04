// =============================================================================
// Formatação pura para as telas de plataforma (super-admin). pt-BR.
// Sem dependência de React/DOM — 100% testável.
// =============================================================================

import type { Timestamp } from '@leela/core';

/** Valor em reais (BRL) sem casas decimais: 85617 → "R$ 85.617". */
export function formatBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor);
}

/** Inteiro com separador de milhar pt-BR: 1200 → "1.200". */
export function formatInt(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

/**
 * Percentual da taxa: 10.5 → "10,5%"; null → "—" (tenant sem termos).
 * Aceita `null` porque o rollup traz platformFeePct null quando o tenant
 * ainda não foi provisionado (RN-406).
 */
export function formatPct(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return '—';
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(valor)}%`;
}

/** Data/hora curta pt-BR do `Timestamp` portátil do core (ou "—"). */
export function formatDataHora(data: Timestamp | null | undefined): string {
  if (!data || typeof data.toDate !== 'function') return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(data.toDate());
}
