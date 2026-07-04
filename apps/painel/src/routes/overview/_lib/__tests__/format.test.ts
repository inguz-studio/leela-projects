import { describe, expect, it } from 'vitest';
import { formatBRL, formatInt, formatPct, formatTrend } from '../format';

describe('format', () => {
  it('formatInt — milhar pt-BR', () => {
    expect(formatInt(1284)).toBe('1.284');
    expect(formatInt(47)).toBe('47');
  });

  it('formatBRL — reais sem decimais', () => {
    expect(formatBRL(142280)).toMatch(/142\.280/);
    expect(formatBRL(142280)).toMatch(/R\$/);
  });

  it('formatPct — 1 casa decimal, null → "—"', () => {
    expect(formatPct(68.2)).toBe('68,2%');
    expect(formatPct(null)).toBe('—');
  });

  it('formatTrend — sinal + valor, null → "—"', () => {
    expect(formatTrend(12.5)).toBe('+12,5%');
    expect(formatTrend(-3)).toBe('−3,0%');
    expect(formatTrend(null)).toBe('—');
  });
});
