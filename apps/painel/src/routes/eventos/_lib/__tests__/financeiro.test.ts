// =============================================================================
// Derivações da Caixa do evento. A rodada DEC-0727 trocou o mundo que este
// arquivo cravava: o disponível ABATE os repasses vivos do evento (verbatim do
// dono: "sim disponivel tem que abater o que já foi repassado, isso é muito
// imoprtante"). As duas asserções do mundo anterior — "repassado é 0 e marcado
// indisponível" e o CSV que imprimia 0 ao lado do valor real da tela — saíram
// com autorização explícita, e no lugar entrou prova MAIS forte: repasse vivo,
// estorno, zerado, conservação dos quatro números e coerência tela↔CSV.
//
// `computeDisponivelPorEvento` (core) é exercitada daqui: `packages/core` não
// tem runner de teste próprio, e a suíte que cobre o core (`functions/src/
// __tests__/repasseCore.test.ts`) fica fora do território desta lane. Testá-la
// pelo consumidor é honesto e roda no gate que existe.
// =============================================================================

import { describe, it, expect } from 'vitest';
import { computeDisponivelPorEvento } from '@leela/core';
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

  it('sem repasse associado: repassado 0 — nada inventado onde não houve movimento', () => {
    expect(derivarRepasse(mkFin()).repassado).toBe(0);
    expect(derivarRepasse(mkFin(), null).repassado).toBe(0);
    // Σ vazia é AUSÊNCIA de repasse, não repasse de R$ 0,00 (RN-235).
    expect(derivarRepasse(mkFin(), { qtd: 0, total: 0 }).repassado).toBe(0);
  });

  it('conserva: total = disponível + a ser disponibilizado + repassado', () => {
    const rep = derivarRepasse(mkFin({ receitaBruta: 100000 }));
    expect(rep.disponivel + rep.aSerDisponibilizado + rep.repassado).toBe(rep.receitaTotal);
  });
});

// ---------------------------------------------------------------------------
// DEC-0727 — o disponível abate os repasses VIVOS do evento
// ---------------------------------------------------------------------------

