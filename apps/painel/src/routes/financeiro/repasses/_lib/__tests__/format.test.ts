import { describe, it, expect } from 'vitest';
import type { Timestamp } from '@leela/core';
import { formatBRL, formatData, formatDataHora } from '../format';

const norm = (s: string) => s.replace(/\s/g, ' ');

function ts(ms: number): Timestamp {
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: 0,
    toDate: () => new Date(ms),
    toMillis: () => ms,
  };
}

describe('formatBRL (centavos)', () => {
  it('formata com 2 casas — dinheiro de repasse é cent-exato', () => {
    expect(norm(formatBRL(8500))).toBe('R$ 8.500,00');
    expect(norm(formatBRL(1234.5))).toBe('R$ 1.234,50');
    expect(norm(formatBRL(0))).toBe('R$ 0,00');
  });
});

describe('formatData / formatDataHora', () => {
  it('data curta pt-BR de um Timestamp legível', () => {
    // 2026-04-15T12:00:00Z
    const d = Date.UTC(2026, 3, 15, 12, 0, 0);
    expect(formatData(ts(d))).toMatch(/15\/04\/2026/);
    expect(formatDataHora(ts(d))).toMatch(/15\/04\/2026/);
  });

  it('null/undefined → "—" (nunca finge data)', () => {
    expect(formatData(null)).toBe('—');
    expect(formatData(undefined)).toBe('—');
    expect(formatDataHora(null)).toBe('—');
  });

  it('sentinela epoch 0 (data ilegível) → "—"', () => {
    expect(formatData(ts(0))).toBe('—');
    expect(formatDataHora(ts(0))).toBe('—');
  });
});
