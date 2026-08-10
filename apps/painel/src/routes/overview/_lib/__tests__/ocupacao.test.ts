// =============================================================================
// Ocupação dos últimos eventos — a derivação pura da Visão Geral v3.
//
// Os casos existem para travar as duas decisões de honestidade do bloco:
// evento sem denominador não vira barra, e "últimos" é por data da prova (a
// listagem do organizador chega na ordem inversa, que é a certa para "o que vem
// aí" e a errada para "o que já rodou").
// =============================================================================

import { describe, expect, it } from 'vitest';
import { derivarOcupacao, OCUPACAO_MAX_EVENTOS } from '../ocupacao';
import type { EventoOcupacaoInput } from '../ocupacao';
import { ts as timestamp } from '../../_test/fixtures';

const ts = (iso: string) => timestamp(new Date(iso));

function evento(over: Partial<EventoOcupacaoInput> = {}): EventoOcupacaoInput {
  return {
    nome: 'Meia Maratona Floripa',
    slug: 'meia-floripa-2026',
    qtdInscritos: 453,
    capacidade: 500,
    data: ts('2026-04-27T09:00:00Z'),
    ...over,
  };
}

describe('derivarOcupacao · o denominador manda', () => {
  it('calcula inscritos sobre vagas', () => {
    const { linhas } = derivarOcupacao([evento()]);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({
      slug: 'meia-floripa-2026',
      inscritos: 453,
      capacidade: 500,
    });
    expect(linhas[0]!.ocupacao).toBeCloseTo(0.906, 3);
  });

  it('deixa de fora o evento sem capacidade conhecida e diz quantos ficaram', () => {
    const { linhas, semCapacidade } = derivarOcupacao([
      evento({ slug: 'com-capacidade' }),
      evento({ slug: 'sem-capacidade', capacidade: null }),
      evento({ slug: 'capacidade-zero', capacidade: 0 }),
    ]);
    expect(linhas.map((l) => l.slug)).toEqual(['com-capacidade']);
    expect(semCapacidade).toBe(2);
  });

  it('não inventa ocupação: lista inteira sem capacidade devolve zero barras', () => {
    const r = derivarOcupacao([evento({ capacidade: null }), evento({ capacidade: null })]);
    expect(r.linhas).toEqual([]);
    expect(r.semCapacidade).toBe(2);
  });

  it('overbooking passa de 100% em vez de ser aparado', () => {
    const { linhas } = derivarOcupacao([evento({ qtdInscritos: 520, capacidade: 500 })]);
    expect(linhas[0]!.ocupacao).toBeGreaterThan(1);
  });
});

describe('derivarOcupacao · "últimos" é por data da prova', () => {
  it('ordena da prova mais recente para a mais antiga', () => {
    const { linhas } = derivarOcupacao([
      evento({ slug: 'antigo', data: ts('2026-01-10T09:00:00Z') }),
      evento({ slug: 'recente', data: ts('2026-05-10T09:00:00Z') }),
      evento({ slug: 'meio', data: ts('2026-03-10T09:00:00Z') }),
    ]);
    expect(linhas.map((l) => l.slug)).toEqual(['recente', 'meio', 'antigo']);
  });

  it('mostra no máximo cinco eventos', () => {
    const muitos = Array.from({ length: 9 }, (_, i) =>
      evento({ slug: `e${i}`, data: ts(`2026-0${(i % 9) + 1}-10T09:00:00Z`) })
    );
    expect(derivarOcupacao(muitos).linhas).toHaveLength(OCUPACAO_MAX_EVENTOS);
  });

  it('evento sem data não quebra a ordenação (fica ao fim, ordem relativa preservada)', () => {
    const { linhas } = derivarOcupacao([
      evento({ slug: 'sem-data-1', data: null }),
      evento({ slug: 'com-data', data: ts('2026-05-10T09:00:00Z') }),
      evento({ slug: 'sem-data-2', data: null }),
    ]);
    expect(linhas.map((l) => l.slug)).toEqual(['com-data', 'sem-data-1', 'sem-data-2']);
  });
});
