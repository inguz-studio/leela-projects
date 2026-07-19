/**
 * aprovisionamentoCore.test.ts — LEELA-S210-T2/T3 (FABLE-D)
 *
 * Unit: domínio puro do aprovisionamento por SKU em @leela/core (chave de
 * SKU, máquina de estados RN-226, derivações RN-224, alertas e parse
 * defensivo) + validação pura do input da callable. Sem I/O.
 */

import { describe, expect, it } from 'vitest';
import {
  alertaAprovisionamento,
  computeAEncomendar,
  ESTADOS_APROVISIONAMENTO,
  isEstadoAprovisionamento,
  LIMIAR_BAIXA_SKU_DEFAULT,
  parseAprovisionamento,
  parseSkuId,
  parseSufixoTamanho,
  podeTransicionarAprovisionamento,
  qtdEstoqueValida,
  saldoFisicoSku,
  skuId,
  skusDeclaradosDoItem,
  sufixoSku,
  TRANSICOES_APROVISIONAMENTO,
} from '@leela/core';
import {
  validarEncerrarEncomendasItemInput,
  validarTransicaoAprovisionamentoInput,
} from '../eventos/agregarEstoque';

const fakeTs = { seconds: 1_770_000_000, nanoseconds: 0 };

describe('skuId / parseSkuId (S210-T2 · RN-231 — itemId__[corte__]tamanho)', () => {
  it('round-trip exato — unissex/legado usa a chave de 2 segmentos', () => {
    expect(skuId('camiseta-tecnica', 'M')).toBe('camiseta-tecnica__M');
    expect(skuId('camiseta-tecnica', 'M', 'unissex')).toBe('camiseta-tecnica__M');
    expect(parseSkuId('camiseta-tecnica__M')).toEqual({
      itemId: 'camiseta-tecnica',
      corte: 'unissex',
      tamanho: 'M',
    });
  });

  it('round-trip exato — corte feminina/masculina usa 3 segmentos', () => {
    expect(skuId('camiseta-tecnica', 'M', 'feminina')).toBe(
      'camiseta-tecnica__feminina__M'
    );
    expect(parseSkuId('camiseta-tecnica__masculina__GG')).toEqual({
      itemId: 'camiseta-tecnica',
      corte: 'masculina',
      tamanho: 'GG',
    });
    // parse(skuId(x)) ≡ x para os três cortes
    for (const corte of ['feminina', 'masculina', 'unissex'] as const) {
      const sku = skuId('item-a', 'P', corte);
      expect(parseSkuId(sku)).toEqual({ itemId: 'item-a', corte, tamanho: 'P' });
      expect(skuId('item-a', 'P', parseSkuId(sku).corte)).toBe(sku);
    }
  });

  it('rejeita chave ambígua/malformada (fail-fast)', () => {
    expect(() => skuId('', 'M')).toThrow(/itemId/);
    expect(() => skuId('item__x', 'M')).toThrow(/itemId/);
    expect(() => skuId('camiseta', '')).toThrow(/tamanho/);
    expect(() => skuId('camiseta', 'P__G')).toThrow(/tamanho/);
    expect(() => skuId('camiseta', 'M', 'juvenil' as never)).toThrow(/RN-231/);
    expect(() => parseSkuId('sem-separador')).toThrow(/S210-T2/);
    // segmento do meio fora do enum de corte = malformada, não "tamanho b__c"
    expect(() => parseSkuId('a__b__c')).toThrow(/S210-T2/);
    expect(() => parseSkuId('__M')).toThrow(/S210-T2/);
    expect(() => parseSkuId('a__masculina__')).toThrow(/S210-T2/);
    expect(() => parseSkuId('a__masculina__M__G')).toThrow(/S210-T2/);
    // `unissex` explícito NUNCA é chave canônica (chave única por SKU)
    expect(() => parseSkuId('a__unissex__M')).toThrow(/S210-T2/);
  });
});

