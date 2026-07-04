/**
 * provisioning.test.ts — LEELA-S1601-T1 (unit, validação pura do core).
 *
 * Cobre validateProvisionInput e buildInitialTerms:
 *   - slug kebab-case (rejeita maiúsculas, espaço, underscore, hífen duplo)
 *   - ownerEmail estruturalmente válido
 *   - nome 2..80; tipo ∈ {produtor, promotor}
 *   - termos iniciais opcionais validados (fee 0..100; saas ≥ 0; 0 VÁLIDO)
 *   - buildInitialTerms: defaults canônicos + overrides
 */
import { describe, it, expect } from 'vitest';
import {
  validateProvisionInput,
  buildInitialTerms,
  DEFAULT_COMMERCIAL_TERMS,
  type ProvisionInput,
} from '@leela/core';

function base(): ProvisionInput {
  return {
    nome: 'Castelo Produções',
    slug: 'castelo-producoes',
    tipo: 'produtor',
    ownerEmail: 'marina@castelo.com.br',
  };
}

describe('validateProvisionInput', () => {
  it('input canônico é válido', () => {
    expect(validateProvisionInput(base())).toEqual([]);
  });

  it('slug fora do kebab-case é rejeitado', () => {
    for (const slug of ['Castelo', 'castelo producoes', 'castelo_producoes', '-castelo', 'castelo-', 'castelo--producoes', '']) {
      const errors = validateProvisionInput({ ...base(), slug });
      expect(errors.some((e) => e.includes('slug')), `slug '${slug}'`).toBe(true);
    }
  });

  it('slug kebab-case com dígitos é aceito', () => {
    expect(validateProvisionInput({ ...base(), slug: 'passo-certo-2026' })).toEqual([]);
  });

  it('ownerEmail inválido é rejeitado', () => {
    for (const ownerEmail of ['marina', 'marina@', '@castelo.com', 'a b@c.com', '']) {
      const errors = validateProvisionInput({ ...base(), ownerEmail });
      expect(errors.some((e) => e.includes('ownerEmail')), `email '${ownerEmail}'`).toBe(true);
    }
  });

  it('nome curto demais ou longo demais é rejeitado', () => {
    expect(validateProvisionInput({ ...base(), nome: 'A' })).not.toEqual([]);
    expect(validateProvisionInput({ ...base(), nome: 'x'.repeat(81) })).not.toEqual([]);
  });

  it('tipo fora do enum é rejeitado', () => {
    const errors = validateProvisionInput({
      ...base(),
      tipo: 'admin' as unknown as ProvisionInput['tipo'],
    });
    expect(errors.some((e) => e.includes('tipo'))).toBe(true);
  });

  it('platformFeePct inicial fora de [0,100] é rejeitado', () => {
    expect(validateProvisionInput({ ...base(), platformFeePct: 101 })).not.toEqual([]);
    expect(validateProvisionInput({ ...base(), platformFeePct: -1 })).not.toEqual([]);
    expect(validateProvisionInput({ ...base(), platformFeePct: 8 })).toEqual([]);
  });

  it('saasMonthlyFee = 0 no provisionamento é VÁLIDO (RN-405)', () => {
    expect(validateProvisionInput({ ...base(), saasMonthlyFee: 0 })).toEqual([]);
    expect(validateProvisionInput({ ...base(), saasMonthlyFee: -10 })).not.toEqual([]);
  });
});

describe('buildInitialTerms', () => {
  it('sem overrides devolve o termo canônico (10,5% / SaaS 0)', () => {
    expect(buildInitialTerms(base())).toEqual(DEFAULT_COMMERCIAL_TERMS);
  });

  it('aplica overrides de platformFeePct e saasMonthlyFee', () => {
    const terms = buildInitialTerms({
      ...base(),
      platformFeePct: 8,
      saasMonthlyFee: 199,
    });
    expect(terms.platformFeePct).toBe(8);
    expect(terms.saasMonthlyFee).toBe(199);
    // Demais campos permanecem canônicos
    expect(terms.installmentRules).toEqual(DEFAULT_COMMERCIAL_TERMS.installmentRules);
    expect(terms.communityMonthlyEnabled).toBe(false);
  });
});
