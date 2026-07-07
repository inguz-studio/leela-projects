import { describe, it, expect } from 'vitest';
import type { TenantRollup } from '@leela/core';
import { sortTenantsByGmvDesc } from '../sort';

const mk = (nome: string, gmv: number): TenantRollup => ({
  tenantId: nome,
  nome,
  status: 'ativo',
  gmv,
  receitaLeela: 0,
  platformFeePct: null,
  eventosAtivos: 0,
  health: 'saudavel',
});

describe('sortTenantsByGmvDesc', () => {
  it('ordena por GMV decrescente (maior primeiro)', () => {
    const out = sortTenantsByGmvDesc([mk('B', 100), mk('A', 900), mk('C', 500)]);
    expect(out.map((t) => t.nome)).toEqual(['A', 'C', 'B']);
  });

  it('empate de GMV → desempata por nome (determinístico)', () => {
    const out = sortTenantsByGmvDesc([mk('Zebra', 100), mk('Alpha', 100)]);
    expect(out.map((t) => t.nome)).toEqual(['Alpha', 'Zebra']);
  });

  it('não muta a lista de entrada', () => {
    const input = [mk('B', 1), mk('A', 2)];
    const snapshot = input.map((t) => t.nome);
    sortTenantsByGmvDesc(input);
    expect(input.map((t) => t.nome)).toEqual(snapshot);
  });

  it('lista vazia → vazia', () => {
    expect(sortTenantsByGmvDesc([])).toEqual([]);
  });
});
