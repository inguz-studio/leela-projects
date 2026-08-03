/**
 * cadastroOrganizadorCore.test.ts — LEELA-S030-T1
 *
 * Validação PURA do cadastro do organizador e derivação do slug (RN-412 · P7).
 * A mesma função decide o botão da tela e o aceite do servidor — se divergirem,
 * o formulário passa dado que a Rule vai recusar (ou pior: o contrário).
 */
import { describe, expect, it } from 'vitest';
import {
  TERMO_LGPD_FINALIDADE,
  TERMO_LGPD_VERSAO,
  derivarSlugOrganizacao,
  validarCadastroOrganizador,
} from '@leela/core';

const VALIDO = {
  nome: 'Marina Castelo',
  email: 'marina@demo.dev',
  telefone: '(48) 99999-8888',
  organizacao: 'Castelo Produções',
  consentimentoLgpd: true,
};

describe('termo LGPD (RN-412)', () => {
  it('tem versão e finalidade declaradas', () => {
    expect(TERMO_LGPD_VERSAO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(TERMO_LGPD_FINALIDADE.length).toBeGreaterThan(30);
  });
});

describe('validarCadastroOrganizador', () => {
  it('aceita o cadastro completo', () => {
    expect(validarCadastroOrganizador(VALIDO)).toEqual([]);
  });

  it('exige o consentimento — ausente, falso e "truthy" não passam', () => {
    expect(validarCadastroOrganizador({ ...VALIDO, consentimentoLgpd: false })).toContain(
      'consentimento LGPD é obrigatório.'
    );
    const semCampo = { ...VALIDO } as Record<string, unknown>;
    delete semCampo['consentimentoLgpd'];
    expect(validarCadastroOrganizador(semCampo)).toContain(
      'consentimento LGPD é obrigatório.'
    );
    expect(
      validarCadastroOrganizador({
        ...VALIDO,
        consentimentoLgpd: 'sim' as unknown as boolean,
      })
    ).toContain('consentimento LGPD é obrigatório.');
  });

  it('exige telefone e organização (P8)', () => {
    expect(validarCadastroOrganizador({ ...VALIDO, telefone: '999' }).length).toBe(1);
    expect(validarCadastroOrganizador({ ...VALIDO, organizacao: 'X' }).length).toBe(1);
  });

  it('recusa e-mail e nome fora do contrato', () => {
    expect(validarCadastroOrganizador({ ...VALIDO, email: 'marina@' }).length).toBe(1);
    expect(validarCadastroOrganizador({ ...VALIDO, nome: 'M' }).length).toBe(1);
    expect(validarCadastroOrganizador({ ...VALIDO, nome: 'x'.repeat(81) }).length).toBe(1);
  });

  it('input nulo devolve todos os erros, sem lançar', () => {
    expect(validarCadastroOrganizador(null).length).toBe(5);
    expect(validarCadastroOrganizador(undefined).length).toBe(5);
  });
});

describe('derivarSlugOrganizacao (P7)', () => {
  it('deriva kebab-case sem acento', () => {
    expect(derivarSlugOrganizacao('Castelo Produções')).toBe('castelo-producoes');
    expect(derivarSlugOrganizacao('  Passo   Certo  ')).toBe('passo-certo');
    expect(derivarSlugOrganizacao('Ação & Cia. Ltda')).toBe('acao-cia-ltda');
  });

  it('nunca sai com hífen nas pontas, nem depois do corte de 60', () => {
    const longo = derivarSlugOrganizacao('a'.repeat(58) + ' bc');
    expect(longo.endsWith('-')).toBe(false);
    expect(longo.length).toBeLessThanOrEqual(60);
    expect(derivarSlugOrganizacao('--Leela--')).toBe('leela');
  });

  it('nome sem nada aproveitável devolve string vazia (fallback é do chamador)', () => {
    expect(derivarSlugOrganizacao('###')).toBe('');
    expect(derivarSlugOrganizacao('')).toBe('');
    expect(derivarSlugOrganizacao(null)).toBe('');
  });

  it('o resultado casa com o SLUG_RE do provisionamento', () => {
    const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    for (const nome of ['Castelo Produções', 'Ação & Cia. Ltda', 'MEU EVENTO 2026']) {
      expect(SLUG_RE.test(derivarSlugOrganizacao(nome))).toBe(true);
    }
  });
});
