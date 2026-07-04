import { describe, it, expect } from 'vitest';
import {
  contadorInscritos,
  filtrarInscritos,
  normalizarBusca,
  paginar,
} from '../inscritosFiltro';
import { mkInscrito } from '../../_test/fixtures';

const base = [
  mkInscrito({ id: '1', atletaNome: 'Marina Silva', kit: 'kit_ouro', modalidade: '21k', status: 'confirmado' }),
  mkInscrito({ id: '2', atletaNome: 'João Pereira', kit: 'sem_kit', modalidade: '10k', status: 'pendente' }),
  mkInscrito({ id: '3', atletaNome: 'Marina Costa', kit: 'kit_prata', modalidade: '5k', status: 'cancelado' }),
];

describe('normalizarBusca', () => {
  it('remove acento e caixa', () => {
    expect(normalizarBusca('  JOÃO  ')).toBe('joao');
  });
});

describe('filtrarInscritos', () => {
  it('busca por nome casa acento/caixa e ignora resto', () => {
    const r = filtrarInscritos(base, { busca: 'marina' });
    expect(r.map((i) => i.id)).toEqual(['1', '3']);
  });

  it('filtra por status, kit e modalidade combinados', () => {
    expect(filtrarInscritos(base, { status: 'pendente' }).map((i) => i.id)).toEqual(['2']);
    expect(filtrarInscritos(base, { kit: 'kit_ouro' }).map((i) => i.id)).toEqual(['1']);
    expect(filtrarInscritos(base, { modalidade: '5k' }).map((i) => i.id)).toEqual(['3']);
  });

  it('filtro sem correspondência retorna vazio', () => {
    expect(filtrarInscritos(base, { busca: 'zzz' })).toEqual([]);
  });
});

describe('contadorInscritos', () => {
  it('formata mostrando X de Y', () => {
    expect(contadorInscritos(18, 453)).toBe('Mostrando 18 de 453');
  });
});

describe('paginar', () => {
  it('recorta a página 1-based', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(paginar(arr, 1, 2)).toEqual([1, 2]);
    expect(paginar(arr, 3, 2)).toEqual([5]);
  });
});
