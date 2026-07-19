// =============================================================================
// tamanhosMaisPedidos (RN-820) — soma `qtdVendida` por tamanho dos SKUs de
// aprovisionamento (agregado FABLE-D, sem varredura) e ordena do mais pedido
// para o menos, com a grade PP..GG desempatando.
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { Aprovisionamento } from '@leela/core';
import { agregarTamanhos, tamanhosMaisPedidos } from '../tamanhos';

function sku(itemId: string, tamanho: string, qtdVendida: number): Aprovisionamento {
  return {
    id: `${itemId}__${tamanho}`,
    tenantId: 'corrida',
    itemId,
    corte: 'unissex',
    tamanho,
    estado: 'estimativa',
    qtdVendida,
    estoqueFisico: 0,
    aEncomendar: qtdVendida,
    alerta: null,
    historico: [],
    criadoEm: {} as Aprovisionamento['criadoEm'],
    atualizadoEm: {} as Aprovisionamento['atualizadoEm'],
  };
}

describe('agregarTamanhos / tamanhosMaisPedidos', () => {
  it('soma o mesmo tamanho de itens/eventos diferentes', () => {
    const total = agregarTamanhos([
      sku('camiseta', 'M', 40),
      sku('camiseta', 'G', 25),
      sku('regata', 'M', 10), // outro item, mesmo tamanho
    ]);
    expect(total).toEqual({ M: 50, G: 25 });
  });

  it('ordena do mais pedido para o menos', () => {
    const barras = tamanhosMaisPedidos([
      sku('c', 'P', 12),
      sku('c', 'M', 50),
      sku('c', 'G', 30),
    ]);
    expect(barras.map((b) => b.label)).toEqual(['M', 'G', 'P']);
  });

  it('empate resolvido pela ordem de grade (PP..GG), não alfabética', () => {
    // P e G empatados em 20 → P (grade menor) vem antes de G.
    const barras = tamanhosMaisPedidos([sku('c', 'G', 20), sku('c', 'P', 20)]);
    expect(barras.map((b) => b.label)).toEqual(['P', 'G']);
  });

  it('ignora SKU sem venda; sem venda alguma → vazio (EmptyState)', () => {
    expect(tamanhosMaisPedidos([sku('c', 'M', 0)])).toEqual([]);
  });
});
