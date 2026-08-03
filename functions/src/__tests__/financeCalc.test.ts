/**
 * financeCalc.test.ts — LEELA-S1602-T3 (unit, cálculo financeiro puro).
 *
 * Cobre computeTaxa / computeReceitaLiquida / roundMoney /
 * buildInstallmentOptions (RN-330/406 e RN-311):
 *   - taxa por parâmetro (nunca constante) com arredondamento a centavos
 *   - bordas: 0%, 100%, receita 0; inputs inválidos → RangeError
 *   - parcelamento: corte por parcelaMinima, juros compostos, à vista sempre
 */
import { describe, it, expect } from 'vitest';
import {
  computeTaxa,
  computeReceitaLiquida,
  roundMoney,
  buildInstallmentOptions,
  type InstallmentRules,
} from '@leela/core';

describe('roundMoney', () => {
  it('arredonda a 2 casas (half-up sobre centavos)', () => {
    expect(roundMoney(10.555)).toBe(10.56);
    expect(roundMoney(10.554)).toBe(10.55);
    expect(roundMoney(0.1 + 0.2)).toBe(0.3); // ponto flutuante domado
    expect(roundMoney(105)).toBe(105);
  });
});

describe('computeTaxa (RN-330/406)', () => {
  it('aplica o percentual recebido por parâmetro', () => {
    expect(computeTaxa(1000, 10.5)).toBe(105);
    expect(computeTaxa(1000, 8)).toBe(80);
    expect(computeTaxa(357.9, 10.5)).toBe(37.58); // 37.5795 → 37.58
  });

  it('bordas: 0% e 100% e receita 0', () => {
    expect(computeTaxa(1000, 0)).toBe(0);
    expect(computeTaxa(1000, 100)).toBe(1000);
    expect(computeTaxa(0, 10.5)).toBe(0);
  });

  it('rejeita receita negativa/não-finita e taxa fora de [0,100]', () => {
    expect(() => computeTaxa(-1, 10.5)).toThrow(RangeError);
    expect(() => computeTaxa(Number.NaN, 10.5)).toThrow(RangeError);
    expect(() => computeTaxa(1000, -0.1)).toThrow(RangeError);
    expect(() => computeTaxa(1000, 100.1)).toThrow(RangeError);
  });
});

describe('computeReceitaLiquida (RN-330)', () => {
  it('líquida = bruta − taxa (2 casas)', () => {
    expect(computeReceitaLiquida(1000, 10.5)).toBe(895);
    expect(computeReceitaLiquida(357.9, 10.5)).toBe(320.32); // 357.9 − 37.58
  });
});

