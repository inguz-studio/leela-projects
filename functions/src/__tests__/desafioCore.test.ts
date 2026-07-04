/**
 * desafioCore.test.ts — LEELA-S105-T1
 *
 * Unit (puro, sem emulator): tipos/guards do Desafio (RN-110/116/117) e
 * catálogo canônico de 16 ações (RN-114 — 7 Físico, 5 Mental, 4 Espiritual).
 */
import { describe, expect, it } from 'vitest';
import {
  ACOES_POR_PILAR,
  CATALOGO_ACOES,
  CAMPOS_AGREGADOS_DESAFIO,
  contaComoDesafioAtivo,
  getAcaoCatalogo,
  isModeloDesafio,
  isPilar,
  isRecompensaTipo,
  isStatusDesafio,
  isVisibilidadeDesafio,
  TOTAL_ACOES_CATALOGO,
  type Pilar,
} from '@leela/core';

describe('catálogo de ações (RN-114)', () => {
  it('tem exatamente 16 ações', () => {
    expect(CATALOGO_ACOES).toHaveLength(16);
    expect(TOTAL_ACOES_CATALOGO).toBe(16);
  });

  it('distribui 7/5/4 por pilar (Físico/Mental/Espiritual)', () => {
    const porPilar: Record<Pilar, number> = {
      fisico: 0,
      mental: 0,
      espiritual: 0,
    };
    for (const acao of CATALOGO_ACOES) porPilar[acao.pilar]++;
    expect(porPilar).toEqual({ fisico: 7, mental: 5, espiritual: 4 });
    expect(porPilar).toEqual(ACOES_POR_PILAR);
  });

  it('ids são únicos (docId estável da junção)', () => {
    const ids = CATALOGO_ACOES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('pontuação canônica: Correr 2pt/km · Meditar 5pt/10min · Ler 2pt/10pág', () => {
    expect(getAcaoCatalogo('correr')).toMatchObject({
      pilar: 'fisico',
      pontosBase: 2,
      unidadeBase: 1,
      icone: 'footprints',
    });
    expect(getAcaoCatalogo('meditar')).toMatchObject({
      pilar: 'espiritual',
      pontosBase: 5,
      unidadeBase: 10,
      icone: 'sparkles',
    });
    expect(getAcaoCatalogo('ler')).toMatchObject({
      pilar: 'mental',
      pontosBase: 2,
      unidadeBase: 10,
      icone: 'book-open',
    });
  });

  it('toda ação tem pontosBase > 0, unidadeBase ≥ 1 e ícone Lucide', () => {
    for (const acao of CATALOGO_ACOES) {
      expect(acao.pontosBase).toBeGreaterThan(0);
      expect(acao.unidadeBase).toBeGreaterThanOrEqual(1);
      expect(acao.icone.length).toBeGreaterThan(0);
      expect(acao.nome.length).toBeGreaterThan(0);
    }
  });

  it('getAcaoCatalogo retorna null para ação inexistente', () => {
    expect(getAcaoCatalogo('crossfit')).toBeNull();
  });
});

describe('guards de desafio (RN-110/116/117)', () => {
  it('isModeloDesafio aceita A/B/C e rejeita o resto', () => {
    expect(isModeloDesafio('A')).toBe(true);
    expect(isModeloDesafio('B')).toBe(true);
    expect(isModeloDesafio('C')).toBe(true);
    expect(isModeloDesafio('D')).toBe(false);
    expect(isModeloDesafio('a')).toBe(false);
    expect(isModeloDesafio(undefined)).toBe(false);
  });

  it('isStatusDesafio: rascunho/ativo/encerrado', () => {
    expect(isStatusDesafio('rascunho')).toBe(true);
    expect(isStatusDesafio('ativo')).toBe(true);
    expect(isStatusDesafio('encerrado')).toBe(true);
    expect(isStatusDesafio('arquivado')).toBe(false);
  });

  it('isRecompensaTipo: 4 tipos (RN-116)', () => {
    expect(isRecompensaTipo('medalha_digital')).toBe(true);
    expect(isRecompensaTipo('cupom')).toBe(true);
    expect(isRecompensaTipo('medalha_fisica')).toBe(true);
    expect(isRecompensaTipo('custom')).toBe(true);
    expect(isRecompensaTipo('dinheiro')).toBe(false);
  });

  it('isVisibilidadeDesafio: membros/convite/publico (RN-117)', () => {
    expect(isVisibilidadeDesafio('membros')).toBe(true);
    expect(isVisibilidadeDesafio('convite')).toBe(true);
    expect(isVisibilidadeDesafio('publico')).toBe(true);
    expect(isVisibilidadeDesafio('privado')).toBe(false);
  });

  it('isPilar: fisico/mental/espiritual', () => {
    expect(isPilar('fisico')).toBe(true);
    expect(isPilar('mental')).toBe(true);
    expect(isPilar('espiritual')).toBe(true);
    expect(isPilar('financeiro')).toBe(false);
  });

  it('contaComoDesafioAtivo: só status ativo entra no ∑ qtdDesafiosAtivos', () => {
    expect(contaComoDesafioAtivo('ativo')).toBe(true);
    expect(contaComoDesafioAtivo('rascunho')).toBe(false);
    expect(contaComoDesafioAtivo('encerrado')).toBe(false);
  });

  it('CAMPOS_AGREGADOS_DESAFIO espelha os campos guardados nas Rules', () => {
    expect(CAMPOS_AGREGADOS_DESAFIO).toEqual([
      'qtdParticipantes',
      'progressoPct',
      'progressoPorPilar',
    ]);
  });
});
