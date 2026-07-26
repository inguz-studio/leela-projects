// =============================================================================
// modalidadesMaisInscritos (RN-820) — soma `inscritos.porModalidade` de todos
// os eventos (agregado ∑, sem varredura) e ordena do maior para o menor.
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { FinanceiroEvento } from '@leela/api-client';
import type { EventoFinanceiroRow } from '../../../../../lib/query/queries';
import { agregarModalidades, modalidadesMaisInscritos } from '../modalidades';

function row(id: string, porModalidade: Record<string, number>, financeiroNull = false): EventoFinanceiroRow {
  const financeiro: FinanceiroEvento | null = financeiroNull
    ? null
    : {
        tenantId: 'corrida',
        receitaBruta: 0,
        taxaPct: null,
        taxaValor: null,
        receitaLiquida: null,
        inscritos: { total: 0, porStatus: {}, porKit: {}, porModalidade } as FinanceiroEvento['inscritos'],
      };
  return { evento: { id, nome: id, slug: id, status: 'ao_vivo' }, financeiro };
}

describe('agregarModalidades / modalidadesMaisInscritos', () => {
  it('soma a mesma modalidade através de eventos e ignora eventos sem agregado', () => {
    const total = agregarModalidades([
      row('a', { '5k': 30, '10k': 50 }),
      row('b', { '10k': 20, '21k': 10 }),
      row('semAgregado', {}, true),
    ]);
    expect(total).toEqual({ '5k': 30, '10k': 70, '21k': 10 });
  });

  it('ordena do mais inscrito para o menos', () => {
    const barras = modalidadesMaisInscritos([row('a', { '5k': 30, '10k': 70, '21k': 10 })]);
    expect(barras.map((b) => b.label)).toEqual(['10k', '5k', '21k']);
    expect(barras.map((b) => b.value)).toEqual([70, 30, 10]);
  });

  it('ignora modalidade com 0 inscritos e respeita o limite', () => {
    const barras = modalidadesMaisInscritos(
      [row('a', { '5k': 5, '10k': 4, '21k': 3, '42k': 0 })],
      2,
    );
    expect(barras.map((b) => b.label)).toEqual(['5k', '10k']);
  });

  it('sem inscrição por modalidade → vazio (a tela mostra EmptyState)', () => {
    expect(modalidadesMaisInscritos([row('a', {})])).toEqual([]);
  });
});
