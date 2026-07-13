// =============================================================================
// derivarRepassesPorEvento (RN-349) — prova o eixo por-evento do repasse:
// vendido real, retido/disponível ESTIMADOS pelos helpers canônicos do core, e
// o tratamento honesto do evento SEM termo comercial.
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { FinanceiroEvento } from '@leela/api-client';
import type { EventoFinanceiroRow } from '../../../../../lib/query/queries';
import { derivarRepassesPorEvento, totaisRepasseEvento } from '../repassesPorEvento';

function fin(over: Partial<FinanceiroEvento>): FinanceiroEvento {
  return {
    tenantId: 'corrida',
    receitaBruta: 0,
    taxaPct: 10,
    taxaValor: 0,
    receitaLiquida: 0,
    inscritos: { total: 0, porStatus: {}, porKit: {}, porModalidade: {} } as FinanceiroEvento['inscritos'],
    ...over,
  };
}

function row(
  id: string,
  status: 'rascunho' | 'publicado' | 'ao_vivo' | 'encerrado',
  financeiro: FinanceiroEvento | null,
): EventoFinanceiroRow {
  return { evento: { id, nome: `Evento ${id}`, slug: id, status }, financeiro };
}

describe('derivarRepassesPorEvento', () => {
  it('evento em andamento: retido = líquido × pct; disponível = líquido − retido', () => {
    const linhas = derivarRepassesPorEvento(
      [row('a', 'ao_vivo', fin({ receitaBruta: 12000, receitaLiquida: 10000 }))],
      15,
    );
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      eventoId: 'a',
      vendido: 12000,
      retido: 1500, // 10000 × 15%
      disponivelEstimado: 8500, // 10000 − 1500
      encerrado: false,
      semTermo: false,
    });
  });

  it('evento ENCERRADO libera a retenção: retido 0, disponível = líquido inteiro', () => {
    const linhas = derivarRepassesPorEvento(
      [row('a', 'encerrado', fin({ receitaBruta: 12000, receitaLiquida: 10000 }))],
      15,
    );
    expect(linhas[0]?.retido).toBe(0);
    expect(linhas[0]?.disponivelEstimado).toBe(10000);
    expect(linhas[0]?.encerrado).toBe(true);
  });

  it('evento SEM termo (receitaLiquida null): vendido conta, retido/disponível = null (honesto)', () => {
    const linhas = derivarRepassesPorEvento(
      [row('a', 'ao_vivo', fin({ receitaBruta: 5000, receitaLiquida: null }))],
    );
    expect(linhas[0]).toMatchObject({
      vendido: 5000,
      retido: null,
      disponivelEstimado: null,
      semTermo: true,
    });
  });

  it('usa o default de retenção (15%) quando o pct não é informado', () => {
    const linhas = derivarRepassesPorEvento([
      row('a', 'ao_vivo', fin({ receitaBruta: 2000, receitaLiquida: 1000 })),
    ]);
    expect(linhas[0]?.retido).toBe(150); // 1000 × 15% default
  });

  it('exclui eventos sem agregado financeiro (sem movimento) e ordena por vendido desc', () => {
    const linhas = derivarRepassesPorEvento([
      row('sem', 'publicado', null),
      row('pequeno', 'ao_vivo', fin({ receitaBruta: 1000, receitaLiquida: 900 })),
      row('grande', 'ao_vivo', fin({ receitaBruta: 9000, receitaLiquida: 8000 })),
    ]);
    expect(linhas.map((l) => l.eventoId)).toEqual(['grande', 'pequeno']);
  });

  it('totais somam as linhas; sem-termo entra só no vendido e conta em eventosSemTermo', () => {
    const linhas = derivarRepassesPorEvento(
      [
        row('a', 'ao_vivo', fin({ receitaBruta: 2000, receitaLiquida: 1000 })),
        row('b', 'ao_vivo', fin({ receitaBruta: 5000, receitaLiquida: null })),
      ],
      20,
    );
    const totais = totaisRepasseEvento(linhas);
    expect(totais.vendido).toBe(7000);
    expect(totais.retido).toBe(200); // só o evento 'a': 1000 × 20%
    expect(totais.disponivelEstimado).toBe(800);
    expect(totais.eventosSemTermo).toBe(1);
  });
});
