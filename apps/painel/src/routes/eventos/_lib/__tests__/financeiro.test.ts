import { describe, it, expect } from 'vitest';
import {
  breakdownFinanceiro,
  derivarRepasse,
  gerarCsvFinanceiro,
  RETENCAO_MAX_PCT,
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
      porStatus: { confirmado: 450, pendente: 2, cancelado: 1, estornado: 0 },
      porKit: { kit_ouro: 100, kit_prata: 150, kit_basico: 200, sem_kit: 3 },
      porModalidade: { '5k': 100, '10k': 200, '21k': 153 },
    },
    ...over,
  };
}

describe('derivarRepasse (visão do organizador, sem taxa da plataforma)', () => {
  it('retenção = 15% do total; disponível = total − retenção − repassado', () => {
    const rep = derivarRepasse(mkFin());
    expect(rep.receitaTotal).toBe(85617);
    expect(rep.aSerDisponibilizado).toBe(85617 * (RETENCAO_MAX_PCT / 100)); // 12842.55
    expect(rep.disponivel).toBe(85617 - 85617 * (RETENCAO_MAX_PCT / 100)); // 72774.45
  });

  it('repassado é 0 e marcado indisponível (E09 ausente — NÃO inventa transferência)', () => {
    const rep = derivarRepasse(mkFin());
    expect(rep.repassado).toBe(0);
    expect(rep.repasseIndisponivel).toBe(true);
  });

  it('conserva: total = disponível + a ser disponibilizado + repassado', () => {
    const rep = derivarRepasse(mkFin({ receitaBruta: 100000 }));
    expect(rep.disponivel + rep.aSerDisponibilizado + rep.repassado).toBe(rep.receitaTotal);
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
        porStatus: { confirmado: 1, pendente: 0, cancelado: 0, estornado: 0 },
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
  it('inclui cabeçalho, resumo (repasse) e breakdown', () => {
    const csv = gerarCsvFinanceiro(mkFin());
    const linhas = csv.split('\r\n');
    expect(linhas[0]).toBe('Categoria,Item,Valor');
    expect(csv).toContain('Resumo,Receita total (R$),85617');
    expect(csv).toContain('Resumo,Valor repassado (R$),0');
    expect(csv).toContain('Resumo,Valor disponível (R$),72774.45');
    expect(csv).toContain('Resumo,Valor a ser disponibilizado (R$),12842.55');
    expect(csv).toContain('Inscritos,Total,453');
  });
  it('NÃO expõe taxa/margem da plataforma no CSV (RN-404)', () => {
    const csv = gerarCsvFinanceiro(mkFin());
    expect(csv).not.toContain('Taxa');
    expect(csv).not.toContain('líquida');
  });

  describe('injeção de fórmula (CSV/DDE)', () => {
    it('neutraliza modalidade perigosa (texto livre público)', () => {
      const csv = gerarCsvFinanceiro(
        mkFin({
          inscritos: {
            total: 3,
            porStatus: { confirmado: 3, pendente: 0, cancelado: 0, estornado: 0 },
            porKit: { kit_ouro: 0, kit_prata: 0, kit_basico: 0, sem_kit: 0 },
            porModalidade: { '=HYPERLINK("http://evil","x")': 3 },
          },
        }),
      );
      // Modalidade iniciando por `=` sai prefixada com apóstrofo → o Excel/Sheets
      // trata como texto literal (não avalia a fórmula).
      expect(csv).toContain("'=HYPERLINK");
    });

    it.each([
      ['@SUM(A1)', "'@SUM(A1)"],
      ['-2+3', "'-2+3"],
      ['+cmd', "'+cmd"],
      ['\tinjetado', "'\tinjetado"],
    ])('neutraliza gatilho %j na modalidade', (modalidade, esperado) => {
      const csv = gerarCsvFinanceiro(
        mkFin({
          inscritos: {
            total: 1,
            porStatus: { confirmado: 1, pendente: 0, cancelado: 0, estornado: 0 },
            porKit: { kit_ouro: 0, kit_prata: 0, kit_basico: 0, sem_kit: 0 },
            porModalidade: { [modalidade]: 1 },
          },
        }),
      );
      const linhaMod = csv.split('\r\n').find((l) => l.startsWith('Modalidade,')) ?? '';
      const celula = linhaMod.split(',')[1] ?? '';
      expect(celula.replace(/^"|"$/g, '')).toBe(esperado);
    });

    it('modalidade normal NÃO recebe apóstrofo', () => {
      const csv = gerarCsvFinanceiro(mkFin());
      expect(csv).toContain('Modalidade,5k,100');
    });
  });
});
