import { describe, it, expect } from 'vitest';
import { agregaKpisGlobais } from '../kpis';
import { mkEvento } from '../../_test/fixtures';

describe('agregaKpisGlobais', () => {
  it('soma inscritos e receita dos agregados ∑ (mock canônico)', () => {
    const kpis = agregaKpisGlobais([
      mkEvento({ id: 'a', slug: 'a', qtdInscritos: 453, receitaConfirmada: 85617, status: 'ao_vivo' }),
      mkEvento({ id: 'b', slug: 'b', qtdInscritos: 100, receitaConfirmada: 20000, status: 'rascunho' }),
    ]);
    expect(kpis.totalEventos).toBe(2);
    expect(kpis.totalInscritos).toBe(553);
    expect(kpis.receitaConsolidada).toBe(105617);
  });

  it('conta como ativo apenas publicado ou ao_vivo', () => {
    const kpis = agregaKpisGlobais([
      mkEvento({ id: 'a', slug: 'a', status: 'publicado' }),
      mkEvento({ id: 'b', slug: 'b', status: 'ao_vivo' }),
      mkEvento({ id: 'c', slug: 'c', status: 'rascunho' }),
      mkEvento({ id: 'd', slug: 'd', status: 'encerrado' }),
    ]);
    expect(kpis.eventosAtivos).toBe(2);
  });

  it('devolve zeros para lista vazia', () => {
    expect(agregaKpisGlobais([])).toEqual({
      totalEventos: 0,
      eventosAtivos: 0,
      totalInscritos: 0,
      receitaConsolidada: 0,
    });
  });
});
