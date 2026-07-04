import { describe, it, expect } from 'vitest';
import { formatBRL, formatInt, formatPct, formatDataHora } from '../format';
import type { Timestamp } from '@leela/core';

describe('formatBRL', () => {
  it('formata reais sem centavos', () => {
    expect(formatBRL(85617).replace(/ /g, ' ')).toBe('R$ 85.617');
  });
});

describe('formatInt', () => {
  it('milhar pt-BR', () => {
    expect(formatInt(1200)).toBe('1.200');
  });
});

describe('formatPct', () => {
  it('10.5 → "10,5%"', () => {
    expect(formatPct(10.5)).toBe('10,5%');
  });
  it('null/undefined → "—"', () => {
    expect(formatPct(null)).toBe('—');
    expect(formatPct(undefined)).toBe('—');
  });
});

describe('formatDataHora', () => {
  it('formata Timestamp portátil', () => {
    const ts = { toDate: () => new Date('2026-07-04T13:05:00Z') } as Timestamp;
    // formato dd/mm/aaaa hh:mm — não fixa timezone; só garante que não é "—"
    expect(formatDataHora(ts)).not.toBe('—');
    expect(formatDataHora(ts)).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
  it('null → "—"', () => {
    expect(formatDataHora(null)).toBe('—');
  });
});
