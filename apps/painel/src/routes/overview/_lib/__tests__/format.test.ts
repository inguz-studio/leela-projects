import { describe, expect, it } from 'vitest';
import { formatAgoraExtenso, formatBRL, formatBRLExato, formatDataCurta, formatInt, formatPct, formatQuando, formatTrend } from '../format';

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

describe('formatDataCurta (T5 — "27 Abr" do mockup)', () => {
  it('dia + mês abreviado capitalizado, sem ponto', () => {
    expect(formatDataCurta(new Date(2026, 3, 27))).toBe('27 Abr');
    expect(formatDataCurta(new Date(2026, 0, 2))).toBe('2 Jan');
    expect(formatDataCurta(new Date(2026, 11, 31))).toBe('31 Dez');
  });
});

describe('formatBRLExato (T6 — coluna Valor da tabela)', () => {
  it('2 casas sempre ("R$ 189,00")', () => {
    expect(formatBRLExato(189)).toMatch(/R\$\s189,00/);
    expect(formatBRLExato(245.5)).toMatch(/245,50/);
  });
});

describe('formatQuando (T6 — coluna Data "Hoje/Ontem · hh:mm")', () => {
  const agora = new Date(2026, 3, 19, 15, 0); // 19 Abr 2026, 15:00 local

  it('mesmo dia civil → "Hoje · hh:mm" (zero-pad)', () => {
    expect(formatQuando(new Date(2026, 3, 19, 14, 22), agora)).toBe('Hoje · 14:22');
    expect(formatQuando(new Date(2026, 3, 19, 8, 5), agora)).toBe('Hoje · 08:05');
  });

  it('véspera → "Ontem · hh:mm" (inclui virada de mês)', () => {
    expect(formatQuando(new Date(2026, 3, 18, 19, 58), agora)).toBe('Ontem · 19:58');
    const primeiroDeMaio = new Date(2026, 4, 1, 9, 0);
    expect(formatQuando(new Date(2026, 3, 30, 12, 17), primeiroDeMaio)).toBe('Ontem · 12:17');
  });

  it('mais antigo → data curta + hora', () => {
    expect(formatQuando(new Date(2026, 2, 12, 9, 15), agora)).toBe('12 Mar · 09:15');
  });
});

describe('formatAgoraExtenso (T6 — date-badge do page-head)', () => {
  it('"Domingo, 19 de Abril · 14:32" (19/04/2026 é domingo)', () => {
    expect(formatAgoraExtenso(new Date(2026, 3, 19, 14, 32))).toBe('Domingo, 19 de Abril · 14:32');
  });
  it('dia de semana composto e zero-pad da hora', () => {
    expect(formatAgoraExtenso(new Date(2026, 6, 6, 8, 5))).toBe('Segunda-feira, 6 de Julho · 08:05');
  });
});
