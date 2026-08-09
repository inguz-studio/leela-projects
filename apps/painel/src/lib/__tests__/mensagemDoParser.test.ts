// =============================================================================
// mensagemDoParser — a ponte entre a recusa do parser e o texto do campo.
//
// O que estes testes protegem é a DIVISÃO DE TRABALHO: a frase do parser sai
// inteira, sem tradução da tela no meio, e o campo em branco é decisão de quem
// chama — não deste módulo.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { mensagemDeContagem, mensagemDeValor } from '../mensagemDoParser';

describe('mensagemDeValor (dinheiro)', () => {
  it('texto legível não tem o que dizer', () => {
    for (const bom of ['1234', '1.234,56', '99,90', 'R$ 1.234', '1234.56']) {
      expect(mensagemDeValor(bom)).toBeNull();
    }
  });

  it('en-US e pontuação torta saem com a frase que ensina a régua', () => {
    expect(mensagemDeValor('1,234.56')).toBe(
      'Pontuação fora do padrão. Ponto separa milhar e vírgula separa centavos (ex.: 1.234,56).',
    );
  });

  it('letra sai como formato, com o exemplo em pt-BR', () => {
    expect(mensagemDeValor('abc')).toBe(
      'Valor inválido. Use apenas números, com vírgula nos centavos (ex.: 1.234,56).',
    );
  });

  it('magnitude tem frase própria', () => {
    expect(mensagemDeValor('9999999999999')).toBe('Valor alto demais.');
  });

  it('branco cala por padrão, e acusa quando o campo é obrigatório', () => {
    expect(mensagemDeValor('')).toBeNull();
    expect(mensagemDeValor('   ')).toBeNull();
    expect(mensagemDeValor('', { vazioAcusa: true })).toBe('Informe um valor.');
  });
});

describe('mensagemDeContagem', () => {
  it('milhar com ponto é legível — é a decisão do dono de 05/08', () => {
    expect(mensagemDeContagem('1.000')).toBeNull();
    expect(mensagemDeContagem('1234')).toBeNull();
  });

  it('casa decimal diz que contagem é inteira, e ensina o milhar', () => {
    for (const ruim of ['2,5', '1,000', '1.5']) {
      expect(mensagemDeContagem(ruim)).toBe(
        'A quantidade é um número inteiro, sem casas decimais. Para mil, escreva 1.000 ou 1000.',
      );
    }
  });

  it('agrupamento torto diz onde o ponto entra', () => {
    expect(mensagemDeContagem('1.23,45')).toBe(
      'Pontuação fora do padrão. O ponto separa o milhar, de três em três (ex.: 1.000).',
    );
  });

  it('branco cala por padrão, e acusa quando o campo é obrigatório', () => {
    expect(mensagemDeContagem('')).toBeNull();
    expect(mensagemDeContagem('', { vazioAcusa: true })).toBe('Informe uma quantidade.');
  });
});
