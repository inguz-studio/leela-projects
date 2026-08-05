// =============================================================================
// parseValorPtBr — tabela de mesa do parser único de dinheiro do painel
// (FIX-PARSE-DINHEIRO · achado REV-LOTES/SEAL-LOTES).
//
// POR QUE O TESTE DE UM MÓDULO DO CORE MORA AQUI: o `@leela/core` não tem
// runner próprio (nem `test` no package.json); os testes dele vivem em
// `functions/src/__tests__` (ver `financeCalc.test.ts`, que testa
// `packages/core/src/finance/calc.ts`). Aquela árvore está com outra lane em
// voo nesta rodada, e o painel é o único consumidor do parser hoje. Rodar
// daqui ainda tem um ganho próprio: o painel enxerga o core BUILDADO, então
// este arquivo prova a cadeia inteira — implementação, export do índice e
// `tsup` — e não só a função. Ao mover, leve a tabela inteira.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { parseValorPtBr, mensagemValorInvalido } from '@leela/core';

/** Atalho: centavos de uma leitura que deve dar certo. */
function centavos(entrada: string): number {
  const r = parseValorPtBr(entrada);
  if (!r.ok) throw new Error(`esperava leitura ok para ${JSON.stringify(entrada)}, veio ${r.motivo}`);
  return r.centavos;
}

/** Atalho: motivo de uma leitura que deve falhar. */
function motivo(entrada: string): string {
  const r = parseValorPtBr(entrada);
  if (r.ok) throw new Error(`esperava recusa para ${JSON.stringify(entrada)}, veio ${r.valor}`);
  return r.motivo;
}

describe('parseValorPtBr — o defeito que este módulo veio fechar', () => {
  it('"1.234,56" são mil duzentos e trinta e quatro reais, não R$ 1,23', () => {
    const r = parseValorPtBr('1.234,56');
    expect(r.ok).toBe(true);
    expect(centavos('1.234,56')).toBe(123456);
    // O caminho antigo, para deixar o defeito no registro: `replace(',', '.')`
    // produzia "1.234.56" e o parseFloat parava no segundo ponto.
    expect(Number.parseFloat('1.234,56'.replace(',', '.'))).toBe(1.234);
  });

  it('milhar em qualquer profundidade', () => {
    expect(centavos('1.234.567,89')).toBe(123456789);
    expect(centavos('12.345,00')).toBe(1234500);
    expect(centavos('123.456,78')).toBe(12345678);
  });
});

describe('parseValorPtBr — formas que um brasileiro digita', () => {
  const aceitos: ReadonlyArray<readonly [string, number]> = [
    ['1234,56', 123456],
    ['1.234,56', 123456],
    ['1234.56', 123456], // ponto decimal do teclado numérico
    ['1234', 123400],
    ['99,90', 9990],
    ['99.90', 9990],
    ['12,5', 1250], // percentual fracionário
    ['0', 0],
    ['0,00', 0],
    [',56', 56],
    ['.56', 56],
    ['1234,', 123400], // separador pendurado, ainda digitando
    ['1.234,', 123400],
    ['  1.234,56  ', 123456], // espaço em volta
    ['1 234,56', 123456], // espaço como milhar
    ['R$ 1.234,56', 123456],
    ['R$1.234,56', 123456], // símbolo colado
    ['r$ 99,90', 9990],
    ['+1234,56', 123456],
    ['-1.234,56', -123456], // sinal preservado; quem recusa negativo é a tela
    ['-5', -500],
  ];

  it.each(aceitos)('%s → %i centavos', (entrada, esperado) => {
    expect(centavos(entrada)).toBe(esperado);
  });

  it('R$ 1.234,56 no formato do Intl (com NBSP) volta inteiro', () => {
    const doIntl = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(1234.56);
    expect(centavos(doIntl)).toBe(123456);
  });
});

