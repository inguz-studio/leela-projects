/**
 * planoCobranca.test.ts — LEELA-T2-L4 · CB-T1 (decisão #15)
 *
 * Unit PURO do modelo de plano de cobrança (@leela/core):
 *   - planoParaTerms: {taxaPorMetodo:{credit_card:10,pix:8},
 *     tabelaTaxasParcela 2..12, saasMonthlyFee} — CÓPIA campo a campo,
 *     sem recálculo (aceite do brief);
 *   - validarPlanoCobranca (nome/ranges/tabela completa);
 *   - validateCommercialTerms aceita os novos campos OPCIONAIS e trava
 *     ranges quando presentes.
 */
import { describe, expect, it } from 'vitest';
import {
  CHAVES_TABELA_PARCELAS,
  DEFAULT_COMMERCIAL_TERMS,
  isTabelaTaxasParcelaValida,
  PLANO_PADRAO,
  PLANO_PADRAO_ID,
  PLANOS_COBRANCA_COLLECTION,
  planoParaTerms,
  validarPlanoCobranca,
  validateCommercialTerms,
  type TabelaTaxasParcela,
} from '@leela/core';

function tabelaCompleta(taxa = 0): TabelaTaxasParcela {
  const t: TabelaTaxasParcela = {};
  for (const chave of CHAVES_TABELA_PARCELAS) t[chave] = taxa;
  return t;
}

describe('planoParaTerms — mapeamento fiel (zero recálculo)', () => {
  it('plano "Padrão" → { taxaPorMetodo: {credit_card:10, pix:8}, tabela 2..12, saas }', () => {
    const termos = planoParaTerms(PLANO_PADRAO);
    expect(termos).toEqual({
      taxaPorMetodo: { credit_card: 10, pix: 8 },
      tabelaTaxasParcela: tabelaCompleta(0),
      saasMonthlyFee: 0,
    });
  });

  it('copia valores arbitrários SEM recalcular (taxa ≠ default coberta)', () => {
    const tabela = { ...tabelaCompleta(1.5), '12': 4.75 };
    const termos = planoParaTerms({
      taxaPix: 6.25,
      taxaCartaoAVista: 12.4,
      tabelaTaxasParcela: tabela,
      saasMonthlyFee: 299.9,
    });
    expect(termos.taxaPorMetodo).toEqual({ credit_card: 12.4, pix: 6.25 });
    expect(termos.tabelaTaxasParcela).toEqual(tabela);
    expect(termos.saasMonthlyFee).toBe(299.9);
  });

  it('tabela é cópia DEFENSIVA (mutar o plano não muta o termo estampado)', () => {
    const tabela = tabelaCompleta(0);
    const termos = planoParaTerms({
      taxaPix: 8, taxaCartaoAVista: 10,
      tabelaTaxasParcela: tabela, saasMonthlyFee: 0,
    });
    tabela['12'] = 99;
    expect(termos.tabelaTaxasParcela['12']).toBe(0);
  });

  it('constantes canônicas do módulo', () => {
    expect(PLANOS_COBRANCA_COLLECTION).toBe('planosCobranca');
    expect(PLANO_PADRAO_ID).toBe('padrao');
    expect(CHAVES_TABELA_PARCELAS).toHaveLength(11); // 2..12
  });
});

describe('validarPlanoCobranca', () => {
  it('plano "Padrão" é válido', () => {
    expect(validarPlanoCobranca(PLANO_PADRAO)).toEqual([]);
  });

  it('nome vazio/longo, taxas fora de 0..100, saas negativo → erros', () => {
    expect(validarPlanoCobranca({ ...PLANO_PADRAO, nome: '  ' })).not.toEqual([]);
    expect(validarPlanoCobranca({ ...PLANO_PADRAO, nome: 'x'.repeat(61) })).not.toEqual([]);
    expect(validarPlanoCobranca({ ...PLANO_PADRAO, taxaPix: 101 })).not.toEqual([]);
    expect(validarPlanoCobranca({ ...PLANO_PADRAO, taxaCartaoAVista: -1 })).not.toEqual([]);
    expect(validarPlanoCobranca({ ...PLANO_PADRAO, taxaPix: Number.NaN })).not.toEqual([]);
    expect(validarPlanoCobranca({ ...PLANO_PADRAO, saasMonthlyFee: -10 })).not.toEqual([]);
  });

  it('tabela do PLANO exige 2..12 completas; chave fora do range é inválida', () => {
    const { '7': _sete, ...incompleta } = tabelaCompleta(0);
    expect(
      validarPlanoCobranca({ ...PLANO_PADRAO, tabelaTaxasParcela: incompleta }).join(' ')
    ).toContain('faltam: 7');
    expect(
      validarPlanoCobranca({
        ...PLANO_PADRAO,
        tabelaTaxasParcela: { ...tabelaCompleta(0), '13': 1 },
      })
    ).not.toEqual([]);
    expect(
      validarPlanoCobranca({
        ...PLANO_PADRAO,
        tabelaTaxasParcela: { ...tabelaCompleta(0), '5': 200 },
      })
    ).not.toEqual([]);
  });
});

describe('CommercialTerms — novos campos opcionais (aditivo)', () => {
  it('termos SEM os campos novos seguem válidos (retrocompatível)', () => {
    expect(validateCommercialTerms(DEFAULT_COMMERCIAL_TERMS)).toEqual([]);
  });

  it('termos COM taxaPorMetodo/tabela válidos passam; ranges travados', () => {
    const comNovos = {
      ...DEFAULT_COMMERCIAL_TERMS,
      taxaPorMetodo: { credit_card: 10, pix: 8 },
      tabelaTaxasParcela: tabelaCompleta(1),
    };
    expect(validateCommercialTerms(comNovos)).toEqual([]);

    expect(
      validateCommercialTerms({
        ...comNovos,
        taxaPorMetodo: { credit_card: 101, pix: 8 },
      })
    ).not.toEqual([]);
    expect(
      validateCommercialTerms({
        ...comNovos,
        tabelaTaxasParcela: { '13': 1 },
      })
    ).not.toEqual([]);
  });

  it('edição fina POR TENANT aceita tabela PARCIAL (só o plano exige completude)', () => {
    expect(isTabelaTaxasParcelaValida({ '2': 1.5 })).toBe(true);
    expect(
      validateCommercialTerms({
        ...DEFAULT_COMMERCIAL_TERMS,
        tabelaTaxasParcela: { '2': 1.5 },
      })
    ).toEqual([]);
  });
});
