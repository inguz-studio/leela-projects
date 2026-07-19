/**
 * validarTamanhos.test.ts — LEELA-BEPEND-T4 (S209-T2 · RN-223/212 ·
 * ratificação 3d "validação de tamanho na origem")
 *
 * Domínio PURO (@leela/core) — sem Emulator. Postura antagonista: cada caso
 * de forja (item fantasma, item de outro kit, item não tamanhado, tamanho
 * fora do catálogo, separador de SKU no valor) precisa ser REJEITADO; o
 * caminho honesto (tamanho ∈ tamanhosDisponiveis do item do kit) passa.
 */
import { describe, expect, it } from 'vitest';
import {
  TAMANHOS_MAX_ENTRADAS,
  validarTamanhosInscrito,
  type ItemKitParaTamanhos,
} from '@leela/core';

const CAMISETA: ItemKitParaTamanhos = {
  id: 'camiseta-tecnica',
  tamanhado: true,
  tamanhosDisponiveis: ['P', 'M', 'G', 'GG'],
  kits: ['kit_prata', 'kit_ouro'],
};
const SACOCHILA: ItemKitParaTamanhos = {
  id: 'sacochila',
  tamanhado: false,
  tamanhosDisponiveis: [],
  kits: ['kit_ouro'],
};
const ITENS = [CAMISETA, SACOCHILA];

describe('validarTamanhosInscrito — caminho honesto', () => {
  it('tamanho válido do item do kit escolhido → sem erros', () => {
    expect(
      validarTamanhosInscrito({
        tamanhos: { 'camiseta-tecnica': 'M' },
        kitId: 'kit_prata',
        itensDoEvento: ITENS,
      })
    ).toEqual([]);
  });

  it('map vazio (kit sem item tamanhado / UI ainda não coleta) → sem erros', () => {
    expect(
      validarTamanhosInscrito({ tamanhos: {}, kitId: 'kit_prata', itensDoEvento: ITENS })
    ).toEqual([]);
    expect(
      validarTamanhosInscrito({ tamanhos: {}, kitId: undefined, itensDoEvento: ITENS })
    ).toEqual([]);
  });
});

describe('validarTamanhosInscrito — forjas (fail-closed)', () => {
  it('tamanho FORA de tamanhosDisponiveis → rejeita (o vetor FABLE-D morre na origem)', () => {
    const erros = validarTamanhosInscrito({
      tamanhos: { 'camiseta-tecnica': 'XGG-FORJADO' },
      kitId: 'kit_prata',
      itensDoEvento: ITENS,
    });
    expect(erros).toHaveLength(1);
    expect(erros[0]).toMatch(/fora dos disponíveis/);
  });

  it('item que NÃO existe no evento → rejeita', () => {
    const erros = validarTamanhosInscrito({
      tamanhos: { 'item-fantasma': 'M' },
      kitId: 'kit_prata',
      itensDoEvento: ITENS,
    });
    expect(erros[0]).toMatch(/não existe no evento/);
  });

  it('item de OUTRO kit (sacochila é só do ouro) → rejeita', () => {
    const erros = validarTamanhosInscrito({
      tamanhos: { sacochila: 'M' },
      kitId: 'kit_prata',
      itensDoEvento: ITENS,
    });
    expect(erros[0]).toMatch(/não pertence ao kit/);
  });

  it('item NÃO tamanhado com tamanho → rejeita (RN-212)', () => {
    const erros = validarTamanhosInscrito({
      tamanhos: { sacochila: 'M' },
      kitId: 'kit_ouro',
      itensDoEvento: ITENS,
    });
    expect(erros[0]).toMatch(/não é tamanhado/);
  });

  it('tamanho SEM kit escolhido → rejeita (payload incoerente)', () => {
    const erros = validarTamanhosInscrito({
      tamanhos: { 'camiseta-tecnica': 'M' },
      kitId: undefined,
      itensDoEvento: ITENS,
    });
    expect(erros[0]).toMatch(/sem kit escolhido/);
  });

  it('separador de SKU "__" no itemId → rejeita (round-trip S210-T2)', () => {
    const erros = validarTamanhosInscrito({
      tamanhos: { 'camiseta__tecnica': 'M' },
      kitId: 'kit_prata',
      itensDoEvento: ITENS,
    });
    expect(erros[0]).toMatch(/sem "__"/);
  });

  it('sufixo malformado no valor → rejeita (RN-231: "M__G" não é corte__tamanho)', () => {
    for (const valor of ['M__G', 'unissex__M', 'feminina__', 'a__b__c', '']) {
      const erros = validarTamanhosInscrito({
        tamanhos: { 'camiseta-tecnica': valor },
        kitId: 'kit_prata',
        itensDoEvento: ITENS,
      });
      expect(erros[0]).toMatch(/fora do padrão/);
    }
  });

  it('map acima do teto sanitário → rejeita cedo + eco de chave forjada é TRUNCADO (review T4)', () => {
    const gigante: Record<string, string> = {};
    for (let n = 0; n <= TAMANHOS_MAX_ENTRADAS; n += 1) gigante[`item-${n}`] = 'M';
    const errosCap = validarTamanhosInscrito({
      tamanhos: gigante,
      kitId: 'kit_prata',
      itensDoEvento: ITENS,
    });
    expect(errosCap).toHaveLength(1);
    expect(errosCap[0]).toMatch(/excede/);

    const chaveGigante = 'x'.repeat(500);
    const errosEco = validarTamanhosInscrito({
      tamanhos: { [chaveGigante]: 'M' },
      kitId: 'kit_prata',
      itensDoEvento: ITENS,
    });
    expect(errosEco[0]!.length).toBeLessThan(200); // eco truncado, nunca 500 chars de volta
  });

  it('múltiplas forjas → um erro POR item (nada é engolido)', () => {
    const erros = validarTamanhosInscrito({
      tamanhos: { 'camiseta-tecnica': 'XXL', 'item-fantasma': 'M' },
      kitId: 'kit_prata',
      itensDoEvento: ITENS,
    });
    expect(erros).toHaveLength(2);
  });
});

