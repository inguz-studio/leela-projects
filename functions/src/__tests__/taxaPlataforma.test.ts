/**
 * taxaPlataforma.test.ts — LEELA-TAXAFLEX-T1/T2 (unit puro, sem emulator)
 *
 * Núcleo da taxa-flex (RN-178/183): validação da tabela (global completa +
 * override parcial), resolução override > global > legado e o cálculo
 * cent-exato `computeTaxaPlataforma` (centavos × basis points, half-up).
 */
import { describe, expect, it } from 'vitest';
import {
  computeTaxaPlataforma,
  computeTaxaPlataformaReais,
  isMeioTaxa,
  isTaxaMeioValida,
  meioDaForma,
  resolverTaxaMeio,
  taxaMeioParaBp,
  TAXA_FIXO_CENTAVOS_MAX,
  validarTabelaTaxaPlataforma,
  validarTaxaTabelaOverride,
  validateCommercialTerms,
  DEFAULT_COMMERCIAL_TERMS,
  type TabelaTaxaPlataforma,
} from '@leela/core';

const TABELA: TabelaTaxaPlataforma = {
  pix: { percentual: 6, fixoCentavos: 200 },
  cartao: { percentual: 8, fixoCentavos: 150 },
  boleto: { percentual: 4, fixoCentavos: 350 },
};

// ── computeTaxaPlataforma — RN-183 (half-up em centavos inteiros) ──────────
describe('computeTaxaPlataforma', () => {
  it('exemplo verbatim do Vitor: 6% PIX + R$2,00 sobre R$100,00 = R$8,00', () => {
    expect(computeTaxaPlataforma(10_000, { percentualBp: 600, fixoCentavos: 200 })).toBe(800);
  });

  it('exemplo verbatim: 8% cartão + R$1,50 sobre R$100,00 = R$9,50', () => {
    expect(computeTaxaPlataforma(10_000, { percentualBp: 800, fixoCentavos: 150 })).toBe(950);
  });

  it('half-up: fração exata de meio centavo ARREDONDA PARA CIMA', () => {
    // 25c × 6% = 1,5c ⇒ 2c (half-up, nunca banker's rounding)
    expect(computeTaxaPlataforma(25, { percentualBp: 600, fixoCentavos: 0 })).toBe(2);
    // 50c × 1% = 0,5c ⇒ 1c
    expect(computeTaxaPlataforma(50, { percentualBp: 100, fixoCentavos: 0 })).toBe(1);
    // 150c × 1% = 1,5c ⇒ 2c (o caso 1,5 que banker's mandaria p/ 2 tb; o
    // contraste real é 250c × 1% = 2,5c ⇒ 3c, onde banker's daria 2)
    expect(computeTaxaPlataforma(250, { percentualBp: 100, fixoCentavos: 0 })).toBe(3);
  });

  it('abaixo do meio centavo arredonda para baixo', () => {
    // 24c × 6% = 1,44c ⇒ 1c
    expect(computeTaxaPlataforma(24, { percentualBp: 600, fixoCentavos: 0 })).toBe(1);
  });

  it('o fixo soma DEPOIS do arredondamento do percentual (regra escrita)', () => {
    // round(25 × 6%) + 10 = 2 + 10 = 12
    expect(computeTaxaPlataforma(25, { percentualBp: 600, fixoCentavos: 10 })).toBe(12);
  });

  it('percentual 0 cobra só o fixo; fixo 0 cobra só o percentual; 0+0 = 0', () => {
    expect(computeTaxaPlataforma(10_000, { percentualBp: 0, fixoCentavos: 200 })).toBe(200);
    expect(computeTaxaPlataforma(10_000, { percentualBp: 600, fixoCentavos: 0 })).toBe(600);
    expect(computeTaxaPlataforma(10_000, { percentualBp: 0, fixoCentavos: 0 })).toBe(0);
  });

  it('face 0 cobra só o fixo (linha teórica — guard de venda gratuita é do saleState)', () => {
    expect(computeTaxaPlataforma(0, { percentualBp: 600, fixoCentavos: 200 })).toBe(200);
  });

  it('100% em bp (10000) é o teto válido', () => {
    expect(computeTaxaPlataforma(1_000, { percentualBp: 10_000, fixoCentavos: 0 })).toBe(1_000);
  });

  it('fail-fast: face não-inteiro/negativo, bp fora de [0,10000], fixo não-inteiro', () => {
    expect(() => computeTaxaPlataforma(10.5, { percentualBp: 600, fixoCentavos: 0 })).toThrow(RangeError);
    expect(() => computeTaxaPlataforma(-1, { percentualBp: 600, fixoCentavos: 0 })).toThrow(RangeError);
    expect(() => computeTaxaPlataforma(100, { percentualBp: 600.5, fixoCentavos: 0 })).toThrow(RangeError);
    expect(() => computeTaxaPlataforma(100, { percentualBp: 10_001, fixoCentavos: 0 })).toThrow(RangeError);
    expect(() => computeTaxaPlataforma(100, { percentualBp: -1, fixoCentavos: 0 })).toThrow(RangeError);
    expect(() => computeTaxaPlataforma(100, { percentualBp: 600, fixoCentavos: 1.5 })).toThrow(RangeError);
    expect(() => computeTaxaPlataforma(100, { percentualBp: 600, fixoCentavos: -1 })).toThrow(RangeError);
    expect(() => computeTaxaPlataforma(Number.NaN, { percentualBp: 600, fixoCentavos: 0 })).toThrow(RangeError);
  });
});

