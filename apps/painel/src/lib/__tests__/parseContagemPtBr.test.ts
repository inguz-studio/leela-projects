// =============================================================================
// parseContagemPtBr — tabela de mesa do parser único de contagem do painel
// (FIX-PARSE-MILHAR · irmão de `parseValorPtBr`).
//
// POR QUE O TESTE DE UM MÓDULO DO CORE MORA AQUI: mesma razão do teste de
// dinheiro ao lado — o `@leela/core` não tem runner próprio, a árvore de
// `functions/src/__tests__` está com outra lane em voo, e o painel é o único
// consumidor hoje. Rodar daqui prova a cadeia inteira (implementação, export do
// índice e `tsup`), porque o painel enxerga o core BUILDADO. Ao mover, leve a
// tabela inteira e o bloco de coerência com o dinheiro.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  parseContagemPtBr,
  mensagemContagemInvalida,
  parseValorPtBr,
  type MotivoContagemInvalida,
} from '@leela/core';

/** Atalho: valor de uma leitura que deve dar certo. */
function valor(entrada: string): number {
  const r = parseContagemPtBr(entrada);
  if (!r.ok) {
    throw new Error(`esperava leitura ok para ${JSON.stringify(entrada)}, veio ${r.motivo}`);
  }
  return r.valor;
}

/** Atalho: motivo de uma leitura que deve falhar. */
function motivo(entrada: string): MotivoContagemInvalida {
  const r = parseContagemPtBr(entrada);
  if (r.ok) throw new Error(`esperava recusa para ${JSON.stringify(entrada)}, veio ${r.valor}`);
  return r.motivo;
}

describe('parseContagemPtBr — o defeito que este módulo veio fechar', () => {
  it('"1.000" num campo de vaga são mil lugares, não um', () => {
    expect(valor('1.000')).toBe(1000);
  });

  it('o caminho antigo lia 1 e passava calado pela guarda de inteiro', () => {
    // Fica no registro: as duas formas que o painel usava truncavam, e o 1 que
    // sobrava é um inteiro legítimo — nenhuma guarda tinha como reprovar.
    expect(Number('1.000')).toBe(1);
    expect(Number.isInteger(Number('1.000'))).toBe(true);
    expect(Number.parseInt('1.500', 10)).toBe(1);
    expect(Number.parseInt('1.000', 10)).toBe(1);
  });

  it('milhar em qualquer profundidade', () => {
    expect(valor('12.345')).toBe(12345);
    expect(valor('1.234.567')).toBe(1234567);
    expect(valor('999.999')).toBe(999999);
  });
});

describe('parseContagemPtBr — inteiro puro', () => {
  it('sem pontuação nenhuma', () => {
    expect(valor('0')).toBe(0);
    expect(valor('1')).toBe(1);
    expect(valor('50')).toBe(50);
    expect(valor('1000')).toBe(1000);
    expect(valor('999999999')).toBe(999999999);
  });

  it('zero à esquerda não muda a leitura', () => {
    expect(valor('007')).toBe(7);
    expect(valor('000')).toBe(0);
    expect(valor('0100')).toBe(100);
  });

  it('espaço em volta, entre os grupos e o NBSP do Intl', () => {
    expect(valor('  1.000  ')).toBe(1000);
    expect(valor('1 000')).toBe(1000);
    expect(valor('1 000')).toBe(1000);
  });

  it('sinal à esquerda: sai com sinal, a faixa é guarda de cada campo', () => {
    expect(valor('+7')).toBe(7);
    expect(valor('-3')).toBe(-3);
    expect(valor('-1.000')).toBe(-1000);
  });

  it('"-0" é zero, não um zero negativo viajando para o documento', () => {
    const r = parseContagemPtBr('-0');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor).toBe(0);
    expect(Object.is(r.valor, -0)).toBe(false);
    expect(r.negativo).toBe(false);
    expect(r.canonico).toBe('0');
  });

  it('canônico é só dígito, com o sinal quando existe', () => {
    const r = parseContagemPtBr('-1.234');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.canonico).toBe('-1234');
    expect(r.negativo).toBe(true);
  });
});

describe('parseContagemPtBr — casa decimal é recusa, nunca arredondamento', () => {
  it('"1,000" NÃO é mil: a vírgula é decimal em pt-BR', () => {
    // O par com "1.000" é a razão de a recusa ser pelo TIPO da entrada. Os dois
    // textos têm os mesmos dígitos e significam mil vezes um ao outro; devolver
    // 1 aqui seria o mesmo erro de magnitude, ao contrário.
    expect(motivo('1,000')).toBe('decimal');
    expect(valor('1.000')).toBe(1000);
  });

  it('meia vaga não existe', () => {
    expect(motivo('2,5')).toBe('decimal');
    expect(motivo('1.5')).toBe('decimal');
    expect(motivo('0,5')).toBe('decimal');
    expect(motivo('10.25')).toBe('decimal');
  });

  it('separador pendurado ainda é separador', () => {
    expect(motivo('1234,')).toBe('decimal');
    expect(motivo(',5')).toBe('decimal');
    expect(motivo('.5')).toBe('decimal');
  });

  it('dinheiro digitado num campo de contagem é recusado, não truncado', () => {
    expect(motivo('1.234,56')).toBe('decimal');
    expect(motivo('99,90')).toBe('decimal');
  });

  it('"0.500" é meio, não meio milhar', () => {
    expect(motivo('0.500')).toBe('decimal');
  });

  it('grupo final com tamanho diferente de três é decimal', () => {
    expect(motivo('12.34')).toBe('decimal');
    expect(motivo('1.2345')).toBe('decimal');
  });
});

