// =============================================================================
// somarDemografia / notaCobertura (E11 §RN-820 · LEELA-BEPEND-T1 + RN-822) —
// soma pura dos agregados por evento + honestidade da cobertura + cohort
// idade×sexo com salvaguarda de k-anonimato PÓS-soma. Nenhum dado individual
// entra neste módulo: as entradas já são buckets do servidor.
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { DemografiaEvento } from '@leela/api-client';
import { matrizFaixaGeneroVazia, type MatrizFaixaGenero } from '@leela/core';
import { notaCobertura, notaReprocesso, somarDemografia } from '../demografia';

function faixasZeradas(): DemografiaEvento['faixasEtarias'] {
  return {
    ate_17: 0,
    '18_24': 0,
    '25_29': 0,
    '30_34': 0,
    '35_39': 0,
    '40_44': 0,
    '45_49': 0,
    '50_54': 0,
    '55_59': 0,
    '60_mais': 0,
  };
}

function agg(over: Partial<DemografiaEvento> = {}): DemografiaEvento {
  return {
    tenantId: 'castelo-producoes',
    totalConfirmados: 0,
    faixasEtarias: faixasZeradas(),
    semNascimento: 0,
    porGenero: { feminino: 0, masculino: 0, outro: 0, nao_informado: 0 },
    semGenero: 0,
    faixaXGenero: matrizFaixaGeneroVazia(),
    aguardandoReprocesso: false,
    ...over,
  };
}

/** Matriz com células dadas (demais zeradas). */
function matriz(
  celulas: ReadonlyArray<readonly [keyof MatrizFaixaGenero, keyof MatrizFaixaGenero[keyof MatrizFaixaGenero], number]>,
): MatrizFaixaGenero {
  const m = matrizFaixaGeneroVazia();
  for (const [f, g, v] of celulas) m[f][g] = v;
  return m;
}

describe('somarDemografia (∑ pura dos agregados por evento)', () => {
  it('soma buckets de N eventos e mapeia rótulos canônicos (bandas RN-822)', () => {
    const a = agg({
      totalConfirmados: 10,
      faixasEtarias: { ...faixasZeradas(), '18_24': 4, '25_29': 6 },
      porGenero: { feminino: 5, masculino: 5, outro: 0, nao_informado: 0 },
    });
    const b = agg({
      totalConfirmados: 5,
      faixasEtarias: { ...faixasZeradas(), '18_24': 1, '35_39': 4 },
      porGenero: { feminino: 2, masculino: 2, outro: 1, nao_informado: 0 },
    });
    const soma = somarDemografia([a, b]);
    expect(soma.totalConfirmados).toBe(15);
    expect(soma.faixas).toEqual([
      { label: '18–24', value: 5 },
      { label: '25–29', value: 6 },
      { label: '35–39', value: 4 },
    ]);
    expect(soma.sexo).toEqual([
      { label: 'Feminino', value: 7 },
      { label: 'Masculino', value: 7 },
      { label: 'Outro', value: 1 },
    ]);
  });

  it('bucket zerado NÃO vira barra/fatia (nada de categoria vazia no gráfico)', () => {
    const soma = somarDemografia([agg({ totalConfirmados: 2, semNascimento: 2, semGenero: 2 })]);
    expect(soma.faixas).toEqual([]);
    expect(soma.sexo).toEqual([]);
    expect(soma.comIdade).toBe(0);
    expect(soma.comGenero).toBe(0);
  });

  it('nao_informado é gênero DECLARADO e entra na rosca (≠ semGenero)', () => {
    const soma = somarDemografia([
      agg({
        totalConfirmados: 3,
        porGenero: { feminino: 0, masculino: 0, outro: 0, nao_informado: 3 },
      }),
    ]);
    expect(soma.sexo).toEqual([{ label: 'Não informado', value: 3 }]);
    expect(soma.comGenero).toBe(3);
  });

  it('lista vazia (nenhum evento com agregado) → tudo zero', () => {
    const soma = somarDemografia([]);
    expect(soma.totalConfirmados).toBe(0);
    expect(soma.faixas).toEqual([]);
    expect(soma.sexo).toEqual([]);
    expect(soma.cohort).toEqual([]);
    expect(soma.cohortTemSupressao).toBe(false);
    expect(soma.eventosAguardandoReprocesso).toBe(0);
  });

  it('evento aguardandoReprocesso fica FORA das somas e é CONTADO (review F4 — nunca subcontagem muda)', () => {
    const ok = agg({
      totalConfirmados: 10,
      faixasEtarias: { ...faixasZeradas(), '25_29': 10 },
      porGenero: { feminino: 10, masculino: 0, outro: 0, nao_informado: 0 },
      faixaXGenero: matriz([['25_29', 'feminino', 10]]),
    });
    const antigo = agg({ aguardandoReprocesso: true });
    const soma = somarDemografia([ok, antigo]);
    expect(soma.totalConfirmados).toBe(10); // só o evento migrado
    expect(soma.eventosAguardandoReprocesso).toBe(1);
    expect(soma.faixas).toEqual([{ label: '25–29', value: 10 }]);
    // Nota declara a lacuna; cobertura NÃO é distorcida pelo evento excluído.
    expect(notaReprocesso(soma)).toContain('1 evento');
    expect(notaCobertura(soma)).toBeNull();
  });

  it('notaReprocesso: 0 eventos → null; plural correto', () => {
    expect(notaReprocesso(somarDemografia([]))).toBeNull();
    const soma = somarDemografia([
      agg({ aguardandoReprocesso: true }),
      agg({ aguardandoReprocesso: true }),
    ]);
    expect(notaReprocesso(soma)).toContain('2 eventos');
  });
});

