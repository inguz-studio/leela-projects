import { describe, it, expect } from 'vitest';
import { siglaDe } from '../sigla';

describe('siglaDe', () => {
  it('devolve a primeira letra em maiúscula', () => {
    expect(siglaDe('Kit Prata')).toBe('K');
    expect(siglaDe('cdl')).toBe('C');
  });

  it('ignora espaço à frente — nome com recuo não vira caixa vazia', () => {
    expect(siglaDe('   Ouro')).toBe('O');
  });

  it.each([['', 'vazio'], ['   ', 'só espaços']])(
    'nome %s (%s) devolve o travessão honesto, nunca string vazia',
    (nome) => {
      expect(siglaDe(nome)).toBe('—');
    },
  );

  it.each([null, undefined])('nome ausente (%s) devolve travessão', (nome) => {
    expect(siglaDe(nome)).toBe('—');
  });

  it('preserva acento na letra (marca "Água" não vira "A" sem acento)', () => {
    expect(siglaDe('Água Viva')).toBe('Á');
  });

  it('nome que começa com dígito ou símbolo devolve o caractere como está', () => {
    expect(siglaDe('5K Runners')).toBe('5');
    expect(siglaDe('+Vida')).toBe('+');
  });

  it('não parte par surrogate: emoji no início sai inteiro', () => {
    expect(siglaDe('🏃 Corrida')).toBe('🏃');
  });
});
