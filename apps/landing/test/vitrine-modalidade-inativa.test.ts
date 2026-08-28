// =============================================================================
// apps/landing/test/vitrine-modalidade-inativa.test.ts — lane RN-MODALIDADE-E-
// LOTES (RN-578 · 28/08).
//
// O que estes casos travam: a vitrine pública só OFERTA modalidade ATIVA. O
// `leitor.ts` filtra os nomes com `modalidadesOfertaveis` (kernel) ANTES de
// montar a vitrine — inativa (venda suspensa) e oculta somem da página do
// evento, do card da home e do checkout, e o estado de venda passa a ser
// derivado só do que é ofertável. O VENDIDO não é tocado: ingresso e área do
// cliente leem o INSCRITO, nunca esta lista — e o servidor recusa a compra
// nova por conta própria (fail-closed no `carregarInsumos`, provado na suíte
// de integração das functions).
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  deriveEstadoVenda,
  estadoModalidade,
  modalidadesOfertaveis,
  modalidadesVitrine,
  msgModalidadeIndisponivel,
  precoVitrine,
  type LoteVitrine,
} from '@leela/core';

function ts(iso: string): LoteVitrine['inicioEm'] {
  const d = new Date(iso);
  return {
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime(),
  };
}

const AGORA = new Date('2026-08-28T12:00:00Z');
const PROVA = new Date('2026-10-01T09:00:00Z');

/** Lote vigente em AGORA, vendável. */
const LOTE_VIGENTE = {
  modalidade: '10k',
  ordem: 1,
  inicioEm: ts('2026-08-01T00:00:00Z'),
  fimEm: ts('2026-09-15T00:00:00Z'),
  preco: 120,
  quantidadeLimite: 100,
  vendidos: 40,
};

describe('RN-578 · a vitrine só oferta modalidade ATIVA', () => {
  it('inativa e oculta saem da lista ofertável; a ordem do documento fica', () => {
    expect(modalidadesOfertaveis(['5k', '10k', '21k'], ['10k'], ['21k'])).toEqual(['5k']);
    // Sem estado nenhum (evento existente, sem migração): tudo ofertável.
    expect(modalidadesOfertaveis(['5k', '10k'], [], [])).toEqual(['5k', '10k']);
  });

  it('a modalidade inativa deixa de contar para o estado de venda do evento', () => {
    // ÚNICA modalidade vendável está inativa → a vitrine, montada como o
    // leitor monta (nomes filtrados ANTES), diz "encerrado" em vez de ofertar.
    const nomesFiltrados = modalidadesOfertaveis(['10k'], ['10k'], []);
    const vitrine = modalidadesVitrine({
      modalidades: nomesFiltrados,
      percursos: [],
      lotes: [LOTE_VIGENTE],
    });
    expect(vitrine).toEqual([]);
    expect(deriveEstadoVenda(vitrine, PROVA, AGORA)).toBe('encerrado');

    // A MESMA montagem sem o filtro venderia — o filtro é o que muda o fato.
    const semFiltro = modalidadesVitrine({
      modalidades: ['10k'],
      percursos: [],
      lotes: [LOTE_VIGENTE],
    });
    expect(precoVitrine(semFiltro[0]!, AGORA)).toBe(120);
    expect(deriveEstadoVenda(semFiltro, PROVA, AGORA)).toBe('aberto');
  });

  it('as outras modalidades do evento continuam vendendo normalmente', () => {
    const nomes = modalidadesOfertaveis(['5k', '10k'], ['5k'], []);
    const vitrine = modalidadesVitrine({
      modalidades: nomes,
      percursos: [],
      lotes: [LOTE_VIGENTE],
    });
    expect(vitrine.map((m) => m.modalidade)).toEqual(['10k']);
    expect(deriveEstadoVenda(vitrine, PROVA, AGORA)).toBe('aberto');
  });

  it('para o comprador, inativa e oculta são o mesmo fato — uma frase, sem vocabulário interno', () => {
    expect(estadoModalidade('10k', ['10k'], [])).toBe('inativa');
    expect(estadoModalidade('10k', [], ['10k'])).toBe('oculta');
    const msg = msgModalidadeIndisponivel('10k');
    expect(msg).toMatch(/não está disponível para novas inscrições/);
    expect(msg).not.toMatch(/inativa|oculta/i);
  });
});