describe('cohort idade×sexo (RN-822 — salvaguarda k-anonimato PÓS-soma)', () => {
  it('células ≥k expõem segmentos por sexo com rótulos e cor fixa por gênero', () => {
    const soma = somarDemografia([
      agg({
        totalConfirmados: 20,
        faixasEtarias: { ...faixasZeradas(), '25_29': 20 },
        porGenero: { feminino: 8, masculino: 12, outro: 0, nao_informado: 0 },
        faixaXGenero: matriz([
          ['25_29', 'feminino', 8],
          ['25_29', 'masculino', 12],
        ]),
      }),
    ]);
    expect(soma.cohort).toEqual([
      {
        faixa: '25–29',
        total: 20,
        segmentos: [
          { label: 'Feminino', value: 8, colorIndex: 0 },
          { label: 'Masculino', value: 12, colorIndex: 1 },
        ],
      },
    ]);
    expect(soma.cohortTemSupressao).toBe(false);
  });

  it('célula 1..k-1 → linha SUPRIMIDA (segmentos null, total visível) + flag', () => {
    const soma = somarDemografia([
      agg({
        faixaXGenero: matriz([
          ['25_29', 'feminino', 8],
          ['25_29', 'masculino', 3], // < k → linha inteira retida
        ]),
      }),
    ]);
    expect(soma.cohort).toEqual([{ faixa: '25–29', total: 11, segmentos: null }]);
    expect(soma.cohortTemSupressao).toBe(true);
  });

  it('a supressão roda DEPOIS da soma: <k em 2 eventos que somam ≥k EXPÕE', () => {
    const ev1 = agg({ faixaXGenero: matriz([['30_34', 'feminino', 3], ['30_34', 'masculino', 5]]) });
    const ev2 = agg({ faixaXGenero: matriz([['30_34', 'feminino', 4], ['30_34', 'masculino', 6]]) });
    const soma = somarDemografia([ev1, ev2]);
    expect(soma.cohort).toEqual([
      {
        faixa: '30–34',
        total: 18,
        segmentos: [
          { label: 'Feminino', value: 7, colorIndex: 0 },
          { label: 'Masculino', value: 11, colorIndex: 1 },
        ],
      },
    ]);
    expect(soma.cohortTemSupressao).toBe(false);
  });

  it('supressão complementar: 1 única linha <k arrasta a exposta de menor total', () => {
    const soma = somarDemografia([
      agg({
        faixaXGenero: matriz([
          ['25_29', 'feminino', 2], // <k → suprimida
          ['30_34', 'feminino', 6], ['30_34', 'masculino', 9], // menor exposta → arrastada
          ['35_39', 'feminino', 10], ['35_39', 'masculino', 10],
        ]),
      }),
    ]);
    expect(soma.cohort.find((l) => l.faixa === '25–29')!.segmentos).toBeNull();
    expect(soma.cohort.find((l) => l.faixa === '30–34')!.segmentos).toBeNull();
    expect(soma.cohort.find((l) => l.faixa === '35–39')!.segmentos).not.toBeNull();
    expect(soma.cohortTemSupressao).toBe(true);
  });
});

describe('notaCobertura (§2.12 — declara sobre quem os gráficos falam)', () => {
  it('cobertura total → null (nota desnecessária)', () => {
    const soma = somarDemografia([
      agg({
        totalConfirmados: 4,
        faixasEtarias: { ...faixasZeradas(), '18_24': 4 },
        porGenero: { feminino: 4, masculino: 0, outro: 0, nao_informado: 0 },
      }),
    ]);
    expect(notaCobertura(soma)).toBeNull();
  });

  it('cobertura parcial → nota com N de M', () => {
    const soma = somarDemografia([
      agg({
        totalConfirmados: 10,
        semNascimento: 3,
        semGenero: 1,
        faixasEtarias: { ...faixasZeradas(), '18_24': 7 },
        porGenero: { feminino: 9, masculino: 0, outro: 0, nao_informado: 0 },
      }),
    ]);
    const nota = notaCobertura(soma);
    expect(nota).toContain('idade: 7 de 10');
    expect(nota).toContain('sexo: 9 de 10');
  });

  it('zero confirmados → null (o EmptyState fala, não a nota)', () => {
    expect(notaCobertura(somarDemografia([]))).toBeNull();
  });
});
