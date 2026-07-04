/**
 * commercialTerms.test.ts — LEELA-S1602-T1 (unit, validação pura do core).
 *
 * Cobre:
 *   - platformFeePct fora de [0,100] rejeitado; bordas 0 e 100 aceitas
 *   - saasMonthlyFee = 0 VÁLIDO (RN-405); negativo rejeitado
 *   - maxParcelas inteiro ≥ 1; jurosAoMes ≥ 0; parcelaMinima ≥ 0
 *   - anticipation.custoPct em [0,100] quando presente (RN-410)
 *   - versionamento: bump válido = anterior + 1 (primeiro save = 1)
 *   - DEFAULT_COMMERCIAL_TERMS (termo canônico) é válido
 */
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_COMMERCIAL_TERMS,
  validateCommercialTerms,
  isValidTermsVersionBump,
  type CommercialTermsInput,
} from '@leela/core';

function base(): CommercialTermsInput {
  return {
    platformFeePct: 10.5,
    installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 10 },
    anticipation: { disponivel: false },
    communityMonthlyEnabled: false,
    saasMonthlyFee: 0,
  };
}

describe('validateCommercialTerms — ranges (RN-404/405/410)', () => {
  it('termo canônico DEFAULT_COMMERCIAL_TERMS é válido', () => {
    expect(validateCommercialTerms(DEFAULT_COMMERCIAL_TERMS)).toEqual([]);
    // Canônico Castelo Produções: 10,5% + SaaS 0 (produtor-sócio)
    expect(DEFAULT_COMMERCIAL_TERMS.platformFeePct).toBe(10.5);
    expect(DEFAULT_COMMERCIAL_TERMS.saasMonthlyFee).toBe(0);
  });

  it('platformFeePct nas bordas 0 e 100 é aceito', () => {
    expect(validateCommercialTerms({ ...base(), platformFeePct: 0 })).toEqual([]);
    expect(validateCommercialTerms({ ...base(), platformFeePct: 100 })).toEqual([]);
  });

  it('platformFeePct fora de [0,100] é rejeitado', () => {
    expect(validateCommercialTerms({ ...base(), platformFeePct: -0.1 })).not.toEqual([]);
    expect(validateCommercialTerms({ ...base(), platformFeePct: 100.1 })).not.toEqual([]);
    expect(validateCommercialTerms({ ...base(), platformFeePct: Number.NaN })).not.toEqual([]);
  });

  it('saasMonthlyFee = 0 é VÁLIDO (produtor-sócio isento — RN-405)', () => {
    expect(validateCommercialTerms({ ...base(), saasMonthlyFee: 0 })).toEqual([]);
  });

  it('saasMonthlyFee negativo é rejeitado', () => {
    const errors = validateCommercialTerms({ ...base(), saasMonthlyFee: -1 });
    expect(errors.some((e) => e.includes('saasMonthlyFee'))).toBe(true);
  });

  it('maxParcelas 0, negativo ou fracionário é rejeitado; 1 é aceito', () => {
    const withParcelas = (maxParcelas: number): CommercialTermsInput => ({
      ...base(),
      installmentRules: { ...base().installmentRules, maxParcelas },
    });
    expect(validateCommercialTerms(withParcelas(0))).not.toEqual([]);
    expect(validateCommercialTerms(withParcelas(-3))).not.toEqual([]);
    expect(validateCommercialTerms(withParcelas(2.5))).not.toEqual([]);
    expect(validateCommercialTerms(withParcelas(1))).toEqual([]);
  });

  it('jurosAoMes e parcelaMinima negativos são rejeitados', () => {
    expect(
      validateCommercialTerms({
        ...base(),
        installmentRules: { maxParcelas: 12, jurosAoMes: -0.5, parcelaMinima: 10 },
      })
    ).not.toEqual([]);
    expect(
      validateCommercialTerms({
        ...base(),
        installmentRules: { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: -1 },
      })
    ).not.toEqual([]);
  });

  it('anticipation.custoPct fora de [0,100] é rejeitado; ausente é aceito (RN-410)', () => {
    expect(
      validateCommercialTerms({
        ...base(),
        anticipation: { disponivel: true, custoPct: 101 },
      })
    ).not.toEqual([]);
    expect(
      validateCommercialTerms({
        ...base(),
        anticipation: { disponivel: true, custoPct: 3.5 },
      })
    ).toEqual([]);
    expect(
      validateCommercialTerms({ ...base(), anticipation: { disponivel: false } })
    ).toEqual([]);
  });

  it('acumula múltiplos erros num payload todo inválido', () => {
    const errors = validateCommercialTerms({
      platformFeePct: 200,
      installmentRules: { maxParcelas: 0, jurosAoMes: -1, parcelaMinima: -1 },
      anticipation: { disponivel: true, custoPct: -5 },
      communityMonthlyEnabled: false,
      saasMonthlyFee: -10,
    });
    expect(errors.length).toBeGreaterThanOrEqual(5);
  });
});

describe('isValidTermsVersionBump — versionamento', () => {
  it('primeiro save exige versao 1', () => {
    expect(isValidTermsVersionBump(null, 1)).toBe(true);
    expect(isValidTermsVersionBump(null, 2)).toBe(false);
    expect(isValidTermsVersionBump(null, 0)).toBe(false);
  });

  it('bump válido é sempre anterior + 1', () => {
    expect(isValidTermsVersionBump(1, 2)).toBe(true);
    expect(isValidTermsVersionBump(7, 8)).toBe(true);
    expect(isValidTermsVersionBump(1, 3)).toBe(false); // pulo
    expect(isValidTermsVersionBump(2, 2)).toBe(false); // repetição
    expect(isValidTermsVersionBump(3, 2)).toBe(false); // regressão
  });

  it('rejeita versões não inteiras ou < 1', () => {
    expect(isValidTermsVersionBump(1, 2.5)).toBe(false);
    expect(isValidTermsVersionBump(null, -1)).toBe(false);
  });
});