describe('parseContagemPtBr — o que o campo recusa', () => {
  it('vazio', () => {
    expect(motivo('')).toBe('vazio');
    expect(motivo('   ')).toBe('vazio');
  });

  it('letra, exponencial e sinal repetido', () => {
    expect(motivo('abc')).toBe('formato');
    expect(motivo('50 vagas')).toBe('formato');
    // "1e3" seria mil por `Number` e um por `parseInt` — as duas telas de teto
    // de uso discordavam exatamente aqui. Ninguém digita vaga por exponencial.
    expect(motivo('1e3')).toBe('formato');
    expect(motivo('1E3')).toBe('formato');
    expect(motivo('Infinity')).toBe('formato');
    expect(motivo('NaN')).toBe('formato');
    expect(motivo('--5')).toBe('formato');
    expect(motivo('-')).toBe('formato');
    expect(motivo('1.000%')).toBe('formato');
  });

  it('agrupamento de milhar torto', () => {
    expect(motivo('1.23.456')).toBe('agrupamento');
    expect(motivo('1..000')).toBe('agrupamento');
    expect(motivo('1,234.56')).toBe('agrupamento');
    expect(motivo('12.3456.789')).toBe('agrupamento');
  });

  it('magnitude fora da escala do produto', () => {
    expect(valor('999.999.999')).toBe(999999999);
    expect(motivo('1.000.000.000')).toBe('magnitude');
    expect(motivo('99999999999999')).toBe('magnitude');
  });

  it('cada recusa tem um texto de campo próprio', () => {
    const motivos: MotivoContagemInvalida[] = [
      'vazio',
      'formato',
      'agrupamento',
      'decimal',
      'magnitude',
    ];
    const textos = motivos.map((m) => mensagemContagemInvalida(m));
    expect(new Set(textos).size).toBe(motivos.length);
    for (const t of textos) expect(t.length).toBeGreaterThan(0);
    // A recusa mais provável na tela precisa dizer o que fazer, não só "inválido".
    expect(mensagemContagemInvalida('decimal')).toContain('1.000');
  });

  it('o símbolo de moeda é tolerado pelo módulo de pontuação (quirk conhecido)', () => {
    // A leitura de pontuação é compartilhada com o dinheiro e tira o "R$" antes
    // de olhar os dígitos. Campo de contagem não tem R$ na tela; fica pinado
    // para que a próxima leitura saiba que é conhecido, e não um buraco.
    expect(valor('R$ 1.000')).toBe(1000);
  });
});

describe('dinheiro e contagem leem a mesma pontuação', () => {
  it('"1.000" é mil nos dois — é para isso que a regra mora num lugar só', () => {
    const dinheiro = parseValorPtBr('1.000');
    const contagem = parseContagemPtBr('1.000');
    expect(dinheiro.ok).toBe(true);
    expect(contagem.ok).toBe(true);
    if (!dinheiro.ok || !contagem.ok) return;
    expect(dinheiro.centavos).toBe(100000); // R$ 1.000,00
    expect(contagem.valor).toBe(1000);
  });

  it('a parte inteira concorda em toda a tabela de milhar', () => {
    for (const entrada of ['1.234', '12.345', '1.234.567', '999.999', '1000', '7']) {
      const dinheiro = parseValorPtBr(entrada);
      const contagem = parseContagemPtBr(entrada);
      expect(dinheiro.ok).toBe(true);
      expect(contagem.ok).toBe(true);
      if (!dinheiro.ok || !contagem.ok) return;
      expect(dinheiro.centavos).toBe(contagem.valor * 100);
    }
  });

  it('onde as duas famílias divergem, divergem de propósito', () => {
    // Dinheiro aceita casa decimal porque tem centavos; contagem recusa porque
    // não tem casa nenhuma. É a única divergência, e é de domínio.
    const dinheiro = parseValorPtBr('2,50');
    expect(dinheiro.ok).toBe(true);
    if (dinheiro.ok) expect(dinheiro.centavos).toBe(250);
    expect(motivo('2,50')).toBe('decimal');
  });

  it('as duas recusam o mesmo agrupamento torto', () => {
    const dinheiro = parseValorPtBr('1.23.456');
    expect(dinheiro.ok).toBe(false);
    if (!dinheiro.ok) expect(dinheiro.motivo).toBe('agrupamento');
    expect(motivo('1.23.456')).toBe('agrupamento');
  });
});