describe('validarTamanhosInscrito — exigirTamanhado (flip S209-T3)', () => {
  it('true: item tamanhado do kit SEM tamanho → erro de obrigatoriedade', () => {
    const erros = validarTamanhosInscrito({
      tamanhos: {},
      kitId: 'kit_prata',
      itensDoEvento: ITENS,
      exigirTamanhado: true,
    });
    expect(erros).toHaveLength(1);
    expect(erros[0]).toMatch(/obrigatório/);
  });

  it('true + tamanho presente → sem erros; false (default) tolera ausência', () => {
    expect(
      validarTamanhosInscrito({
        tamanhos: { 'camiseta-tecnica': 'G' },
        kitId: 'kit_prata',
        itensDoEvento: ITENS,
        exigirTamanhado: true,
      })
    ).toEqual([]);
    expect(
      validarTamanhosInscrito({
        tamanhos: {},
        kitId: 'kit_prata',
        itensDoEvento: ITENS,
      })
    ).toEqual([]);
  });
});

describe('validarTamanhosInscrito — grade por corte (RN-231 · TAMANHOS-GRADE)', () => {
  const CAMISETA_GRADE: ItemKitParaTamanhos = {
    id: 'camiseta-corte',
    tamanhado: true,
    tamanhosDisponiveis: ['P', 'M', 'G'], // união (superfície legada) — validação lê a grade
    grade: [
      { corte: 'feminina', tamanhos: ['P', 'M'] },
      { corte: 'masculina', tamanhos: ['M', 'G'] },
    ],
    kits: ['kit_prata'],
  };
  const ITENS_GRADE = [CAMISETA_GRADE, SACOCHILA];

  it('caminho honesto: corte__tamanho da grade → sem erros', () => {
    expect(
      validarTamanhosInscrito({
        tamanhos: { 'camiseta-corte': 'feminina__M' },
        kitId: 'kit_prata',
        itensDoEvento: ITENS_GRADE,
      })
    ).toEqual([]);
  });

  it('tamanho fora do CORTE (G existe só na masculina) → rejeita', () => {
    const erros = validarTamanhosInscrito({
      tamanhos: { 'camiseta-corte': 'feminina__G' },
      kitId: 'kit_prata',
      itensDoEvento: ITENS_GRADE,
    });
    expect(erros).toHaveLength(1);
    expect(erros[0]).toMatch(/fora dos disponíveis do corte feminina/);
  });

  it('sufixo bare (unissex) em item com grade SÓ por corte → rejeita (corte fora da grade)', () => {
    const erros = validarTamanhosInscrito({
      tamanhos: { 'camiseta-corte': 'M' },
      kitId: 'kit_prata',
      itensDoEvento: ITENS_GRADE,
    });
    expect(erros).toHaveLength(1);
    expect(erros[0]).toMatch(/corte 'unissex' fora da grade/);
  });

  it('item legado SEM grade rejeita corte explícito (grade efetiva é só unissex)', () => {
    const erros = validarTamanhosInscrito({
      tamanhos: { 'camiseta-tecnica': 'feminina__M' },
      kitId: 'kit_prata',
      itensDoEvento: ITENS,
    });
    expect(erros).toHaveLength(1);
    expect(erros[0]).toMatch(/corte 'feminina' fora da grade/);
  });

  it('exigirTamanhado cobra item com grade mas sem tamanhosDisponiveis legado', () => {
    const soGrade: ItemKitParaTamanhos = {
      id: 'regata-corte',
      tamanhado: true,
      tamanhosDisponiveis: [],
      grade: [{ corte: 'feminina', tamanhos: ['U'] }],
      kits: ['kit_prata'],
    };
    const erros = validarTamanhosInscrito({
      tamanhos: {},
      kitId: 'kit_prata',
      itensDoEvento: [soGrade],
      exigirTamanhado: true,
    });
    expect(erros).toHaveLength(1);
    expect(erros[0]).toMatch(/obrigatório/);
  });
});
