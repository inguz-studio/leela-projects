import { describe, it, expect } from 'vitest';
import {
  distribuicaoPorKit,
  distribuicaoPorModalidade,
  estoquePorKit,
  pct,
} from '../distribuicao';
import type { Kit } from '@leela/core';
import { mkInscrito, ts } from '../../_test/fixtures';

const AGORA = ts(new Date('2026-04-27T09:00:00Z'));

function mkKit(over: Partial<Kit>): Kit {
  return {
    id: 'kit_ouro',
    tenantId: 'castelo',
    nome: 'Kit Ouro',
    preco: 120,
    capacidade: 100,
    modalidades: ['21k'],
    itens: [],
    criadoEm: ts(new Date()),
    atualizadoEm: ts(new Date()),
    ...over,
  };
}

const pool = [
  mkInscrito({ id: '1', kit: 'kit_ouro', modalidade: '21k', status: 'confirmado', checkinEm: AGORA }),
  mkInscrito({ id: '2', kit: 'kit_ouro', modalidade: '21k', status: 'confirmado' }),
  mkInscrito({ id: '3', kit: 'kit_prata', modalidade: '10k', status: 'confirmado', checkinEm: AGORA }),
  mkInscrito({ id: '4', kit: 'kit_ouro', modalidade: '21k', status: 'cancelado' }),
];

describe('pct', () => {
  it('arredonda e trata total zero', () => {
    expect(pct(1, 2)).toBe(50);
    expect(pct(0, 0)).toBe(0);
  });
});

describe('distribuicaoPorKit', () => {
  it('conta retiradas por kit só entre confirmados', () => {
    const r = distribuicaoPorKit(pool);
    const ouro = r.find((k) => k.kit === 'kit_ouro')!;
    expect(ouro).toMatchObject({ total: 2, retirados: 1, pct: 50 });
    const prata = r.find((k) => k.kit === 'kit_prata')!;
    expect(prata).toMatchObject({ total: 1, retirados: 1, pct: 100 });
  });
});

describe('distribuicaoPorModalidade', () => {
  it('conta retiradas por modalidade configurada', () => {
    const r = distribuicaoPorModalidade(pool, ['21k', '10k']);
    expect(r.find((m) => m.modalidade === '21k')).toMatchObject({ total: 2, retirados: 1 });
    expect(r.find((m) => m.modalidade === '10k')).toMatchObject({ total: 1, retirados: 1 });
  });
});

describe('estoquePorKit', () => {
  it('saldo = capacidade − retirados; capacidade 0 → null (degradação)', () => {
    const kits = [mkKit({ id: 'kit_ouro', capacidade: 2 }), mkKit({ id: 'kit_prata', nome: 'Kit Prata', capacidade: 0 })];
    const r = estoquePorKit(kits, pool);
    expect(r[0]).toMatchObject({ id: 'kit_ouro', capacidade: 2, retirados: 1, saldo: 1, esgotado: false });
    expect(r[1]).toMatchObject({ id: 'kit_prata', capacidade: null, saldo: null, esgotado: false });
  });

  it('esgotado quando saldo <= 0', () => {
    const kits = [mkKit({ id: 'kit_ouro', capacidade: 1 })];
    const r = estoquePorKit(kits, pool);
    expect(r[0]!.esgotado).toBe(true);
  });
});
