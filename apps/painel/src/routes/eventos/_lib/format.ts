// =============================================================================
// Formatação pura para as telas de evento (E03-L3).
// pt-BR. Sem dependência de React/DOM — 100% testável.
// =============================================================================

import type { Timestamp } from '@leela/core';

/**
 * Formata um valor em reais (BRL) sem casas decimais.
 * Contrato do mock canônico: receitaConfirmada = 85617 → "R$ 85.617".
 */
export function formatBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor);
}

/** Formata um inteiro com separador de milhar pt-BR (453 → "453"; 1200 → "1.200"). */
export function formatInt(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

/**
 * Data da prova por extenso curto pt-BR (ex.: "27 de abril de 2026").
 * Aceita o `Timestamp` portátil do core (toDate) ou null/undefined.
 */
export function formatDataEvento(data: Timestamp | null | undefined): string {
  if (!data || typeof data.toDate !== 'function') return 'Data a definir';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(data.toDate());
}

/** Dias inteiros entre `agora` e a data da prova (negativo se já passou). */
export function diasParaEvento(
  data: Timestamp | null | undefined,
  agora: Date = new Date(),
): number | null {
  if (!data || typeof data.toDate !== 'function') return null;
  const ms = data.toDate().getTime() - agora.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
