// =============================================================================
// overviewDoFinanceiro (S-R9-01-T2 · RN-821) — o recorte por evento do bloco
// Desempenho: mapeia `financeiro/current` de UM evento ao contrato OverviewResult
// que a View consome, sem inventar número (campos indisponíveis = null/0/[]).
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { FinanceiroEvento } from '@leela/api-client';
import { overviewDoFinanceiro } from '../desempenho';

function financeiro(over: Partial<FinanceiroEvento> = {}): FinanceiroEvento {
  return {
    tenantId: 't1',
    receitaBruta: 12500,
    taxaPct: null,
    taxaValor: null,
    receitaLiquida: null,
    inscritos: {
      total: 340,
      porStatus: {} as FinanceiroEvento['inscritos']['porStatus'],
      porKit: {} as FinanceiroEvento['inscritos']['porKit'],
      porModalidade: { '5k': 200, '10k': 140 },
    },
    ...over,
  };
}

describe('overviewDoFinanceiro', () => {
  it('carrega inscrições e receita reais do agregado do evento', () => {
    const o = overviewDoFinanceiro(financeiro());
    expect(o.inscricoesTotais).toBe(340);
    expect(o.receitaConfirmada).toBe(12500);
  });

  it('conversão do agregado quando presente; null quando ausente (nunca 0 falso)', () => {
    expect(overviewDoFinanceiro(financeiro({ taxaConversaoPct: 42 })).taxaConversaoPct).toBe(42);
    expect(overviewDoFinanceiro(financeiro()).taxaConversaoPct).toBeNull();
  });

  it('sem série de conversão por evento → conversaoSparkline vazio (esconde a tendência)', () => {
    // `ticketSparkline` é ticket médio (outra grandeza) — NÃO vira série de conversão.
    const o = overviewDoFinanceiro(financeiro({ ticketSparkline: [10, 20, 30] }));
    expect(o.conversaoSparkline).toEqual([]);
  });

  it('campos indisponíveis por evento são ausência honesta (não número inventado)', () => {
    const o = overviewDoFinanceiro(financeiro());
    expect(o.inscricoesTrendPct).toBeNull();
    expect(o.receitaTrendPct).toBeNull();
    expect(o.eventoEmRisco).toBeNull();
    expect(o.vagasRestantes).toBe(0);
    expect(o.alerts).toEqual([]);
  });
});