describe('derivarRepasse × repasse vivo (DEC-0727)', () => {
  /** O caso do Castelo, com números redondos: R$ 10.000 vendidos, R$ 500 repassados. */
  const CASTELO = mkFin({ receitaBruta: 10000 });

  it('ANTES do repasse: 10.000 = 8.500 disponível + 1.500 retido + 0 repassado', () => {
    const rep = derivarRepasse(CASTELO);
    expect(rep).toEqual({
      receitaTotal: 10000,
      repassado: 0,
      disponivel: 8500,
      aSerDisponibilizado: 1500,
    });
  });

  it('DEPOIS do repasse de R$ 500: o disponível cai para 8.000 e os quatro números fecham', () => {
    const rep = derivarRepasse(CASTELO, { qtd: 1, total: 500 });
    expect(rep.repassado).toBe(500);
    expect(rep.disponivel).toBe(8000); // 10.000 − 1.500 − 500
    // A conta que o organizador faz de cabeça e que não fechava antes da DEC-0727.
    expect(rep.disponivel + rep.aSerDisponibilizado + rep.repassado).toBe(rep.receitaTotal);
  });

  it('vários repasses vivos abatem a Σ, não o primeiro nem a contagem', () => {
    const rep = derivarRepasse(CASTELO, { qtd: 3, total: 2300 });
    expect(rep.disponivel).toBe(6200); // 8.500 − 2.300
  });

  it('ESTORNO devolve ao disponível: a Σ sem o repasse estornado volta o número de antes', () => {
    // O estorno (cancelRepasse/rejectRepasse) tira o doc do conjunto vivo, então
    // a Σ que chega aqui já é a de depois — o disponível volta por construção.
    const comRepasse = derivarRepasse(CASTELO, { qtd: 1, total: 500 });
    const aposEstorno = derivarRepasse(CASTELO, { qtd: 0, total: 0 });
    expect(comRepasse.disponivel).toBe(8000);
    expect(aposEstorno.disponivel).toBe(8500);
    expect(aposEstorno.disponivel).toBe(derivarRepasse(CASTELO).disponivel);
  });

  it('repasse maior que o liberado: disponível é 0, nunca negativo (clamp RN-351)', () => {
    const rep = derivarRepasse(CASTELO, { qtd: 1, total: 9999 });
    expect(rep.disponivel).toBe(0);
    expect(rep.disponivel).toBeGreaterThanOrEqual(0);
  });

  it('centavos: cada número sai cent-exato do abatimento', () => {
    const rep = derivarRepasse(mkFin({ receitaBruta: 85617 }), { qtd: 2, total: 3200.35 });
    expect(rep.aSerDisponibilizado).toBe(12842.55);
    expect(rep.disponivel).toBe(69574.1); // 85617 − 12842.55 − 3200.35
    // A conservação vale ao centavo: os TERMOS são exatos (roundMoney), a soma
    // dos três em float é que carrega resíduo (…00000000001) — arredondar a
    // soma aqui seria esconder que o exato é o que a tela e o CSV imprimem.
    expect(rep.disponivel + rep.aSerDisponibilizado + rep.repassado).toBeCloseTo(85617, 2);
  });

  it('a subtração é a do core — a Caixa não tem matemática própria', () => {
    const rep = derivarRepasse(CASTELO, { qtd: 1, total: 500 });
    expect(rep.disponivel).toBe(
      computeDisponivelPorEvento(rep.receitaTotal - rep.aSerDisponibilizado, rep.repassado),
    );
    // E o core recusa entrada inválida em vez de devolver número torto.
    expect(() => computeDisponivelPorEvento(100, -1)).toThrow(RangeError);
    expect(() => computeDisponivelPorEvento(Number.NaN, 0)).toThrow(RangeError);
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

  // A planilha de conciliação NUNCA contradiz o número exibido (invariante da
  // review IA-MENU, achado A-1) — agora inclusive no disponível (DEC-0727).
  describe('coerência com a tela (invariante A-1 + DEC-0727)', () => {
    const CASTELO = mkFin({ receitaBruta: 10000 });

    it('com repasse vivo: o CSV leva o repassado E o disponível já abatido', () => {
      const csv = gerarCsvFinanceiro(CASTELO, { qtd: 1, total: 500 });
      expect(csv).toContain('Resumo,Valor repassado (R$),500');
      expect(csv).toContain('Resumo,Valor disponível (R$),8000');
      expect(csv).toContain('Resumo,Valor a ser disponibilizado (R$),1500');
      // O número do mundo anterior não sobrevive em nenhuma das duas linhas.
      expect(csv).not.toContain('Resumo,Valor repassado (R$),0');
      expect(csv).not.toContain('Resumo,Valor disponível (R$),8500');
    });

    it('as 4 linhas do resumo saem da MESMA derivação da tela (nenhuma paralela)', () => {
      for (const arg of [
        undefined,
        null,
        { qtd: 0, total: 0 },
        { qtd: 1, total: 500 },
        { qtd: 4, total: 9999 }, // clamp: disponível 0 nos dois lados
      ] as const) {
        const rep = derivarRepasse(CASTELO, arg);
        const csv = gerarCsvFinanceiro(CASTELO, arg);
        expect(csv).toContain(`Resumo,Receita total (R$),${rep.receitaTotal}`);
        expect(csv).toContain(`Resumo,Valor repassado (R$),${rep.repassado}`);
        expect(csv).toContain(`Resumo,Valor disponível (R$),${rep.disponivel}`);
        expect(csv).toContain(
          `Resumo,Valor a ser disponibilizado (R$),${rep.aSerDisponibilizado}`,
        );
      }
    });

    it('estorno: o CSV volta ao disponível cheio quando a Σ viva zera', () => {
      const csv = gerarCsvFinanceiro(CASTELO, { qtd: 0, total: 0 });
      expect(csv).toContain('Resumo,Valor disponível (R$),8500');
      expect(csv).toContain('Resumo,Valor repassado (R$),0');
    });
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