// ── Conversões (bp e reais) ────────────────────────────────────────────────
describe('taxaMeioParaBp / computeTaxaPlataformaReais', () => {
  it('percentual em passo de 0,01% vira bp inteiro exato', () => {
    expect(taxaMeioParaBp({ percentual: 6, fixoCentavos: 200 })).toEqual({
      percentualBp: 600,
      fixoCentavos: 200,
    });
    expect(taxaMeioParaBp({ percentual: 6.01, fixoCentavos: 0 }).percentualBp).toBe(601);
    expect(taxaMeioParaBp({ percentual: 10.5, fixoCentavos: 0 }).percentualBp).toBe(1050);
  });

  it('linha inválida lança (nunca converte lixo)', () => {
    expect(() => taxaMeioParaBp({ percentual: 6.001, fixoCentavos: 0 })).toThrow(RangeError);
    expect(() => taxaMeioParaBp({ percentual: 6, fixoCentavos: 1.5 })).toThrow(RangeError);
  });

  it('reais: R$ 100,00 com 6% + R$2,00 = R$ 8,00 (cent-exato)', () => {
    expect(computeTaxaPlataformaReais(100, { percentual: 6, fixoCentavos: 200 })).toBe(8);
  });

  it('reais: fronteira de FP — R$ 99,99 × 6% = 5,9994 ⇒ R$ 6,00 + fixo', () => {
    expect(computeTaxaPlataformaReais(99.99, { percentual: 6, fixoCentavos: 200 })).toBe(8);
  });

  it('reais: half-up no centavo — R$ 0,25 × 6% = 1,5c ⇒ R$ 0,02', () => {
    expect(computeTaxaPlataformaReais(0.25, { percentual: 6, fixoCentavos: 0 })).toBe(0.02);
  });

  it('reais: fail-fast em face inválido', () => {
    expect(() => computeTaxaPlataformaReais(-1, { percentual: 6, fixoCentavos: 0 })).toThrow(RangeError);
    expect(() => computeTaxaPlataformaReais(Number.NaN, { percentual: 6, fixoCentavos: 0 })).toThrow(RangeError);
  });
});

// ── Validação de linha/tabela/override — RN-178 ────────────────────────────
describe('isTaxaMeioValida / validar tabelas', () => {
  it('linha válida: percentual em passo 0,01 e fixo inteiro no teto', () => {
    expect(isTaxaMeioValida({ percentual: 6, fixoCentavos: 200 })).toBe(true);
    expect(isTaxaMeioValida({ percentual: 6.01, fixoCentavos: 0 })).toBe(true);
    expect(isTaxaMeioValida({ percentual: 0, fixoCentavos: 0 })).toBe(true);
    expect(isTaxaMeioValida({ percentual: 100, fixoCentavos: TAXA_FIXO_CENTAVOS_MAX })).toBe(true);
  });

  it('linha inválida: passo menor que 0,01%, range, fixo float/negativo/teto, shape', () => {
    expect(isTaxaMeioValida({ percentual: 6.001, fixoCentavos: 0 })).toBe(false);
    expect(isTaxaMeioValida({ percentual: -0.01, fixoCentavos: 0 })).toBe(false);
    expect(isTaxaMeioValida({ percentual: 100.01, fixoCentavos: 0 })).toBe(false);
    expect(isTaxaMeioValida({ percentual: Number.NaN, fixoCentavos: 0 })).toBe(false);
    expect(isTaxaMeioValida({ percentual: 6, fixoCentavos: 1.5 })).toBe(false);
    expect(isTaxaMeioValida({ percentual: 6, fixoCentavos: -1 })).toBe(false);
    expect(isTaxaMeioValida({ percentual: 6, fixoCentavos: TAXA_FIXO_CENTAVOS_MAX + 1 })).toBe(false);
    expect(isTaxaMeioValida({ percentual: 6 })).toBe(false);
    expect(isTaxaMeioValida({ percentual: 6, fixoCentavos: 0, extra: 1 })).toBe(false);
    expect(isTaxaMeioValida(null)).toBe(false);
    expect(isTaxaMeioValida([])).toBe(false);
  });

  it('tabela GLOBAL exige as 3 linhas (boleto especificado mesmo inerte)', () => {
    expect(validarTabelaTaxaPlataforma(TABELA)).toEqual([]);
    const semBoleto = { pix: TABELA.pix, cartao: TABELA.cartao };
    expect(validarTabelaTaxaPlataforma(semBoleto).length).toBeGreaterThan(0);
    expect(validarTabelaTaxaPlataforma({ ...TABELA, credit_card: TABELA.cartao }).length).toBeGreaterThan(0);
    expect(validarTabelaTaxaPlataforma(null).length).toBeGreaterThan(0);
  });

  it('override é PARCIAL: vazio ok, só uma linha ok, linha inválida/chave estranha não', () => {
    expect(validarTaxaTabelaOverride({})).toEqual([]);
    expect(validarTaxaTabelaOverride({ pix: { percentual: 5, fixoCentavos: 100 } })).toEqual([]);
    expect(validarTaxaTabelaOverride({ pix: { percentual: 5.001, fixoCentavos: 0 } }).length).toBeGreaterThan(0);
    expect(validarTaxaTabelaOverride({ credit_card: { percentual: 5, fixoCentavos: 0 } }).length).toBeGreaterThan(0);
  });

  it('enum de meios e mapa forma→meio (borda ADR-006)', () => {
    expect(isMeioTaxa('pix')).toBe(true);
    expect(isMeioTaxa('boleto')).toBe(true);
    expect(isMeioTaxa('credit_card')).toBe(false);
    expect(meioDaForma('cartao_credito')).toBe('cartao');
    expect(meioDaForma('pix')).toBe('pix');
  });
});

