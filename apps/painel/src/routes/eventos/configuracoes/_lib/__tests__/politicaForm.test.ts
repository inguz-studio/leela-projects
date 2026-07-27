/**
 * politicaForm.test.ts — LEELA-ESTORNO-T2 (RN-374)
 *
 * O form da política é conversão pura (form ⇄ domínio). O que estas provas
 * prendem é o caminho de ida e volta do campo NOVO da taxa: um flag que o
 * form dropasse silenciosamente viraria dinheiro devolvido errado no estorno.
 */

import { describe, expect, it } from 'vitest';
import { politicaVendasPadrao, type PoliticaVendas } from '@leela/core';
import {
  construirPolitica,
  valoresDaPolitica,
  validaPoliticaVendas,
} from '../politicaForm';

function politicaGravada(devolveTaxaForaDaJanela: boolean): PoliticaVendas {
  const base = politicaVendasPadrao();
  return {
    id: 'config',
    tenantId: 'castelo-producoes',
    ...base,
    reembolso: { ...base.reembolso, devolveTaxaForaDaJanela },
    atualizadoEm: { seconds: 0, nanoseconds: 0 } as unknown as PoliticaVendas['atualizadoEm'],
  };
}

describe('politicaForm — a taxa fora da janela (RN-374)', () => {
  it('sem política gravada, o form nasce com o default do kernel (retém)', () => {
    expect(valoresDaPolitica(null).devolveTaxaForaDaJanela).toBe(false);
  });

  it('ida e volta preserva o flag ligado (nada é dropado no caminho)', () => {
    const values = valoresDaPolitica(politicaGravada(true));
    expect(values.devolveTaxaForaDaJanela).toBe(true);
    expect(construirPolitica(values).reembolso.devolveTaxaForaDaJanela).toBe(true);
  });

  it('ida e volta preserva o flag desligado', () => {
    const values = valoresDaPolitica(politicaGravada(false));
    expect(construirPolitica(values).reembolso.devolveTaxaForaDaJanela).toBe(false);
  });

  it('os dois estados do flag passam na validação do kernel', () => {
    for (const flag of [true, false]) {
      expect(validaPoliticaVendas(valoresDaPolitica(politicaGravada(flag)))).toEqual([]);
    }
  });
});
