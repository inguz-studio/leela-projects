// =============================================================================
// Puros das listas globais (ADMIN-VISAO onda 4 · S1614-T2/T3). O caso que
// importa é o do CONTADOR: enquanto houver próxima página, nenhum rótulo pode
// sugerir total do sistema.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  FILTROS_STATUS_EVENTO,
  TENANT_TODOS,
  nomeDoTenant,
  opcoesDeTenant,
  rotuloContagem,
  statusDoFiltro,
} from '../listasGlobais';
import { mkTenant } from '../../_test/fixtures';

const EVENTOS = { singular: 'evento', plural: 'eventos' };
const tenant = mkTenant;

describe('statusDoFiltro', () => {
  it('`todos` vira undefined (sem where) e os demais passam direto', () => {
    expect(statusDoFiltro('todos')).toBeUndefined();
    expect(statusDoFiltro('publicado')).toBe('publicado');
    expect(statusDoFiltro('ao_vivo')).toBe('ao_vivo');
  });

  it('a lista de filtros cobre os quatro status do ciclo de vida + todos', () => {
    expect(FILTROS_STATUS_EVENTO.map((f) => f.id)).toEqual([
      'todos',
      'rascunho',
      'publicado',
      'ao_vivo',
      'encerrado',
    ]);
  });
});

describe('rotuloContagem', () => {
  it('com próxima página, diz o que MOSTRA e nunca um total', () => {
    const rotulo = rotuloContagem(20, true, EVENTOS);
    expect(rotulo).toBe('Mostrando 20 eventos · há mais para carregar');
    expect(rotulo).not.toMatch(/\bde\s+\d/);
  });

  it('sem próxima página, o número carregado É o total do recorte', () => {
    expect(rotuloContagem(37, false, EVENTOS)).toBe('37 eventos · fim da lista');
  });

  it('singular quando é um só', () => {
    expect(rotuloContagem(1, false, EVENTOS)).toBe('1 evento · fim da lista');
    expect(rotuloContagem(1, true, EVENTOS)).toBe(
      'Mostrando 1 evento · há mais para carregar'
    );
  });

  it('milhar em pt-BR', () => {
    expect(rotuloContagem(1200, false, EVENTOS)).toBe('1.200 eventos · fim da lista');
  });
});

describe('nomeDoTenant', () => {
  it('resolve o nome pelo id', () => {
    expect(nomeDoTenant([tenant()], 'castelo-producoes')).toBe('Castelo Produções');
  });

  it('sem correspondência devolve o ID (fallback honesto, não "desconhecido")', () => {
    expect(nomeDoTenant([tenant()], 't-sumido')).toBe('t-sumido');
    expect(nomeDoTenant(null, 't-sumido')).toBe('t-sumido');
  });

  it('doc sem tenantId mostra travessão, não string vazia', () => {
    expect(nomeDoTenant([tenant()], '')).toBe('—');
    expect(nomeDoTenant([tenant()], '   ')).toBe('—');
  });
});

describe('opcoesDeTenant', () => {
  it('"todos" na frente e o resto em ordem alfabética pt-BR', () => {
    const opcoes = opcoesDeTenant([
      tenant({ id: 'b', nome: 'Ávila Esportes' }),
      tenant({ id: 'a', nome: 'Zenite Runs' }),
      tenant({ id: 'c', nome: 'Castelo Produções' }),
    ]);
    expect(opcoes[0]).toEqual({ value: TENANT_TODOS, label: 'Todos os tenants' });
    expect(opcoes.slice(1).map((o) => o.label)).toEqual([
      'Ávila Esportes',
      'Castelo Produções',
      'Zenite Runs',
    ]);
  });

  it('sem tenants carregados, o seletor não promete tenant nenhum', () => {
    expect(opcoesDeTenant(null)).toEqual([
      { value: TENANT_TODOS, label: 'Todos os tenants' },
    ]);
  });
});
