import { describe, it, expect } from 'vitest';
import { contarPorEstado, filtrarFila, tenantsNaFila } from '../fila';
import { mkFilaItem } from '../../_test/fixtures';

const itens = [
  mkFilaItem({ id: 'a', tenantId: 't1', estado: 'solicitado' }, 'Zebra Sports'),
  mkFilaItem({ id: 'b', tenantId: 't1', estado: 'aprovado' }, 'Zebra Sports'),
  mkFilaItem({ id: 'c', tenantId: 't2', estado: 'solicitado' }, 'Alfa Runs'),
];

describe('filtrarFila', () => {
  it('todos + todos → não filtra nada', () => {
    expect(filtrarFila(itens, 'todos', 'todos')).toHaveLength(3);
  });

  it('filtra por estado', () => {
    const so = filtrarFila(itens, 'solicitado', 'todos');
    expect(so.map((i) => i.repasse.id)).toEqual(['a', 'c']);
  });

  it('filtra por tenant', () => {
    const t1 = filtrarFila(itens, 'todos', 't1');
    expect(t1.map((i) => i.repasse.id)).toEqual(['a', 'b']);
  });

  it('combina estado + tenant', () => {
    const combo = filtrarFila(itens, 'aprovado', 't1');
    expect(combo.map((i) => i.repasse.id)).toEqual(['b']);
  });
});

describe('contarPorEstado', () => {
  it('conta todos/solicitado/aprovado sobre a fila completa', () => {
    expect(contarPorEstado(itens)).toEqual({ todos: 3, solicitado: 2, aprovado: 1 });
  });

  it('fila vazia → zeros', () => {
    expect(contarPorEstado([])).toEqual({ todos: 0, solicitado: 0, aprovado: 0 });
  });
});

describe('tenantsNaFila', () => {
  it('lista tenants distintos ordenados por nome (pt-BR)', () => {
    expect(tenantsNaFila(itens)).toEqual([
      { id: 't2', nome: 'Alfa Runs' },
      { id: 't1', nome: 'Zebra Sports' },
    ]);
  });

  it('não repete tenant e não inventa opção quando fila vazia', () => {
    expect(tenantsNaFila([])).toEqual([]);
  });
});
