import { describe, it, expect } from 'vitest';
import {
  acoesComunicado,
  filtrarComunicados,
  kpisComunicados,
  statusComunicadoBadge,
} from '../comunicados';
import { mkComunicado } from '../../_test/fixtures';

const LISTA = [
  mkComunicado({ id: 'a', titulo: 'Longão de sábado', status: 'enviado', canal: ['push'], origem: 'manual', alcance: 100 }),
  mkComunicado({ id: 'b', titulo: 'Newsletter mensal', status: 'enviado', canal: ['email'], origem: 'automatizada', alcance: 80 }),
  mkComunicado({ id: 'c', titulo: 'Aviso agendado', status: 'agendado', canal: ['push', 'email'], origem: 'manual', alcance: 0 }),
  mkComunicado({ id: 'd', titulo: 'Rascunho novo', status: 'rascunho', canal: ['push'], origem: 'manual', alcance: 0 }),
];

describe('filtrarComunicados', () => {
  it('status é exclusivo', () => {
    expect(filtrarComunicados(LISTA, { status: 'enviado' }).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('canal filtra por interseção', () => {
    const ids = filtrarComunicados(LISTA, { canais: ['email'] }).map((c) => c.id).sort();
    expect(ids).toEqual(['b', 'c']);
  });

  it('origem exclusiva combina com status (interseção)', () => {
    const ids = filtrarComunicados(LISTA, { status: 'enviado', origem: 'automatizada' }).map((c) => c.id);
    expect(ids).toEqual(['b']);
  });

  it('busca no título', () => {
    expect(filtrarComunicados(LISTA, { busca: 'longão' }).map((c) => c.id)).toEqual(['a']);
  });

  it('filtro que zera devolve vazio', () => {
    expect(filtrarComunicados(LISTA, { busca: 'zzz' })).toHaveLength(0);
  });
});

describe('kpisComunicados', () => {
  it('agrega total, enviados, agendados e alcance total', () => {
    const k = kpisComunicados(LISTA);
    expect(k.total).toBe(4);
    expect(k.enviados).toBe(2);
    expect(k.agendados).toBe(1);
    expect(k.alcanceTotal).toBe(180);
  });
});

describe('acoesComunicado (popover contextual por status)', () => {
  it('rascunho tem editar/duplicar/excluir', () => {
    expect(acoesComunicado('rascunho').map((a) => a.id)).toEqual(['editar', 'duplicar', 'excluir']);
  });
  it('agendado tem cancelar-agendamento', () => {
    expect(acoesComunicado('agendado').map((a) => a.id)).toContain('cancelar-agendamento');
  });
  it('enviado tem relatório/duplicar (sem editar)', () => {
    const ids = acoesComunicado('enviado').map((a) => a.id);
    expect(ids).toEqual(['relatorio', 'duplicar']);
    expect(ids).not.toContain('editar');
  });
});

describe('statusComunicadoBadge', () => {
  it('mapeia status → variante + borda', () => {
    expect(statusComunicadoBadge('enviado').variant).toBe('vitoria');
    expect(statusComunicadoBadge('agendado').borderVar).toBe('--feedback-info');
  });
});
