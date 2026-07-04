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

  it('juros compostos por parcela quando jurosAoMes > 0', () => {
    const comJuros: InstallmentRules = {
      maxParcelas: 3,
      jurosAoMes: 2,
      parcelaMinima: 0,
    };
    const options = buildInstallmentOptions(100, comJuros);
    expect(options[0]).toEqual({ parcelas: 1, valorParcela: 102, valorTotal: 102 });
    expect(options[1]?.valorTotal).toBe(104.04); // 100 × 1,02²
    expect(options[2]?.valorTotal).toBe(106.12); // 100 × 1,02³ = 106,1208
  });

  it('rejeita valor ≤ 0 ou não-finito', () => {
    expect(() => buildInstallmentOptions(0, semJuros)).toThrow(RangeError);
    expect(() => buildInstallmentOptions(-10, semJuros)).toThrow(RangeError);
    expect(() => buildInstallmentOptions(Number.NaN, semJuros)).toThrow(RangeError);
  });
});
