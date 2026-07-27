// =============================================================================
// Derivações da Caixa do evento. A rodada DEC-0727C trocou o mundo que este
// arquivo cravava — de novo, e mais fundo. Verbatim do dono: *"o que devemos
// mostrar: Receita Total, Disponível para Repasse, Valor Repassado. nao
// complica essa porra. Faz o simples."*
//
// Duas mudanças, e as asserções antigas descreviam as duas:
//   1. o card de retenção SAIU da conta visível — não existe mais
//      `aSerDisponibilizado`, e a conservação dos quatro números foi
//      substituída pela invariante que importa (`Receita ≥ Disponível +
//      Repassado`, com a diferença sendo retido + taxa, implícita);
//   2. a BASE do disponível mudou de bruta para LÍQUIDA (RN-367): a Caixa
//      passou a calcular como o saque calcula. As asserções que cravavam
//      `85617 × 0,85` descreviam a base velha e saíram com autorização da
//      DEC-0727C; no lugar entrou a prova de IGUALDADE com o saque no mock
//      canônico do repo (9.700 antes × 8.000 depois), que é mais forte do que
//      qualquer número solto.
//
// `computeDisponivelDoEvento` (core) é exercitada daqui: `packages/core` não
// tem runner de teste próprio, e a suíte que cobre o core (`functions/src/
// __tests__/repasseCore.test.ts`) fica fora do território desta lane. Testá-la
// pelo consumidor é honesto e roda no gate que existe.
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  computeDisponivelDoEvento,
  computeLiberadoPorEvento,
  computeSaldoRepasse,
  RETENCAO_REPASSE_PCT_DEFAULT,
} from '@leela/core';
import {
  breakdownFinanceiro,
  derivarRepasse,
  gerarCsvFinanceiro,
  SEM_VALOR,
} from '../financeiro';
import type { FinanceiroEvento } from '@leela/api-client';

/**
 * MOCK CANÔNICO do repo (o mesmo do `requestRepasse.integration.test.ts` e da
 * tabela do vetor 3 da review CAIXADISP-REV): bruto 12.000 · líquido 10.000 ·
 * retenção 15% ⇒ liberado 8.500.
 */
function mkFin(over: Partial<FinanceiroEvento> = {}): FinanceiroEvento {
  return {
    tenantId: 'castelo',
    receitaBruta: 12000,
    taxaPct: 16.67,
    taxaValor: 2000,
    receitaLiquida: 10000,
    inscritos: {
      total: 453,
      porStatus: { confirmado: 450, pendente: 2, cancelado: 1, estornado: 0 },
      porKit: { kit_ouro: 100, kit_prata: 150, kit_basico: 200, sem_kit: 3 },
      porModalidade: { '5k': 100, '10k': 200, '21k': 153 },
    },
    ...over,
  };
}

describe('derivarRepasse — os TRÊS números da DEC-0727C', () => {
  it('devolve receita, disponível e repassado — e nada de "a ser disponibilizado"', () => {
    const rep = derivarRepasse(mkFin());
    expect(rep.receitaTotal).toBe(12000);
    expect(rep.disponivel).toBe(8500); // 10.000 líquido − 15%
    expect(rep.repassado).toBe(0);
    // O quarto número morreu na DEC-0727C: nem como campo ele sobrevive.
    expect(rep).not.toHaveProperty('aSerDisponibilizado');
  });

  it('sem repasse associado: repassado 0 — nada inventado onde não houve movimento', () => {
    expect(derivarRepasse(mkFin()).repassado).toBe(0);
    expect(derivarRepasse(mkFin(), null).repassado).toBe(0);
    // Σ vazia é AUSÊNCIA de repasse, não repasse de R$ 0,00 (RN-235).
    expect(derivarRepasse(mkFin(), { qtd: 0, total: 0 }).repassado).toBe(0);
  });

  it('a receita cobre os outros dois — a diferença é retido + taxa, implícita', () => {
    const rep = derivarRepasse(mkFin(), { qtd: 1, total: 500 });
    expect(rep.disponivel).toBe(8000);
    expect((rep.disponivel ?? 0) + rep.repassado).toBeLessThanOrEqual(rep.receitaTotal);
    // 12.000 − 8.000 − 500 = 3.500 = retenção (1.500) + taxa (2.000).
    expect(rep.receitaTotal - (rep.disponivel ?? 0) - rep.repassado).toBe(3500);
  });
});

// ---------------------------------------------------------------------------
// RN-367 — a Caixa passa a usar a MESMA base do saque autoritativo
// ---------------------------------------------------------------------------

