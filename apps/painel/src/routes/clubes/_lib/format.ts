// =============================================================================
// Formatação pura para as telas de clube (E05-L3). pt-BR, sem React/DOM.
// =============================================================================

import type { Timestamp } from '@leela/core';

/** Inteiro com separador de milhar pt-BR (120 → "120"; 1200 → "1.200"). */
export function formatInt(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

/**
 * Decimal com 1 casa SEMPRE visível, pt-BR (37.2 → "37,2"; 150 → "150,0").
 * Usado onde o número é uma MÉDIA — a casa fixa é o que impede a tela de
 * parecer contagem inteira por cima de um valor derivado (REDESIGN-DS · D-1).
 */
export function formatDecimal1(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(valor);
}

/**
 * Iniciais para avatar (máx. 3). "Corrida Perfeita Sul" → "CPS";
 * "Wiser Trilhas" → "WT"; "Runners" → "RU".
 */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) {
    return partes[0]!.slice(0, 2).toUpperCase();
  }
  return partes
    .slice(0, 3)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

/** Ano de um Timestamp portátil (para "desde 2022"). Null se ausente. */
export function anoDe(ts: Timestamp | null | undefined): number | null {
  if (!ts || typeof ts.toDate !== 'function') return null;
  return ts.toDate().getFullYear();
}

/** Mês/ano curto pt-BR de entrada (ex.: "jan 2022"). */
export function formatMesAno(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') return '—';
  return new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' })
    .format(ts.toDate())
    .replace('.', '');
}

/**
 * Tempo decorrido humano curto pt-BR a partir de um Timestamp, relativo a
 * `agora`. Usado em "Entrou em" / "Último registro" da tabela densa.
 *   < 1 dia → "hoje"; 1 dia → "ontem"; < 7 dias → "há N dias"; senão mês/ano.
 */
export function tempoRelativo(
  ts: Timestamp | null | undefined,
  agora: Date = new Date(),
): string {
  if (!ts || typeof ts.toDate !== 'function') return '—';
  const dias = Math.floor((agora.getTime() - ts.toDate().getTime()) / 86_400_000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 7) return `há ${dias} dias`;
  return formatMesAno(ts);
}
