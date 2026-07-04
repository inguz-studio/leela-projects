import { describe, it, expect } from 'vitest';
import { diasParaEvento, formatBRL, formatDataEvento, formatInt } from '../format';
import { ts } from '../../_test/fixtures';

describe('formatBRL', () => {
  it('formata o mock canônico sem decimais', () => {
    //   = espaço não-quebrável usado pelo Intl entre "R$" e o número
    expect(formatBRL(85617).replace(/ /g, ' ')).toBe('R$ 85.617');
  });
});

describe('formatInt', () => {
  it('usa separador de milhar pt-BR', () => {
    expect(formatInt(453)).toBe('453');
    expect(formatInt(1200)).toBe('1.200');
  });
});

describe('formatDataEvento', () => {
  it('formata a data por extenso', () => {
    const out = formatDataEvento(ts(new Date('2026-04-27T12:00:00Z')));
    expect(out).toContain('27');
    expect(out).toContain('2026');
  });

  it('trata data ausente', () => {
    expect(formatDataEvento(null)).toBe('Data a definir');
  });
});

describe('diasParaEvento', () => {
  it('conta dias até a prova', () => {
    const dias = diasParaEvento(
      ts(new Date('2026-04-25T00:00:00Z')),
      new Date('2026-04-20T00:00:00Z'),
    );
    expect(dias).toBe(5);
  });

  it('null quando não há data', () => {
    expect(diasParaEvento(undefined)).toBeNull();
  });
});
