/**
 * faceMinimaVenda.test.ts — RN-559 (unit puro, sem emulator)
 *
 * A venda PAGA tem face mínima de R$ 10,00 (decisão do dono em 2026-08-11,
 * item SERV-2). Três fatos que este arquivo prova, e que a lane inteira repete
 * nas outras duas camadas:
 *
 *   R$ 9,99  → RECUSA, e a recusa é a NOMEADA ('face_abaixo_da_minima')
 *   R$ 10,00 → passa (a fronteira é inclusiva)
 *   R$ 0,00  → passa (inscrição gratuita continua permitida)
 *
 * FALSIFICAÇÃO do valor: se alguém trocar o mínimo de 10 para 5, o caso de
 * R$ 5,00 abaixo quebra. Se alguém tornar o gratuito proibido, o caso de
 * R$ 0,00 quebra. Se alguém trocar a recusa nomeada por uma genérica, os
 * casos de motivo quebram.
 */
import { describe, expect, it } from 'vitest';
import {
  FACE_MINIMA_VENDA_PAGA_CENTAVOS,
  FACE_MINIMA_VENDA_PAGA_REAIS,
  MSG_FACE_MINIMA_VENDA_PAGA,
  faceMinimaVendaPagaValida,
  validarFaceMinimaVendaPaga,
} from '@leela/core';

describe('RN-559 — a constante', () => {
  it('o mínimo da venda paga é R$ 10,00', () => {
    expect(FACE_MINIMA_VENDA_PAGA_REAIS).toBe(10);
  });

  it('a mesma face em centavos inteiros é 1000', () => {
    expect(FACE_MINIMA_VENDA_PAGA_CENTAVOS).toBe(1000);
    expect(FACE_MINIMA_VENDA_PAGA_CENTAVOS).toBe(FACE_MINIMA_VENDA_PAGA_REAIS * 100);
  });
});

describe('RN-559 — faceMinimaVendaPagaValida', () => {
  it('R$ 9,99 é recusado (a venda paga barata que a regra existe para matar)', () => {
    expect(faceMinimaVendaPagaValida(9.99)).toBe(false);
  });

  it('R$ 10,00 passa — a fronteira é inclusiva', () => {
    expect(faceMinimaVendaPagaValida(10)).toBe(true);
  });

  it('R$ 0,00 passa — gratuidade não é venda', () => {
    expect(faceMinimaVendaPagaValida(0)).toBe(true);
  });

  it('o centavo acima de zero já é venda paga, e já é recusado', () => {
    expect(faceMinimaVendaPagaValida(0.01)).toBe(false);
  });

  it('R$ 5,00 é recusado — falsifica o mínimo trocado para 5', () => {
    expect(faceMinimaVendaPagaValida(5)).toBe(false);
  });

  it('R$ 10,01 e faces grandes passam', () => {
    expect(faceMinimaVendaPagaValida(10.01)).toBe(true);
    expect(faceMinimaVendaPagaValida(120)).toBe(true);
  });

  it('a faixa inteira de R$ 0,01 a R$ 9,99, centavo a centavo, é recusada', () => {
    const recusados: number[] = [];
    for (let centavos = 1; centavos <= 999; centavos++) {
      if (!faceMinimaVendaPagaValida(centavos / 100)) recusados.push(centavos);
    }
    expect(recusados).toHaveLength(999);
  });

  it('a faixa de R$ 10,00 a R$ 20,00, centavo a centavo, passa inteira', () => {
    const aceitos: number[] = [];
    for (let centavos = 1000; centavos <= 2000; centavos++) {
      if (faceMinimaVendaPagaValida(centavos / 100)) aceitos.push(centavos);
    }
    expect(aceitos).toHaveLength(1001);
  });

  it('não-número, infinito e negativo são recusados (shape, não faixa)', () => {
    expect(faceMinimaVendaPagaValida('10')).toBe(false);
    expect(faceMinimaVendaPagaValida(null)).toBe(false);
    expect(faceMinimaVendaPagaValida(undefined)).toBe(false);
    expect(faceMinimaVendaPagaValida(Number.POSITIVE_INFINITY)).toBe(false);
    expect(faceMinimaVendaPagaValida(Number.NaN)).toBe(false);
    expect(faceMinimaVendaPagaValida(-5)).toBe(false);
  });
});

describe('RN-559 — a recusa é NOMEADA, não genérica', () => {
  it('R$ 9,99 recusa com motivo "face_abaixo_da_minima"', () => {
    const veredito = validarFaceMinimaVendaPaga(9.99);
    expect(veredito.ok).toBe(false);
    if (veredito.ok) throw new Error('R$ 9,99 não pode passar');
    expect(veredito.motivo).toBe('face_abaixo_da_minima');
    expect(veredito.mensagem).toBe(MSG_FACE_MINIMA_VENDA_PAGA);
  });

  it('a mensagem diz o número e a saída, em português comum', () => {
    expect(MSG_FACE_MINIMA_VENDA_PAGA).toContain('R$ 10,00');
    expect(MSG_FACE_MINIMA_VENDA_PAGA).toContain('R$ 0,00');
  });

  it('número inválido recusa com OUTRO motivo — os dois consertos são diferentes', () => {
    const veredito = validarFaceMinimaVendaPaga(-1);
    expect(veredito.ok).toBe(false);
    if (veredito.ok) throw new Error('face negativa não pode passar');
    expect(veredito.motivo).toBe('face_nao_e_numero_valido');
  });

  it('R$ 10,00 e R$ 0,00 passam sem motivo nenhum', () => {
    expect(validarFaceMinimaVendaPaga(10)).toEqual({ ok: true });
    expect(validarFaceMinimaVendaPaga(0)).toEqual({ ok: true });
  });
});
