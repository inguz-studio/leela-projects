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
import { validarTamanhosInscrito, type ItemKitParaTamanhos } from '@leela/core';

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

  it('separador de SKU "__" no tamanho/item → rejeita (round-trip S210-T2)', () => {
    for (const tamanhos of [
      { 'camiseta-tecnica': 'M__G' },
      { 'camiseta__tecnica': 'M' },
    ]) {
      const erros = validarTamanhosInscrito({
        tamanhos,
        kitId: 'kit_prata',
        itensDoEvento: ITENS,
      });
      expect(erros[0]).toMatch(/sem "__"/);
    }
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