describe('sufixoSku / parseSufixoTamanho (RN-231 — valor de inscrito.tamanhos)', () => {
  it('unissex é o sufixo bare; corte prefixa com __', () => {
    expect(sufixoSku('unissex', 'M')).toBe('M');
    expect(sufixoSku('feminina', 'M')).toBe('feminina__M');
    expect(parseSufixoTamanho('M')).toEqual({ corte: 'unissex', tamanho: 'M' });
    expect(parseSufixoTamanho('masculina__G')).toEqual({
      corte: 'masculina',
      tamanho: 'G',
    });
  });

  it('sufixo malformado → null (corte forjado, unissex explícito, vazios)', () => {
    expect(parseSufixoTamanho('')).toBeNull();
    expect(parseSufixoTamanho('juvenil__M')).toBeNull();
    expect(parseSufixoTamanho('unissex__M')).toBeNull();
    expect(parseSufixoTamanho('masculina__')).toBeNull();
    expect(parseSufixoTamanho('a__b__c')).toBeNull();
  });
});

describe('skusDeclaradosDoItem (item tamanhado × grade efetiva — S210-T3/RN-231)', () => {
  it('item tamanhado LEGADO gera um SKU por tamanho (duplicata colapsa)', () => {
    expect(
      skusDeclaradosDoItem({
        id: 'camiseta-tecnica',
        tamanhado: true,
        tamanhosDisponiveis: ['P', 'M', 'M'],
      })
    ).toEqual(['camiseta-tecnica__P', 'camiseta-tecnica__M']);
  });

  it('grade por corte gera SKU 3-segmentos; unissex na grade mantém chave legada', () => {
    expect(
      skusDeclaradosDoItem({
        id: 'camiseta-tecnica',
        tamanhado: true,
        tamanhosDisponiveis: ['P', 'M'], // legado IGNORADO quando há grade
        grade: [
          { corte: 'feminina', tamanhos: ['P', 'M'] },
          { corte: 'masculina', tamanhos: ['M'] },
          { corte: 'unissex', tamanhos: ['G'] },
        ],
      })
    ).toEqual([
      'camiseta-tecnica__feminina__P',
      'camiseta-tecnica__feminina__M',
      'camiseta-tecnica__masculina__M',
      'camiseta-tecnica__G',
    ]);
  });

  it('item único (não tamanhado) NÃO gera SKU — aprovisionamento por tamanho', () => {
    expect(
      skusDeclaradosDoItem({
        id: 'sacochila',
        tamanhado: false,
        tamanhosDisponiveis: ['P'], // mesmo com lixo declarado
      })
    ).toEqual([]);
  });
});

describe('máquina de estados (RN-226) — linear, sem regressão', () => {
  it('estimativa → encomendado → em_estoque; em_estoque terminal', () => {
    expect(podeTransicionarAprovisionamento('estimativa', 'encomendado')).toBe(true);
    expect(podeTransicionarAprovisionamento('encomendado', 'em_estoque')).toBe(true);
    // Sem atalho, sem volta, sem replay
    expect(podeTransicionarAprovisionamento('estimativa', 'em_estoque')).toBe(false);
    expect(podeTransicionarAprovisionamento('encomendado', 'estimativa')).toBe(false);
    expect(podeTransicionarAprovisionamento('em_estoque', 'encomendado')).toBe(false);
    expect(podeTransicionarAprovisionamento('em_estoque', 'em_estoque')).toBe(false);
  });

  it('matriz cobre todos os estados canônicos', () => {
    expect(Object.keys(TRANSICOES_APROVISIONAMENTO).sort()).toEqual(
      [...ESTADOS_APROVISIONAMENTO].sort()
    );
    expect(isEstadoAprovisionamento('em_estoque')).toBe(true);
    expect(isEstadoAprovisionamento('entregue')).toBe(false);
  });
});