describe('RN-367 · a base do Disponível é a do saque (DEC-0727C)', () => {
  /**
   * A divergência que a review CAIXADISP-REV mediu (vetor 3) e a DEC-0727C
   * fechou. ANTES a Caixa retinha 15% do BRUTO; o saque libera 85% do LÍQUIDO.
   */
  const CANONICO = mkFin(); // bruto 12.000 · líquido 10.000

  it('o número da Caixa É o número do saque autoritativo — não uma estimativa vizinha', () => {
    const repasseVivo = 500;

    // O que o saque autoritativo (`computeSaldoRepasse`, o mesmo do servidor)
    // devolve para um tenant com ESTE único evento e ESTE repasse vivo:
    const doSaque = computeSaldoRepasse({
      eventos: [
        {
          eventoId: 'castelo',
          receitaBruta: CANONICO.receitaBruta,
          receitaLiquida: CANONICO.receitaLiquida,
          encerrado: false,
        },
      ],
      repasses: [{ valor: repasseVivo, estado: 'solicitado' }],
    });

    const daCaixa = derivarRepasse(CANONICO, { qtd: 1, total: repasseVivo });

    expect(doSaque.disponivel).toBe(8000);
    expect(daCaixa.disponivel).toBe(8000);
    expect(daCaixa.disponivel).toBe(doSaque.disponivel); // convergem
  });

  it('a base ANTIGA (15% do BRUTO) daria 9.700 — o número que o modal recusava', () => {
    // Reconstrução explícita da conta morta, para que a regressão seja visível
    // se alguém reintroduzir a base bruta: 12.000 − 1.800 − 500.
    const baseBrutaMorta = CANONICO.receitaBruta * 0.85 - 500;
    expect(baseBrutaMorta).toBe(9700);
    expect(derivarRepasse(CANONICO, { qtd: 1, total: 500 }).disponivel).not.toBe(
      baseBrutaMorta,
    );
  });

  it('encerrar o evento libera a retenção — a Caixa segue o saque também aqui (RN-350)', () => {
    const emAndamento = derivarRepasse(CANONICO, null, { encerrado: false });
    const encerrado = derivarRepasse(CANONICO, null, { encerrado: true });
    expect(emAndamento.disponivel).toBe(8500);
    expect(encerrado.disponivel).toBe(10000); // o líquido inteiro
    expect(encerrado.disponivel).toBe(
      computeLiberadoPorEvento(10000, RETENCAO_REPASSE_PCT_DEFAULT, true),
    );
  });

  it('a % do termo do tenant manda; ausente, o default 15 do core (RN-350)', () => {
    expect(derivarRepasse(CANONICO, null, { encerrado: false, retencaoPct: 20 }).disponivel).toBe(
      8000,
    );
    expect(derivarRepasse(CANONICO, null, { encerrado: false, retencaoPct: 0 }).disponivel).toBe(
      10000,
    );
    expect(derivarRepasse(CANONICO).disponivel).toBe(
      derivarRepasse(CANONICO, null, {
        encerrado: false,
        retencaoPct: RETENCAO_REPASSE_PCT_DEFAULT,
      }).disponivel,
    );
  });

  it('sem termo comercial: disponível INDETERMINADO, nunca zero (decisão #7)', () => {
    const rep = derivarRepasse(mkFin({ receitaLiquida: null }));
    expect(rep.semTermo).toBe(true);
    expect(rep.disponivel).toBeNull();
    // A receita continua sendo fato — o que não dá para saber é o repassável.
    expect(rep.receitaTotal).toBe(12000);
  });

  it('a conta inteira é do core — a Caixa não tem matemática própria', () => {
    const rep = derivarRepasse(CANONICO, { qtd: 1, total: 500 });
    const doCore = computeDisponivelDoEvento({
      receitaLiquida: 10000,
      encerrado: false,
      repassadoVivo: 500,
    });
    expect(rep.disponivel).toBe(doCore.disponivel);
    expect(rep.absorvido).toBe(doCore.absorvido);
    // E o core recusa entrada inválida em vez de devolver número torto.
    expect(() =>
      computeDisponivelDoEvento({ receitaLiquida: 100, encerrado: false, repassadoVivo: -1 }),
    ).toThrow(RangeError);
    expect(() =>
      computeDisponivelDoEvento({
        receitaLiquida: Number.NaN,
        encerrado: false,
        repassadoVivo: 0,
      }),
    ).toThrow(RangeError);
  });
});

// ---------------------------------------------------------------------------
// DEC-0727 — o disponível abate os repasses VIVOS do evento (segue valendo)
// ---------------------------------------------------------------------------

