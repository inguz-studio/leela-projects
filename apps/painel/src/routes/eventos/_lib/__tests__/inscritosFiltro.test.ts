import { describe, it, expect } from 'vitest';
import {
  contadorInscritos,
  contarPendentesAntigos,
  contarPorStatus,
  filtrarInscritos,
  inadimplentes,
  normalizarBusca,
  paginar,
} from '../inscritosFiltro';
import { mkInscrito, ts } from '../../_test/fixtures';

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

describe('contarPorStatus', () => {
  it('conta por status e total', () => {
    const c = contarPorStatus(base);
    expect(c.total).toBe(3);
    expect(c.confirmado).toBe(1);
    expect(c.pendente).toBe(1);
    expect(c.cancelado).toBe(1);
  });

  it('lista vazia zera tudo', () => {
    const c = contarPorStatus([]);
    expect(c).toMatchObject({ total: 0, confirmado: 0, pendente: 0, cancelado: 0 });
  });
});

describe('inadimplentes', () => {
  it('retorna só os pendentes (quem deve)', () => {
    expect(inadimplentes(base).map((i) => i.id)).toEqual(['2']);
  });
});

describe('contarPendentesAntigos', () => {
  const agora = new Date('2026-03-01T12:00:00Z');
  it('conta pendentes com criadoEm anterior ao limite de 72h', () => {
    const antigo = mkInscrito({
      id: 'a',
      status: 'pendente',
      criadoEm: ts(new Date('2026-02-20T00:00:00Z')), // >72h antes
    });
    const recente = mkInscrito({
      id: 'b',
      status: 'pendente',
      criadoEm: ts(new Date('2026-03-01T06:00:00Z')), // <72h antes
    });
    // confirmado antigo não conta (não é inadimplente)
    const confirmadoAntigo = mkInscrito({
      id: 'c',
      status: 'confirmado',
      criadoEm: ts(new Date('2026-01-01T00:00:00Z')),
    });
    expect(contarPendentesAntigos([antigo, recente, confirmadoAntigo], agora)).toBe(1);
  });

  it('exatamente 72h NÃO conta como "mais de 72h" (fronteira estrita)', () => {
    // limite = agora - 72h = 2026-02-26T12:00:00Z. criadoEm igual ao limite
    // é exatamente 72h, não "mais de 72h" → não conta.
    const naFronteira = mkInscrito({
      id: 'f',
      status: 'pendente',
      criadoEm: ts(new Date('2026-02-26T12:00:00Z')),
    });
    expect(contarPendentesAntigos([naFronteira], agora)).toBe(0);
  });
});