describe('derivações RN-224 + alertas', () => {
  it('aEncomendar = max(0, vendido − estoque)', () => {
    expect(computeAEncomendar(120, 0)).toBe(120);
    expect(computeAEncomendar(120, 50)).toBe(70);
    expect(computeAEncomendar(50, 120)).toBe(0); // nunca negativo
  });

  it('saldoFisicoSku = estoque − vendido', () => {
    expect(saldoFisicoSku({ estoqueFisico: 100, qtdVendida: 90 })).toBe(10);
    expect(saldoFisicoSku({ estoqueFisico: 0, qtdVendida: 5 })).toBe(-5);
  });

  it('alerta SÓ com estoque declarado (em_estoque) — antes disso null', () => {
    // sob_encomenda vende sem estoque por definição (RN-225): sem alerta
    expect(
      alertaAprovisionamento({ estado: 'estimativa', estoqueFisico: 0, qtdVendida: 99 })
    ).toBeNull();
    expect(
      alertaAprovisionamento({ estado: 'encomendado', estoqueFisico: 0, qtdVendida: 99 })
    ).toBeNull();
  });

  it('em_estoque: esgotado (saldo ≤ 0), baixa (0 < saldo ≤ limiar), null (folga)', () => {
    expect(
      alertaAprovisionamento({ estado: 'em_estoque', estoqueFisico: 90, qtdVendida: 90 })
    ).toBe('esgotado');
    expect(
      alertaAprovisionamento({ estado: 'em_estoque', estoqueFisico: 80, qtdVendida: 90 })
    ).toBe('esgotado');
    expect(
      alertaAprovisionamento({
        estado: 'em_estoque',
        estoqueFisico: 90 + LIMIAR_BAIXA_SKU_DEFAULT,
        qtdVendida: 90,
      })
    ).toBe('baixa');
    expect(
      alertaAprovisionamento({
        estado: 'em_estoque',
        estoqueFisico: 91 + LIMIAR_BAIXA_SKU_DEFAULT,
        qtdVendida: 90,
      })
    ).toBeNull();
    // limiar é PARÂMETRO (default não é regra congelada)
    expect(
      alertaAprovisionamento(
        { estado: 'em_estoque', estoqueFisico: 92, qtdVendida: 90 },
        1
      )
    ).toBeNull();
  });
});

describe('parseAprovisionamento — fail-fast (integridade de movimentação)', () => {
  const base = {
    tenantId: 'castelo-producoes',
    itemId: 'camiseta-tecnica',
    tamanho: 'M',
    estado: 'estimativa',
    qtdVendida: 90,
    estoqueFisico: 0,
    aEncomendar: 90,
    alerta: null,
    historico: [],
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
  };
  const ID = 'camiseta-tecnica__M';

  it('doc válido parseia com chave decomposta', () => {
    const a = parseAprovisionamento(ID, base);
    expect(a.itemId).toBe('camiseta-tecnica');
    expect(a.tamanho).toBe('M');
    expect(a.aEncomendar).toBe(90);
  });

  it('historico com transições válidas parseia', () => {
    const a = parseAprovisionamento(ID, {
      ...base,
      estado: 'em_estoque',
      estoqueFisico: 120,
      aEncomendar: 0,
      historico: [
        { estado: 'encomendado', qtd: 120, em: fakeTs },
        { estado: 'em_estoque', qtd: 120, em: fakeTs },
      ],
    });
    expect(a.historico).toHaveLength(2);
    expect(a.historico[1]?.estado).toBe('em_estoque');
  });

  it('rejeita ∑ incoerente com RN-224 (escrita fora da Function)', () => {
    expect(() =>
      parseAprovisionamento(ID, { ...base, aEncomendar: 42 })
    ).toThrow(/RN-224/);
  });

  it('rejeita chave↔campos incoerentes, enum inválido e quantidades não-inteiras', () => {
    expect(() =>
      parseAprovisionamento(ID, { ...base, tamanho: 'G' })
    ).toThrow(/docId/);
    expect(() =>
      parseAprovisionamento(ID, { ...base, estado: 'despachado' })
    ).toThrow(/RN-226/);
    expect(() =>
      parseAprovisionamento(ID, { ...base, qtdVendida: 1.5, aEncomendar: 1.5 })
    ).toThrow(/qtdVendida/);
    expect(() =>
      parseAprovisionamento(ID, { ...base, alerta: 'critico' })
    ).toThrow(/alerta/);
    expect(() =>
      parseAprovisionamento(ID, {
        ...base,
        historico: [{ estado: 'estimativa', qtd: -1, em: fakeTs }],
      })
    ).toThrow(/historico\[0\]/);
  });

  it('doc LEGADO (2 segmentos, sem campo corte) parseia como unissex — retrocompat', () => {
    const a = parseAprovisionamento(ID, base); // base não tem `corte`
    expect(a.corte).toBe('unissex');
  });

  it('doc de SKU com corte (3 segmentos) parseia; corte incoerente rejeita', () => {
    const idF = 'camiseta-tecnica__feminina__M';
    const docF = { ...base, corte: 'feminina' };
    const a = parseAprovisionamento(idF, docF);
    expect(a.corte).toBe('feminina');
    expect(a.tamanho).toBe('M');
    expect(() =>
      parseAprovisionamento(idF, { ...base, corte: 'masculina' })
    ).toThrow(/RN-231/);
    expect(() =>
      parseAprovisionamento(ID, { ...base, corte: 'feminina' })
    ).toThrow(/RN-231/);
  });

  it('qtdEstoqueValida: inteiro ≥ 0', () => {
    expect(qtdEstoqueValida(0)).toBe(true);
    expect(qtdEstoqueValida(120)).toBe(true);
    expect(qtdEstoqueValida(-1)).toBe(false);
    expect(qtdEstoqueValida(1.5)).toBe(false);
    expect(qtdEstoqueValida('10')).toBe(false);
  });
});

