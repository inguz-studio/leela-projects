import { describe, it, expect } from 'vitest';
import {
  agruparDesafios,
  filtrarDesafios,
  kpisDesafios,
  modeloDesafioLabel,
  recompensaLabel,
  statusDesafioBadge,
} from '../desafios';
import { mkDesafio } from '../../_test/fixtures';

const LISTA = [
  mkDesafio({ id: 'a', nome: 'Meia Maratona Floripa', modelo: 'C', status: 'ativo', qtdParticipantes: 30, progressoPct: 40 }),
  mkDesafio({ id: 'b', nome: 'Constância 30 dias', modelo: 'B', status: 'ativo', qtdParticipantes: 20, progressoPct: 80 }),
  mkDesafio({ id: 'c', nome: 'Foco Floripa Run', modelo: 'A', status: 'encerrado', qtdParticipantes: 10, progressoPct: 100 }),
  mkDesafio({ id: 'd', nome: 'Rascunho X', modelo: 'C', status: 'rascunho', qtdParticipantes: 0, progressoPct: 0 }),
];

describe('filtrarDesafios', () => {
  it('sem filtros retorna tudo', () => {
    expect(filtrarDesafios(LISTA)).toHaveLength(4);
  });

  it('status é exclusivo', () => {
    expect(filtrarDesafios(LISTA, { status: 'ativo' }).map((d) => d.id)).toEqual(['a', 'b']);
  });

  it('modelos são toggles (união entre selecionados)', () => {
    const ids = filtrarDesafios(LISTA, { modelos: ['A', 'B'] }).map((d) => d.id);
    expect(ids.sort()).toEqual(['b', 'c']);
  });

  it('modelo "C" + busca "Floripa" → só a Meia Maratona Floripa (RN-111/aceite)', () => {
    const r = filtrarDesafios(LISTA, { modelos: ['C'], busca: 'Floripa' });
    expect(r).toHaveLength(1);
    expect(r[0]?.id).toBe('a');
  });

  it('filtro que zera devolve lista vazia', () => {
    expect(filtrarDesafios(LISTA, { busca: 'zzz' })).toHaveLength(0);
  });
});

describe('agruparDesafios', () => {
  it('separa em andamento (rascunho+ativo) de encerrados', () => {
    const { emAndamento, encerrados } = agruparDesafios(LISTA);
    expect(emAndamento.map((d) => d.id).sort()).toEqual(['a', 'b', 'd']);
    expect(encerrados.map((d) => d.id)).toEqual(['c']);
  });
});

describe('kpisDesafios', () => {
  it('agrega total, ativos, participantes e progresso médio dos ativos', () => {
    const k = kpisDesafios(LISTA);
    expect(k.total).toBe(4);
    expect(k.ativos).toBe(2);
    expect(k.participantes).toBe(60);
    expect(k.progressoMedio).toBe(60); // (40 + 80) / 2
  });

  it('progresso médio é 0 quando não há ativos', () => {
    expect(kpisDesafios([mkDesafio({ status: 'encerrado' })]).progressoMedio).toBe(0);
  });
});

describe('rótulos', () => {
  it('modelo, recompensa e status têm rótulo/variante', () => {
    expect(modeloDesafioLabel('C')).toContain('Equilíbrio');
    expect(recompensaLabel('cupom')).toBe('Cupom');
    expect(statusDesafioBadge('ativo').variant).toBe('vitoria');
    expect(statusDesafioBadge('encerrado').variant).toBe('alerta');
  });
});
