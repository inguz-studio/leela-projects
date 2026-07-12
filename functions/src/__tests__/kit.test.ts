/**
 * kit.test.ts — LEELA-S205-T1
 *
 * Unit: tipos/derivações de Kit e ItemKit em @leela/core + computeUsadoEm
 * (índice inverso N:N — RN-215). Sem I/O.
 */

import { describe, expect, it } from 'vitest';
import {
  computeUsadoEm,
  exibirLogoCoerente,
  isOrigemItem,
  kitEhDesconto,
  KITS_INSCRITO,
  parseItemKit,
  parseKit,
  podeExibirLogo,
  precoKitValido,
} from '@leela/core';
import { ITEM_KIT_SEEDS, KIT_SEEDS, TAMANHOS_CAMISETA } from '../seed/kits.seed';

const fakeTs = { seconds: 1_770_000_000, nanoseconds: 0 };

describe('Kit — preço e desconto (RN-210/211)', () => {
  it('precoKitValido aceita positivo, zero e NEGATIVO (RN-211)', () => {
    expect(precoKitValido(89)).toBe(true);
    expect(precoKitValido(0)).toBe(true);
    expect(precoKitValido(-15)).toBe(true);
    expect(precoKitValido('15')).toBe(false);
    expect(precoKitValido(NaN)).toBe(false);
    expect(precoKitValido(Infinity)).toBe(false);
  });

  it('kitEhDesconto: "Sem kit" −15 é desconto; Kit Ouro +89 não', () => {
    expect(kitEhDesconto({ preco: -15 })).toBe(true);
    expect(kitEhDesconto({ preco: 89 })).toBe(false);
    expect(kitEhDesconto({ preco: 0 })).toBe(false);
  });

  it('parseKit aceita preço negativo e rejeita preço string', () => {
    const base = {
      tenantId: 'castelo-producoes', nome: 'Sem kit', preco: -15,
      capacidade: 60, modalidades: ['5k'], criadoEm: fakeTs, atualizadoEm: fakeTs,
    };
    expect(parseKit('sem-kit', base).preco).toBe(-15);
    expect(() => parseKit('x', { ...base, preco: '89' })).toThrow(/RN-211/);
    expect(() => parseKit('x', { ...base, nome: '' })).toThrow(/nome/);
  });
});

describe('ItemKit — origem e logo (RN-212/213/214)', () => {
  it('origem só organizador|patrocinador (RN-213)', () => {
    expect(isOrigemItem('organizador')).toBe(true);
    expect(isOrigemItem('patrocinador')).toBe(true);
    expect(isOrigemItem('loja')).toBe(false);
  });

  it('podeExibirLogo: só patrocinado tem toggle (RN-214)', () => {
    expect(podeExibirLogo({ origem: 'patrocinador' })).toBe(true);
    expect(podeExibirLogo({ origem: 'organizador' })).toBe(false);
  });

  it('exibirLogoCoerente: organizador com logo=true é INCOERENTE', () => {
    expect(exibirLogoCoerente({ origem: 'organizador', exibirLogo: false })).toBe(true);
    expect(exibirLogoCoerente({ origem: 'organizador', exibirLogo: true })).toBe(false);
    expect(exibirLogoCoerente({ origem: 'patrocinador', exibirLogo: true })).toBe(true);
    expect(exibirLogoCoerente({ origem: 'patrocinador', exibirLogo: false })).toBe(true);
  });

  it('parseItemKit valida shape e rejeita organizador com logo', () => {
    const base = {
      tenantId: 'castelo-producoes', eventoId: 'meia-floripa-2026',
      nome: 'Camiseta técnica Be Hero', tamanhado: true,
      origem: 'organizador', exibirLogo: false,
      kits: ['kit_prata', 'kit_basico'], criadoEm: fakeTs, atualizadoEm: fakeTs,
    };
    const item = parseItemKit('camiseta', base);
    expect(item.tamanhado).toBe(true);
    expect(item.kits).toEqual(['kit_prata', 'kit_basico']);

    expect(() =>
      parseItemKit('x', { ...base, exibirLogo: true })
    ).toThrow(/RN-214/);
    expect(() => parseItemKit('x', { ...base, origem: 'loja' })).toThrow(/RN-213/);
    expect(() => parseItemKit('x', { ...base, kits: 'kit_prata' })).toThrow(/RN-215/);
  });

  it('modeloEstoque/tamanhosDisponiveis (RN-225/223 · S210-T1): parse e defaults de legado', () => {
    const base = {
      tenantId: 'castelo-producoes', eventoId: 'meia-floripa-2026',
      nome: 'Camiseta técnica Be Hero', tamanhado: true,
      origem: 'organizador', exibirLogo: false,
      kits: ['kit_prata'], criadoEm: fakeTs, atualizadoEm: fakeTs,
    };
    // Doc legado (sem os campos): normaliza sob_encomenda + []
    const legado = parseItemKit('camiseta', base);
    expect(legado.modeloEstoque).toBe('sob_encomenda');
    expect(legado.tamanhosDisponiveis).toEqual([]);

    // Campos presentes: preservados
    const completo = parseItemKit('camiseta', {
      ...base, modeloEstoque: 'estoque_proprio', tamanhosDisponiveis: ['P', 'M', 'G', 'GG'],
    });
    expect(completo.modeloEstoque).toBe('estoque_proprio');
    expect(completo.tamanhosDisponiveis).toEqual(['P', 'M', 'G', 'GG']);

    // Fora do enum / shape inválido: fail-fast
    expect(() =>
      parseItemKit('x', { ...base, modeloEstoque: 'dropshipping' })
    ).toThrow(/RN-225/);
    expect(() =>
      parseItemKit('x', { ...base, tamanhosDisponiveis: ['P', ''] })
    ).toThrow(/RN-223/);
    // "__" é o separador de SKU (S210-T2) — tamanho com "__" quebra a chave
    expect(() =>
      parseItemKit('x', { ...base, tamanhosDisponiveis: ['P__G'] })
    ).toThrow(/RN-223/);
  });
});

