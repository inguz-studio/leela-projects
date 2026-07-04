import { describe, it, expect } from 'vitest';
import {
  breakdownFinanceiro,
  formatTaxaPct,
  gerarCsvFinanceiro,
} from '../financeiro';
import type { FinanceiroEvento } from '@leela/api-client';

function mkFin(over: Partial<FinanceiroEvento> = {}): FinanceiroEvento {
  return {
    tenantId: 'castelo',
    receitaBruta: 85617,
    taxaPct: 10.5,
    taxaValor: 8989.79,
    receitaLiquida: 76627.21,
    inscritos: {
      total: 453,
      porStatus: { confirmado: 450, pendente: 2, cancelado: 1 },
      porKit: { kit_ouro: 100, kit_prata: 150, kit_basico: 200, sem_kit: 3 },
      porModalidade: { '5k': 100, '10k': 200, '21k': 153 },
    },
    ...over,
  };
}

describe('formatTaxaPct (RN-406)', () => {
  it('formata % pt-BR', () => {
    expect(formatTaxaPct(10.5)).toBe('10,5%');
  });
  it('null → "—" (sem termo, sem fallback)', () => {
    expect(formatTaxaPct(null)).toBe('—');
  });
});

describe('breakdownFinanceiro', () => {
  it('lista kit/modalidade/status com valor > 0', () => {
    const linhas = breakdownFinanceiro(mkFin());
    expect(linhas).toContainEqual({ categoria: 'Kit', item: 'Kit Ouro', valor: 100 });
    expect(linhas).toContainEqual({ categoria: 'Modalidade', item: '21k', valor: 153 });
    expect(linhas).toContainEqual({ categoria: 'Status', item: 'Confirmado', valor: 450 });
  });
  it('omite categorias zeradas', () => {
    const fin = mkFin({
      inscritos: {
        total: 1,
        porStatus: { confirmado: 1, pendente: 0, cancelado: 0 },
        porKit: { kit_ouro: 1, kit_prata: 0, kit_basico: 0, sem_kit: 0 },
        porModalidade: { '5k': 1 },
      },
    });
    const itens = breakdownFinanceiro(fin).map((l) => l.item);
    expect(itens).not.toContain('Kit Prata');
    expect(itens).not.toContain('Pendente');
  });
});

describe('gerarCsvFinanceiro', () => {
  it('inclui cabeçalho, resumo e breakdown', () => {
    const csv = gerarCsvFinanceiro(mkFin());
    const linhas = csv.split('\r\n');
    expect(linhas[0]).toBe('Categoria,Item,Valor');
    expect(csv).toContain('Resumo,Receita bruta (R$),85617');
    expect(csv).toContain('Resumo,Taxa (%),10.5');
    expect(csv).toContain('Inscritos,Total,453');
  });
  it('taxa/líquido nulos viram campo vazio (RN-406)', () => {
    const csv = gerarCsvFinanceiro(mkFin({ taxaPct: null, taxaValor: null, receitaLiquida: null }));
    expect(csv).toContain('Resumo,Taxa (%),\r\n');
    expect(csv).toContain('Resumo,Receita líquida (R$),\r\n');
  });
});
