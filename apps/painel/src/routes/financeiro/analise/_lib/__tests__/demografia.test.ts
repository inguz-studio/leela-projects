// =============================================================================
// somarDemografia / notaCobertura (E11 §RN-820 · LEELA-BEPEND-T1) — soma pura
// dos agregados por evento + honestidade da cobertura. Nenhum dado individual
// entra neste módulo: as entradas já são buckets do servidor.
// =============================================================================

import { describe, it, expect } from 'vitest';
import type { DemografiaEvento } from '@leela/api-client';
import { notaCobertura, somarDemografia } from '../demografia';

function agg(over: Partial<DemografiaEvento> = {}): DemografiaEvento {
  return {
    tenantId: 'castelo-producoes',
    totalConfirmados: 0,
    faixasEtarias: {
      ate_17: 0,
      '18_24': 0,
      '25_34': 0,
      '35_44': 0,
      '45_54': 0,
      '55_mais': 0,
    },
    semNascimento: 0,
    porGenero: { feminino: 0, masculino: 0, outro: 0, nao_informado: 0 },
    semGenero: 0,
    ...over,
  };
}

describe('somarDemografia (∑ pura dos agregados por evento)', () => {
  it('soma buckets de N eventos e mapeia rótulos canônicos', () => {
    const a = agg({
      totalConfirmados: 10,
      faixasEtarias: { ate_17: 0, '18_24': 4, '25_34': 6, '35_44': 0, '45_54': 0, '55_mais': 0 },
      porGenero: { feminino: 5, masculino: 5, outro: 0, nao_informado: 0 },
    });
    const b = agg({
      totalConfirmados: 5,
      faixasEtarias: { ate_17: 0, '18_24': 1, '25_34': 0, '35_44': 4, '45_54': 0, '55_mais': 0 },
      porGenero: { feminino: 2, masculino: 2, outro: 1, nao_informado: 0 },
    });
    const soma = somarDemografia([a, b]);
    expect(soma.totalConfirmados).toBe(15);
    expect(soma.faixas).toEqual([
      { label: '18–24', value: 5 },
      { label: '25–34', value: 6 },
      { label: '35–44', value: 4 },
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
  });
});

describe('notaCobertura (§2.12 — declara sobre quem os gráficos falam)', () => {
  it('cobertura total → null (nota desnecessária)', () => {
    const soma = somarDemografia([
      agg({
        totalConfirmados: 4,
        faixasEtarias: { ate_17: 0, '18_24': 4, '25_34': 0, '35_44': 0, '45_54': 0, '55_mais': 0 },
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
        faixasEtarias: { ate_17: 0, '18_24': 7, '25_34': 0, '35_44': 0, '45_54': 0, '55_mais': 0 },
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