describe('parseValorPtBr — o que ele RECUSA (e nunca arredonda calado)', () => {
  const recusados: ReadonlyArray<readonly [string, string]> = [
    ['', 'vazio'],
    ['   ', 'vazio'],
    ['R$', 'vazio'],
    ['abc', 'formato'],
    ['12abc', 'formato'],
    ['1e3', 'formato'], // exponencial JAMAIS vira mil
    ['1E3', 'formato'],
    ['1e-3', 'formato'],
    ['Infinity', 'formato'],
    ['NaN', 'formato'],
    ['1,234,56', 'formato'], // mais de uma vírgula
    ['--5', 'formato'],
    ['1.234%', 'formato'],
    [',', 'formato'],
    ['.', 'formato'],
    ['1,234.56', 'agrupamento'], // en-US: ponto DEPOIS da vírgula
    ['1.23,45', 'agrupamento'], // grupo de milhar com 2 dígitos
    ['1.2345,67', 'agrupamento'], // grupo com 4
    ['1..234', 'agrupamento'],
    ['999999999999999999,99', 'magnitude'],
  ];

  it.each(recusados)('%s → %s', (entrada, esperado) => {
    expect(motivo(entrada)).toBe(esperado);
  });

  it('toda recusa tem uma mensagem de campo em português', () => {
    for (const [entrada] of recusados) {
      const r = parseValorPtBr(entrada);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(mensagemValorInvalido(r.motivo).length).toBeGreaterThan(10);
    }
  });
});

describe('parseValorPtBr — a fronteira ambígua do ponto', () => {
  // "1.234" é indecidível: mil duzentos e trinta e quatro (milhar) e um vírgula
  // duzentos e trinta e quatro (decimal) são leituras igualmente legítimas, e a
  // diferença entre elas é mil vezes o valor. Chutar acerta metade das vezes e
  // erra a outra metade calado — que é o defeito de origem. Recusa.
  it.each([['1.234'], ['1.500'], ['12.345'], ['999.999']])(
    '%s é ambíguo e vira erro de campo, não um número torto',
    (entrada) => {
      expect(motivo(entrada)).toBe('ambiguo');
    },
  );

  it('a vírgula desfaz a ambiguidade — é o conserto de um caractere', () => {
    expect(centavos('1.500,00')).toBe(150000);
    expect(centavos('1500')).toBe(150000);
  });

  it('grupo com tamanho diferente de três é decimal, sem ambiguidade', () => {
    expect(centavos('1234.56')).toBe(123456);
    expect(centavos('1234.5')).toBe(123450);
    expect(centavos('1234.567')).toBe(123457); // 4 dígitos antes: não é milhar
  });

  it('zero à esquerda não é milhar: "0.500" é meio real', () => {
    expect(centavos('0.500')).toBe(50);
  });
});

describe('parseValorPtBr — centavos saem dos dígitos, não do float', () => {
  it('half-up sobre a terceira casa', () => {
    expect(centavos('99,999')).toBe(10000);
    expect(centavos('99,994')).toBe(9999);
    expect(centavos('99,995')).toBe(10000);
  });

  it('"1,005" arredonda para R$ 1,01 — o caminho float dizia R$ 1,00', () => {
    expect(centavos('1,005')).toBe(101);
    expect(centavos('1,015')).toBe(102);
    expect(centavos('5,015')).toBe(502);
    // O caminho float, para o registro: 1.005 × 100 em double dá
    // 100.49999999999999, e o half-up desce em vez de subir. O erro é
    // intermitente (10,005 acerta pelos dois caminhos), que é o motivo de nunca
    // ter virado um bug reproduzível.
    expect(Math.round(1.005 * 100)).toBe(100);
    expect(Math.round(1.015 * 100)).toBe(101);
    expect(Math.round(10.005 * 100)).toBe(1001);
  });

  it('`valor` preserva o decimal exato para quem precisa reprovar a sub-centavo', () => {
    const r = parseValorPtBr('10,005');
    expect(r.ok && r.valor).toBe(10.005);
    expect(r.ok && r.centExato).toBe(false);
    const exato = parseValorPtBr('10,00');
    expect(exato.ok && exato.centExato).toBe(true);
  });

  it('centavos e valor concordam nos valores cent-exatos', () => {
    for (const s of ['0,01', '99,90', '1.234,56', '7.000,00', '0,99']) {
      const r = parseValorPtBr(s);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.centavos / 100).toBe(r.valor);
    }
  });
});