describe('buildInstallmentOptions (RN-311 — regras do termo)', () => {
  const semJuros: InstallmentRules = {
    maxParcelas: 12,
    jurosAoMes: 0,
    parcelaMinima: 10,
  };

  it('oferta até maxParcelas quando a parcela não fura o mínimo', () => {
    const options = buildInstallmentOptions(1200, semJuros);
    expect(options).toHaveLength(12);
    expect(options[11]).toEqual({ parcelas: 12, valorParcela: 100, valorTotal: 1200 });
  });

  it('corta quando a parcela cai abaixo da parcelaMinima do termo', () => {
    // 35/3 ≈ 11,67 ok; 35/4 = 8,75 < 10 → corta em 3x
    const options = buildInstallmentOptions(35, semJuros);
    expect(options.map((o) => o.parcelas)).toEqual([1, 2, 3]);
  });

  it('à vista (1x) é sempre ofertada, mesmo abaixo do mínimo', () => {
    const options = buildInstallmentOptions(5, semJuros);
    expect(options).toEqual([{ parcelas: 1, valorParcela: 5, valorTotal: 5 }]);
  });

  it('rejeita valor ≤ 0 ou não-finito', () => {
    expect(() => buildInstallmentOptions(0, semJuros)).toThrow(RangeError);
    expect(() => buildInstallmentOptions(-10, semJuros)).toThrow(RangeError);
    expect(() => buildInstallmentOptions(Number.NaN, semJuros)).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// S314-T1 · RN-436 — a tabela Price de verdade
//
// Estes casos REPROVAM o modelo anterior (`total = valor × (1+i)^n`,
// `parcela = total / n`). Falsificação medida com a fórmula antiga restaurada:
// os quatro primeiros casos caem; o quinto (parcela mínima) passa nos dois
// mundos de propósito — é a guarda de que a mudança de fórmula não mexeu no
// corte do termo.
// ---------------------------------------------------------------------------
describe('buildInstallmentOptions · tabela Price (S314-T1 · RN-436)', () => {
  /** O termo que o dono mandou simular (D-ACH-8): 2,89% a.m. */
  const price289: InstallmentRules = {
    maxParcelas: 12,
    jurosAoMes: 2.89,
    parcelaMinima: 0,
  };

  it('R$ 300 a 2,89% a.m. em 12x cobra Price, não o composto do prazo inteiro', () => {
    const options = buildInstallmentOptions(300, price289);
    const doze = options.find((o) => o.parcelas === 12);
    // Price: 300 × 0,0289 ÷ (1 − 1,0289^−12) = 29,941065… → 29,94/parcela.
    expect(doze).toEqual({ parcelas: 12, valorParcela: 29.94, valorTotal: 359.28 });
    // O modelo antigo cobrava 300 × 1,0289^12 = 422,28 — 17,5% a mais.
    expect(doze?.valorTotal).not.toBe(422.28);
  });

  it('a parcela única NUNCA carrega juros (1x = PV)', () => {
    const options = buildInstallmentOptions(300, price289);
    expect(options[0]).toEqual({ parcelas: 1, valorParcela: 300, valorTotal: 300 });
    // É esta igualdade que faz "à vista" do cartão bater com o PIX à vista na
    // mesma tela: `totalAVista` do resumo == valorTotal da 1ª opção.
    expect(options[0]?.valorTotal).toBe(300);
  });

  it('para TODO n da lista, parcela × n === total, exato em centavos', () => {
    for (const valor of [300, 137.4, 89.9, 1200, 35]) {
      for (const juros of [0, 2.89, 3.49]) {
        const options = buildInstallmentOptions(valor, {
          maxParcelas: 12,
          jurosAoMes: juros,
          parcelaMinima: 0,
        });
        for (const o of options) {
          // Centavos inteiros: comparar em reais deixaria 0,1+0,2 passar.
          expect(Math.round(o.valorParcela * 100) * o.parcelas).toBe(
            Math.round(o.valorTotal * 100),
          );
        }
      }
    }
  });

  it('a parcela cresce com o juro e o total nunca é menor que o principal', () => {
    const semJuros = buildInstallmentOptions(300, {
      maxParcelas: 12,
      jurosAoMes: 0,
      parcelaMinima: 0,
    });
    const comJuros = buildInstallmentOptions(300, price289);
    for (let n = 2; n <= 12; n++) {
      const a = semJuros.find((o) => o.parcelas === n)!;
      const b = comJuros.find((o) => o.parcelas === n)!;
      expect(b.valorParcela).toBeGreaterThan(a.valorParcela);
      expect(b.valorTotal).toBeGreaterThan(300);
    }
  });

  it('o corte pela parcela mínima do termo continua valendo com juros ligados', () => {
    // Parcela mínima alta: com Price a parcela é MAIOR, então o corte cai
    // depois — comportamento correto, e não exceção.
    const options = buildInstallmentOptions(300, {
      maxParcelas: 12,
      jurosAoMes: 2.89,
      parcelaMinima: 40,
    });
    expect(options.map((o) => o.parcelas)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(options[options.length - 1]?.valorParcela).toBeGreaterThanOrEqual(40);
  });
});
