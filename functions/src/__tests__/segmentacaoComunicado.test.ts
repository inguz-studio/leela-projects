/**
 * segmentacaoComunicado.test.ts — LEELA-S109-T1
 *
 * Unit (puro, sem emulator): estimativa de alcance por segmento
 * (estimarAlcance) e validações de formulário do comunicado
 * (validarComunicado + truncarPush — RN-134/135).
 *
 * Os números canônicos vêm de HANDOFF-05 §"Estimativas de alcance por
 * segmento" (Todos 120, Preparação Meia 48, Morro 22, Marcha Mental 31,
 * ativos 85/98/115, pilares 67/38/15).
 */
import { describe, expect, it } from 'vitest';
import {
  estimarAlcance,
  truncarPush,
  validarComunicado,
  PUSH_MAX_CHARS,
  type AgregadosSegmentacao,
  type ComunicadoInput,
} from '@leela/core';

// ── Agregados canônicos do clube CPS (HANDOFF-05) ───────────────────────────

const AGREGADOS_CPS: AgregadosSegmentacao = {
  totalMembrosAtivos: 120,
  participantesPorDesafio: {
    'preparacao-meia-floripa': 48,
    'morro-da-cruz-30-dias': 22,
    'marcha-mental': 31,
  },
  ativosPorJanela: { '7d': 85, '14d': 98, '30d': 115 },
  membrosPorPilar: { fisico: 67, mental: 38, espiritual: 15 },
};

describe('estimarAlcance (S109-T1)', () => {
  it("'todos' → 120 (base ativa)", () => {
    expect(estimarAlcance({ tipo: 'todos' }, AGREGADOS_CPS)).toBe(120);
  });

  it("'Participantes Preparação Meia Floripa' → 48 (aceite do brief)", () => {
    expect(
      estimarAlcance(
        { tipo: 'por_desafio', referencia: 'preparacao-meia-floripa' },
        AGREGADOS_CPS
      )
    ).toBe(48);
  });

  it('demais desafios canônicos: Morro 22 · Marcha Mental 31', () => {
    expect(
      estimarAlcance(
        { tipo: 'por_desafio', referencia: 'morro-da-cruz-30-dias' },
        AGREGADOS_CPS
      )
    ).toBe(22);
    expect(
      estimarAlcance(
        { tipo: 'por_desafio', referencia: 'marcha-mental' },
        AGREGADOS_CPS
      )
    ).toBe(31);
  });

  it('por pilar predominante: físico 67 · mental 38 · espiritual 15', () => {
    expect(
      estimarAlcance({ tipo: 'por_pilar', referencia: 'fisico' }, AGREGADOS_CPS)
    ).toBe(67);
    expect(
      estimarAlcance({ tipo: 'por_pilar', referencia: 'espiritual' }, AGREGADOS_CPS)
    ).toBe(15);
  });

  it('por engajamento: janelas 7d/14d/30d', () => {
    expect(
      estimarAlcance({ tipo: 'por_engajamento', referencia: '7d' }, AGREGADOS_CPS)
    ).toBe(85);
    expect(
      estimarAlcance({ tipo: 'por_engajamento', referencia: '30d' }, AGREGADOS_CPS)
    ).toBe(115);
  });

  it('referência desconhecida ou ausente → null (tela mostra "—")', () => {
    expect(
      estimarAlcance(
        { tipo: 'por_desafio', referencia: 'desafio-fantasma' },
        AGREGADOS_CPS
      )
    ).toBeNull();
    expect(estimarAlcance({ tipo: 'por_desafio' }, AGREGADOS_CPS)).toBeNull();
    expect(
      estimarAlcance({ tipo: 'por_pilar', referencia: 'financeiro' }, AGREGADOS_CPS)
    ).toBeNull();
  });
});

// ── validarComunicado ───────────────────────────────────────────────────────

describe('validarComunicado (SPEC-02 + RN-134/135)', () => {
  const valido: ComunicadoInput = {
    titulo: 'Treino de sábado',
    conteudo: 'Encontro às 7h na Lagoa da Conceição.',
    canal: ['push'],
    segmento: { tipo: 'todos' },
  };

  it('comunicado válido passa sem erros', () => {
    expect(validarComunicado(valido)).toEqual([]);
  });

  it('título com 4 chars é inválido (mín 5 — aceite do brief)', () => {
    const erros = validarComunicado({ ...valido, titulo: 'Oi tu' });
    expect(erros).toEqual([]); // 5 chars exatos passam
    expect(
      validarComunicado({ ...valido, titulo: 'Oi t' }).some((e) =>
        e.includes('título')
      )
    ).toBe(true);
  });

  it('conteúdo < 10 chars é inválido', () => {
    expect(
      validarComunicado({ ...valido, conteudo: 'curto' }).some((e) =>
        e.includes('conteúdo')
      )
    ).toBe(true);
  });

  it('canal vazio e segmento ausente bloqueiam', () => {
    const erros = validarComunicado({
      ...valido,
      canal: [],
      segmento: null,
    });
    expect(erros.some((e) => e.includes('canal'))).toBe(true);
    expect(erros.some((e) => e.includes('segmento'))).toBe(true);
  });

  it('segmento específico sem referência é inválido', () => {
    expect(
      validarComunicado({
        ...valido,
        segmento: { tipo: 'por_desafio' },
      }).some((e) => e.includes('referência'))
    ).toBe(true);
  });

  it('push com corpo > 160 chars é inválido (RN-134)', () => {
    const longo = 'a'.repeat(200);
    const erros = validarComunicado({ ...valido, conteudo: longo });
    expect(erros.some((e) => e.includes('160'))).toBe(true);

    // o MESMO corpo em email-only é válido (limite é do push)
    expect(
      validarComunicado({ ...valido, canal: ['email'], conteudo: longo })
    ).toEqual([]);
  });

  it('capa com push-only é inválida; com email é válida (RN-135)', () => {
    expect(
      validarComunicado({
        ...valido,
        capaUrl: 'https://cdn/capa.jpg',
      }).some((e) => e.includes('RN-135'))
    ).toBe(true);

    expect(
      validarComunicado({
        ...valido,
        canal: ['push', 'email'],
        capaUrl: 'https://cdn/capa.jpg',
        conteudo: 'Conteúdo ok dentro do limite.',
      })
    ).toEqual([]);
  });
});

// ── truncarPush (RN-134) ────────────────────────────────────────────────────

describe('truncarPush (RN-134)', () => {
  it('200 chars → exatamente 160 (aceite do brief)', () => {
    const truncado = truncarPush('a'.repeat(200));
    expect(truncado).toHaveLength(160);
    expect(truncado).toBe('a'.repeat(160));
  });

  it('texto dentro do limite volta intacto', () => {
    const curto = 'Treino confirmado para sábado às 7h.';
    expect(truncarPush(curto)).toBe(curto);
    expect(truncarPush('')).toBe('');
  });

  it('não corta emoji no meio (integridade de code point)', () => {
    // 159 chars + emoji de 2 code units na fronteira do limite
    const texto = 'a'.repeat(159) + '🏃🏃🏃';
    const truncado = truncarPush(texto);
    expect(Array.from(truncado)).toHaveLength(PUSH_MAX_CHARS);
    // termina num emoji INTEIRO, não num surrogate órfão
    expect(truncado.endsWith('🏃')).toBe(true);
    // string continua bem-formada (round-trip de code points preserva)
    expect(Array.from(truncado).join('')).toBe(truncado);
  });
});