describe('derivarRepasse × repasse vivo (DEC-0727)', () => {
  const CASTELO = mkFin();

  it('ANTES do repasse: disponível 8.500', () => {
    expect(derivarRepasse(CASTELO).disponivel).toBe(8500);
  });

  it('DEPOIS do repasse de R$ 500: o disponível cai para 8.000', () => {
    const rep = derivarRepasse(CASTELO, { qtd: 1, total: 500 });
    expect(rep.repassado).toBe(500);
    expect(rep.disponivel).toBe(8000);
  });

  it('vários repasses vivos abatem a Σ, não o primeiro nem a contagem', () => {
    expect(derivarRepasse(CASTELO, { qtd: 3, total: 2300 }).disponivel).toBe(6200);
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

  it('repasse maior que o liberado: disponível é 0 e a nota só pode declarar o ABSORVIDO', () => {
    const rep = derivarRepasse(CASTELO, { qtd: 1, total: 9999 });
    expect(rep.disponivel).toBe(0);
    expect(rep.disponivel).toBeGreaterThanOrEqual(0);
    // R-2 da review CAIXADISP-REV: o clamp absorveu 8.500 dos 9.999.
    expect(rep.absorvido).toBe(8500);
    expect(rep.absorvido).toBeLessThan(rep.repassado);
  });

  it('centavos: cada número sai cent-exato do abatimento', () => {
    const rep = derivarRepasse(mkFin({ receitaLiquida: 80000 }), { qtd: 2, total: 3200.35 });
    expect(rep.disponivel).toBe(64799.65); // 80.000 − 12.000 − 3.200,35
    expect(rep.absorvido).toBe(3200.35);
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
  it('inclui cabeçalho, o resumo de TRÊS linhas e o breakdown', () => {
    const csv = gerarCsvFinanceiro(mkFin());
    const linhas = csv.split('\r\n');
    expect(linhas[0]).toBe('Categoria,Item,Valor');
    expect(csv).toContain('Resumo,Receita Total (R$),12000');
    expect(csv).toContain('Resumo,Disponível para Repasse (R$),8500');
    expect(csv).toContain('Resumo,Valor Repassado (R$),0');
    expect(csv).toContain('Inscritos,Total,453');
    // O quarto número saiu da tela — e da planilha junto (DEC-0727C).
    expect(csv).not.toContain('a ser disponibilizado');
    expect(csv.split('\r\n').filter((l) => l.startsWith('Resumo,'))).toHaveLength(3);
  });

  it('NÃO expõe taxa/margem da plataforma no CSV (RN-404)', () => {
    const csv = gerarCsvFinanceiro(mkFin());
    expect(csv).not.toContain('Taxa');
    expect(csv).not.toContain('líquida');
  });

  it('sem termo: a planilha leva o MESMO "—" da tela, nunca uma célula que leia como zero', () => {
    const csv = gerarCsvFinanceiro(mkFin({ receitaLiquida: null }));
    expect(csv).toContain(`Resumo,Disponível para Repasse (R$),${SEM_VALOR}`);
    expect(csv).not.toContain('Resumo,Disponível para Repasse (R$),0');
  });

  // A planilha de conciliação NUNCA contradiz o número exibido (invariante da
  // review IA-MENU, achado A-1) — no repassado e no disponível.
  describe('coerência com a tela (invariante A-1 + DEC-0727C)', () => {
    const CASTELO = mkFin();

    it('com repasse vivo: o CSV leva o repassado E o disponível já abatido', () => {
      const csv = gerarCsvFinanceiro(CASTELO, { qtd: 1, total: 500 });
      expect(csv).toContain('Resumo,Valor Repassado (R$),500');
      expect(csv).toContain('Resumo,Disponível para Repasse (R$),8000');
      // Nem o número sem abatimento, nem o da base bruta morta (9.700).
      expect(csv).not.toContain('Resumo,Disponível para Repasse (R$),8500');
      expect(csv).not.toContain('9700');
    });

    it('as 3 linhas do resumo saem da MESMA derivação da tela (nenhuma paralela)', () => {
      for (const contexto of [undefined, { encerrado: true }, { encerrado: false, retencaoPct: 20 }]) {
        for (const arg of [
          undefined,
          null,
          { qtd: 0, total: 0 },
          { qtd: 1, total: 500 },
          { qtd: 4, total: 9999 }, // clamp: disponível 0 nos dois lados
        ] as const) {
          const rep = derivarRepasse(CASTELO, arg, contexto);
          const csv = gerarCsvFinanceiro(CASTELO, arg, contexto);
          expect(csv).toContain(`Resumo,Receita Total (R$),${rep.receitaTotal}`);
          expect(csv).toContain(`Resumo,Disponível para Repasse (R$),${rep.disponivel}`);
          expect(csv).toContain(`Resumo,Valor Repassado (R$),${rep.repassado}`);
        }
      }
    });

    it('estorno: o CSV volta ao disponível cheio quando a Σ viva zera', () => {
      const csv = gerarCsvFinanceiro(CASTELO, { qtd: 0, total: 0 });
      expect(csv).toContain('Resumo,Disponível para Repasse (R$),8500');
      expect(csv).toContain('Resumo,Valor Repassado (R$),0');
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