// ── Resolução — override > global > legado (RN-178/179) ────────────────────
describe('resolverTaxaMeio', () => {
  const OVERRIDE = { pix: { percentual: 5, fixoCentavos: 100 } };

  it('override do organizador vence a global (por LINHA de meio)', () => {
    expect(resolverTaxaMeio('pix', TABELA, OVERRIDE, 10.5)).toEqual({
      percentual: 5,
      fixoCentavos: 100,
      origem: 'override',
    });
  });

  it('linha ausente no override herda a GLOBAL', () => {
    expect(resolverTaxaMeio('cartao', TABELA, OVERRIDE, 10.5)).toEqual({
      percentual: 8,
      fixoCentavos: 150,
      origem: 'global',
    });
  });

  it('sem tabela nenhuma cai no platformFeePct LEGADO com fixo 0', () => {
    expect(resolverTaxaMeio('pix', null, undefined, 10.5)).toEqual({
      percentual: 10.5,
      fixoCentavos: 0,
      origem: 'legado',
    });
  });

  it('linha corrompida no override é IGNORADA — cai no nível seguinte', () => {
    const corrompido = { pix: { percentual: 5.0001, fixoCentavos: 0 } };
    expect(resolverTaxaMeio('pix', TABELA, corrompido as never, 10.5)).toEqual({
      percentual: 6,
      fixoCentavos: 200,
      origem: 'global',
    });
  });

  it('legado fora de 0–100 lança (termo corrompido nunca precifica)', () => {
    expect(() => resolverTaxaMeio('pix', null, null, 101)).toThrow(RangeError);
    expect(() => resolverTaxaMeio('pix', null, null, Number.NaN)).toThrow(RangeError);
  });
});

// ── Fix F7 (review antagonista) — carimbo com enums fechados no parse ──────
describe('parsePagamento.taxaCongelada — enums fechados (F7)', () => {
  const docBase = {
    tenantId: 't1', eventoId: 'e1', pedidoRef: 'p1',
    status: 'pendente', forma: 'pix',
    valorBase: 100, desconto: 0, valorFinal: 100,
    criadoEm: { seconds: 1, nanoseconds: 0, toDate: () => new Date(1000), toMillis: () => 1000 },
    atualizadoEm: { seconds: 1, nanoseconds: 0, toDate: () => new Date(1000), toMillis: () => 1000 },
  };
  const carimbo = { meio: 'pix', percentual: 6, fixoCentavos: 200, valor: 8, origem: 'global' };

  it('carimbo válido parseia com meio/origem tipados', async () => {
    const { parsePagamento } = await import('@leela/core');
    const p = parsePagamento('pg1', { ...docBase, taxaCongelada: carimbo });
    expect(p.taxaCongelada?.meio).toBe('pix');
    expect(p.taxaCongelada?.origem).toBe('global');
  });

  it('meio/origem fora do enum LANÇAM (doc de dinheiro nunca carrega lixo)', async () => {
    const { parsePagamento } = await import('@leela/core');
    expect(() =>
      parsePagamento('pg2', { ...docBase, taxaCongelada: { ...carimbo, meio: 'credit_card' } })
    ).toThrow(/fora do enum/);
    expect(() =>
      parsePagamento('pg3', { ...docBase, taxaCongelada: { ...carimbo, origem: 'plano' } })
    ).toThrow(/fora do enum/);
  });
});

// ── Integração com validateCommercialTerms (campo opcional taxaTabela) ─────
describe('commercialTerms.taxaTabela (RN-178 no termo)', () => {
  it('termo com override válido passa; inválido acusa', () => {
    expect(
      validateCommercialTerms({
        ...DEFAULT_COMMERCIAL_TERMS,
        taxaTabela: { pix: { percentual: 5, fixoCentavos: 100 } },
      })
    ).toEqual([]);
    expect(
      validateCommercialTerms({
        ...DEFAULT_COMMERCIAL_TERMS,
        taxaTabela: { pix: { percentual: 5.001, fixoCentavos: 100 } },
      }).length
    ).toBeGreaterThan(0);
  });
});