describe('computeUsadoEm — índice inverso N:N (RN-215)', () => {
  const nomes = { 'kit-ouro': 'Kit Ouro', 'kit-prata': 'Kit Prata' };

  it('item em 2 kits lista "usado em" os 2 (aceite L1)', () => {
    const usadoEm = computeUsadoEm(['kit-ouro', 'kit-prata'], nomes);
    expect(usadoEm).toEqual([
      { kitId: 'kit-ouro', nome: 'Kit Ouro' },
      { kitId: 'kit-prata', nome: 'Kit Prata' },
    ]);
  });

  it('é idempotente/determinístico (mesma entrada → mesma saída)', () => {
    const a = computeUsadoEm(['kit-ouro', 'kit-prata'], nomes);
    const b = computeUsadoEm(['kit-ouro', 'kit-prata'], nomes);
    expect(a).toEqual(b);
  });

  it('kit deletado (sem nome no mapa) é omitido do índice', () => {
    const usadoEm = computeUsadoEm(['kit-ouro', 'kit-fantasma'], nomes);
    expect(usadoEm).toEqual([{ kitId: 'kit-ouro', nome: 'Kit Ouro' }]);
  });

  it('lista vazia de kits → índice vazio', () => {
    expect(computeUsadoEm([], nomes)).toEqual([]);
  });
});

describe('seed canônico de kits (protótipo Kits-Cadastro)', () => {
  it('4 kits, incluindo "Sem kit" com preço NEGATIVO (RN-210/211)', () => {
    expect(KIT_SEEDS).toHaveLength(4);
    const semKit = KIT_SEEDS.find((k) => k.id === 'sem_kit');
    expect(semKit?.preco).toBe(-15);
    expect(semKit?.nome).toBe('Sem kit');
  });

  it('CHAVE CANÔNICA Kit↔enum (FABLE-E-T1): Kit.id do seed É o enum KitInscrito', () => {
    // Regressão do bug latente de join: seed com hífen (kit-ouro) vs enum
    // underscore (kit_ouro) exigia a ponte kitCasa/kitDocId. O id canônico
    // agora É o valor do enum — o join `inscrito.kit === Kit.id` casa direto.
    expect(KIT_SEEDS.map((k) => k.id)).toEqual([...KITS_INSCRITO]);
  });

  it('nenhum kit usa a palavra "tier" (RN-216)', () => {
    for (const kit of KIT_SEEDS) {
      expect(kit.nome.toLowerCase()).not.toContain('tier');
      expect(kit.id.toLowerCase()).not.toContain('tier');
    }
  });

  it('6 itens: 1 tamanhado, 4 patrocinados, gel com logo OFF (RN-212/213/214)', () => {
    expect(ITEM_KIT_SEEDS).toHaveLength(6);
    expect(ITEM_KIT_SEEDS.filter((i) => i.tamanhado)).toHaveLength(1);
    const patrocinados = ITEM_KIT_SEEDS.filter((i) => i.origem === 'patrocinador');
    expect(patrocinados).toHaveLength(4);
    expect(patrocinados.map((i) => i.marca)).toEqual(
      expect.arrayContaining(['Olympikus', 'Growth Supplements', 'Centauro', 'Probiótica'])
    );
    const gel = ITEM_KIT_SEEDS.find((i) => i.id === 'gel-carboidrato');
    expect(gel?.exibirLogo).toBe(false);
  });

  it('itens do organizador nunca exibem logo (RN-214)', () => {
    for (const item of ITEM_KIT_SEEDS.filter((i) => i.origem === 'organizador')) {
      expect(item.exibirLogo).toBe(false);
    }
  });

  it('existe item em 2+ kits e todo kit referenciado existe (RN-215)', () => {
    expect(ITEM_KIT_SEEDS.some((i) => i.kits.length >= 2)).toBe(true);
    const kitIds = new Set(KIT_SEEDS.map((k) => k.id));
    for (const item of ITEM_KIT_SEEDS) {
      for (const ref of item.kits) {
        expect(kitIds.has(ref)).toBe(true);
      }
    }
  });

  it('estoque (S210-T1): item tamanhado carrega tamanhos; item único não', () => {
    for (const item of ITEM_KIT_SEEDS) {
      expect(['sob_encomenda', 'estoque_proprio']).toContain(item.modeloEstoque);
      if (item.tamanhado) {
        expect(item.tamanhosDisponiveis).toEqual(TAMANHOS_CAMISETA);
      } else {
        expect(item.tamanhosDisponiveis).toEqual([]);
      }
    }
  });
});
