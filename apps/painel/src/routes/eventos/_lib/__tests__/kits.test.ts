import { describe, it, expect } from 'vitest';
import {
  formatPrecoKit,
  itemOrigemBadge,
  itemTipoBadge,
  resumoKits,
  usadoEmTexto,
} from '../kits';
import type { ItemKit, Kit } from '@leela/core';
import { ts } from '../../_test/fixtures';

function mkKit(over: Partial<Kit> = {}): Kit {
  return {
    id: 'k1',
    tenantId: 'castelo',
    nome: 'Kit Ouro',
    preco: 120,
    capacidade: 100,
    modalidades: ['21k'],
    criadoEm: ts(new Date()),
    atualizadoEm: ts(new Date()),
    ...over,
  };
}

function mkItem(over: Partial<ItemKit> = {}): ItemKit {
  return {
    id: 'i1',
    tenantId: 'castelo',
    eventoId: 'e1',
    nome: 'Camiseta',
    tamanhado: true,
    origem: 'organizador',
    exibirLogo: false,
    modeloEstoque: 'sob_encomenda',
    tamanhosDisponiveis: [],
    kits: [],
    criadoEm: ts(new Date()),
    atualizadoEm: ts(new Date()),
    ...over,
  };
}

const norm = (s: string): string => s.replace(/ /g, ' ');

describe('formatPrecoKit (RN-211/216)', () => {
  it('preço positivo formata em BRL', () => {
    expect(norm(formatPrecoKit(120))).toBe('R$ 120');
  });
  it('preço negativo vira "Desconto de …" (Sem kit)', () => {
    expect(norm(formatPrecoKit(-30))).toBe('Desconto de R$ 30');
  });
  it('zero é sem custo adicional', () => {
    expect(formatPrecoKit(0)).toBe('Sem custo adicional');
  });
});

describe('badges de item (RN-212/213)', () => {
  it('tamanhado x único', () => {
    expect(itemTipoBadge(true).label).toBe('Tamanhado');
    expect(itemTipoBadge(false).label).toBe('Único');
  });
  it('origem organizador x patrocinador', () => {
    expect(itemOrigemBadge('organizador').label).toBe('Organizador');
    expect(itemOrigemBadge('patrocinador').label).toBe('Patrocinador');
  });
});

describe('usadoEmTexto (RN-215)', () => {
  it('lista os kits que usam o item', () => {
    expect(usadoEmTexto({ usadoEm: [{ kitId: 'k1', nome: 'Kit Ouro' }, { kitId: 'k2', nome: 'Kit Prata' }] })).toBe(
      'Usado em: Kit Ouro, Kit Prata',
    );
  });
  it('vazio → ainda não usado', () => {
    expect(usadoEmTexto({})).toBe('Ainda não usado em nenhum kit');
  });
});

describe('resumoKits', () => {
  it('conta kits, itens e marcas ativadas (patrocinador + logo)', () => {
    const kits = [mkKit(), mkKit({ id: 'k2' })];
    const itens = [
      mkItem({ id: 'i1', origem: 'patrocinador', marca: 'Olympikus', exibirLogo: true }),
      mkItem({ id: 'i2', origem: 'patrocinador', marca: 'Growth', exibirLogo: false }),
      mkItem({ id: 'i3', origem: 'organizador' }),
    ];
    expect(resumoKits(kits, itens)).toEqual({ kits: 2, itens: 3, marcasAtivadas: 1 });
  });
});
