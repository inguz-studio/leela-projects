import { describe, it, expect } from 'vitest';
import { filterTenants, TENANT_FILTERS } from '../filter';
import type { Tenant } from '@leela/core';

const mk = (id: string, status: Tenant['status']): Tenant =>
  ({
    id,
    nome: id,
    slug: id,
    status,
    ownerUid: `uid-${id}`,
    tipo: 'produtor',
    criadoEm: null as never,
    atualizadoEm: null as never,
  }) as Tenant;

const tenants: Tenant[] = [
  mk('passo-certo', 'pending'),
  mk('castelo', 'ativo'),
  mk('arena', 'ativo'),
  mk('velha', 'suspenso'),
];

describe('filterTenants', () => {
  it("'todos' devolve tudo", () => {
    expect(filterTenants(tenants, 'todos')).toHaveLength(4);
  });
  it("'pending' devolve só o Passo Certo", () => {
    const r = filterTenants(tenants, 'pending');
    expect(r).toHaveLength(1);
    expect(r[0]?.id).toBe('passo-certo');
  });
  it("'ativo' devolve os dois ativos", () => {
    expect(filterTenants(tenants, 'ativo').map((t) => t.id)).toEqual(['castelo', 'arena']);
  });
  it('filtro sem match devolve lista vazia', () => {
    expect(filterTenants([mk('a', 'ativo')], 'suspenso')).toHaveLength(0);
  });
});

describe('TENANT_FILTERS', () => {
  it('ordena Todos, Aguardando, Ativos, Suspensos', () => {
    expect(TENANT_FILTERS.map((f) => f.id)).toEqual(['todos', 'pending', 'ativo', 'suspenso']);
  });
});
