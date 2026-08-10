// =============================================================================
// formatDecimal1 — a casa decimal declarada que separa "média" de "contagem"
// na tela de Engajamento (REDESIGN-DS · D-1, REV 2026-08-09).
// =============================================================================

import { describe, expect, it } from 'vitest';
import { formatDecimal1 } from '../format';

describe('formatDecimal1 · a casa decimal nunca some', () => {
  it('mantém 1 casa mesmo quando o valor é inteiro — não deixa a média parecer contagem', () => {
    expect(formatDecimal1(150)).toBe('150,0');
  });

  it('formata em pt-BR com vírgula decimal', () => {
    expect(formatDecimal1(37.2)).toBe('37,2');
  });

  it('arredonda para 1 casa quando o valor chega com mais precisão', () => {
    expect(formatDecimal1(10.358)).toBe('10,4');
  });

  it('separador de milhar pt-BR continua presente acima de mil', () => {
    expect(formatDecimal1(1234.5)).toBe('1.234,5');
  });
});