describe('validarTransicaoAprovisionamentoInput (callable — validação pura)', () => {
  const valido = {
    eventoId: 'meia-floripa-2026',
    sku: 'camiseta-tecnica__M',
    novoEstado: 'encomendado',
    qtd: 120,
  };

  it('input válido → sem erros', () => {
    expect(validarTransicaoAprovisionamentoInput(valido)).toEqual([]);
  });

  it('rejeita input ausente, sku malformado, estado fora do enum e qtd inválida', () => {
    expect(validarTransicaoAprovisionamentoInput(null)).toHaveLength(1);
    expect(
      validarTransicaoAprovisionamentoInput({ ...valido, sku: 'sem-separador' })
    ).toEqual([expect.stringContaining('S210-T2')]);
    expect(
      validarTransicaoAprovisionamentoInput({ ...valido, novoEstado: 'entregue' })
    ).toEqual([expect.stringContaining('RN-226')]);
    expect(
      validarTransicaoAprovisionamentoInput({ ...valido, qtd: -3 })
    ).toEqual([expect.stringContaining('qtd')]);
    expect(
      validarTransicaoAprovisionamentoInput({ ...valido, qtd: 2.5 })
    ).toEqual([expect.stringContaining('qtd')]);
  });

  it('aceita sku de grade por corte (3 segmentos — RN-231)', () => {
    expect(
      validarTransicaoAprovisionamentoInput({
        ...valido,
        sku: 'camiseta-tecnica__feminina__M',
      })
    ).toEqual([]);
  });
});

describe('validarEncerrarEncomendasItemInput (RN-232 — validação pura)', () => {
  it('input válido → sem erros; ausências e itemId com __ rejeitados', () => {
    expect(
      validarEncerrarEncomendasItemInput({
        eventoId: 'meia-floripa-2026',
        itemId: 'camiseta-tecnica',
      })
    ).toEqual([]);
    expect(validarEncerrarEncomendasItemInput(null)).toHaveLength(1);
    expect(
      validarEncerrarEncomendasItemInput({ eventoId: '', itemId: 'x' })
    ).toEqual([expect.stringContaining('eventoId')]);
    expect(
      validarEncerrarEncomendasItemInput({
        eventoId: 'e1',
        itemId: 'a__b',
      })
    ).toEqual([expect.stringContaining('itemId')]);
  });
});
