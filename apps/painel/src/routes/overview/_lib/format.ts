// =============================================================================
// Formatação pura da Visão Geral (E02-L2/L3). pt-BR, sem dep de React/DOM.
// Local ao módulo (o módulo de eventos tem seu próprio format — não acoplar).
// =============================================================================

/** Inteiro com separador de milhar pt-BR (1284 → "1.284"; 47 → "47"). */
export function formatInt(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

/** Reais sem casas decimais (142280 → "R$ 142.280"). */
export function formatBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(valor);
}

/**
 * Percentual com 1 casa decimal pt-BR (68.2 → "68,2%").
 * null → "—" (indisponível — nunca inventa número).
 */
export function formatPct(valor: number | null): string {
  if (valor === null) return '—';
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(valor)}%`;
}

/**
 * Variação percentual com sinal (12.5 → "+12,5%"; -3 → "−3,0%").
 * null → "—" (sem base de comparação).
 */
export function formatTrend(valor: number | null): string {
  if (valor === null) return '—';
  const abs = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Math.abs(valor));
  const sinal = valor > 0 ? '+' : valor < 0 ? '−' : '';
  return `${sinal}${abs}%`;
}
