// =============================================================================
// Formatação pura das telas de repasse (pt-BR). Sem React/DOM — 100% testável.
//
// DINHEIRO com CENTAVOS: os valores de repasse são cent-exatos (R$ 8.500,00) —
// distinto do `formatBRL` da plataforma, que arredonda para inteiro nos KPIs.
// =============================================================================

import type { Timestamp } from '@leela/core';

/** Valor em reais (BRL) com 2 casas: 8500 → "R$ 8.500,00". @pure */
export function formatBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/** Data curta pt-BR do Timestamp portátil do core (ou "—"). @pure */
export function formatData(data: Timestamp | null | undefined): string {
  if (!data || typeof data.toDate !== 'function') return '—';
  const d = data.toDate();
  if (d.getTime() === 0) return '—'; // sentinela de data ilegível — nunca finge
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

/** Data + hora curta pt-BR do Timestamp portátil do core (ou "—"). @pure */
export function formatDataHora(data: Timestamp | null | undefined): string {
  if (!data || typeof data.toDate !== 'function') return '—';
  const d = data.toDate();
  if (d.getTime() === 0) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
