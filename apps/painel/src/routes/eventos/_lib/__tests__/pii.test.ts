// =============================================================================
// Máscara de PII (S203-T3) — puras. Cobrem o contrato de exibição LGPD.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  formatarCpf,
  formatarTelefone,
  mascararCpf,
  mascararRef,
  mascararTelefone,
} from '../pii';

describe('mascararCpf', () => {
  it('mascara os 6 primeiros dígitos e revela os 5 últimos', () => {
    expect(mascararCpf('529.982.247-25')).toBe('•••.•••.247-25');
    expect(mascararCpf('52998224725')).toBe('•••.•••.247-25');
  });
  it('entrada fora de 11 dígitos → máscara total', () => {
    expect(mascararCpf('123')).toBe('•••.•••.•••-••');
  });
});

describe('formatarCpf', () => {
  it('formata 11 dígitos crus para ###.###.###-##', () => {
    expect(formatarCpf('52998224725')).toBe('529.982.247-25');
  });
});

describe('mascararTelefone', () => {
  it('preserva só os 4 últimos dígitos', () => {
    expect(mascararTelefone('(48) 99999-0001')).toBe('(••) •••••-0001');
    expect(mascararTelefone('4833330001')).toBe('(••) •••••-0001');
  });
});

describe('formatarTelefone', () => {
  it('formata móvel (11) e fixo (10)', () => {
    expect(formatarTelefone('48999990001')).toBe('(48) 99999-0001');
    expect(formatarTelefone('4833330001')).toBe('(48) 3333-0001');
  });
  it('formata com DDI (12/13)', () => {
    expect(formatarTelefone('554899990001')).toBe('+55 (48) 9999-0001');
    expect(formatarTelefone('5548999990001')).toBe('+55 (48) 99999-0001');
  });
});

describe('mascararRef', () => {
  it('mascara a ref opaca revelando só os 4 últimos caracteres', () => {
    expect(mascararRef('abcdef123456')).toBe('••••3456');
  });
  it('ref curta (≤4) → máscara total (nunca vaza o id inteiro)', () => {
    expect(mascararRef('ab')).toBe('••••');
    expect(mascararRef('abcd')).toBe('••••');
  });
  it('nunca contém a ref crua completa', () => {
    const ref = 'inscritoXYZ01';
    expect(mascararRef(ref)).not.toContain(ref);
  });
});
