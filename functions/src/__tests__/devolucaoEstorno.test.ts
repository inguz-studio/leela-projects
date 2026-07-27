/**
 * devolucaoEstorno.test.ts — LEELA-ESTORNO-T2 (RN-351/352)
 *
 * A política dos 7 dias, pura (decisão 42 do dono: "aceito a proposta dos 7
 * dias"). Duas perguntas separadas de propósito:
 *   - `dentroDaJanelaArrependimento`: o relógio da COMPRA (art. 49), que não
 *     depende de quão perto o evento está;
 *   - `calcularDevolucaoEstorno`: o que volta ao comprador e o que fica.
 *
 * O invariante de dinheiro que estas provas prendem: face + taxaDevolvida +
 * taxaRetida fecha SEMPRE com o que o comprador pagou, cent-exato.
 */

import { describe, expect, it } from 'vitest';
import {
  JANELA_ARREPENDIMENTO_DIAS_DEFAULT,
  CORTE_HORAS_DEFAULT,
  calcularDevolucaoEstorno,
  dentroDaJanelaArrependimento,
  politicaVendasPadrao,
  roundMoney,
  type PoliticaReembolso,
} from '@leela/core';
import { Timestamp } from 'firebase-admin/firestore';

const ts = (iso: string) => Timestamp.fromDate(new Date(iso)) as unknown as never;

const politicaRetem: PoliticaReembolso = {
  janelaArrependimentoDias: JANELA_ARREPENDIMENTO_DIAS_DEFAULT,
  corteHoras: CORTE_HORAS_DEFAULT,
  slaAnaliseDias: 3,
  devolveTaxaForaDaJanela: false,
};
const politicaDevolve: PoliticaReembolso = { ...politicaRetem, devolveTaxaForaDaJanela: true };

describe('política padrão — o default é o do dono (RN-352)', () => {
  it('nasce retendo a taxa FORA da janela (padrão de mercado)', () => {
    expect(politicaVendasPadrao().reembolso.devolveTaxaForaDaJanela).toBe(false);
  });
  it('a janela padrão continua sendo a do art. 49 (7 dias)', () => {
    expect(politicaVendasPadrao().reembolso.janelaArrependimentoDias).toBe(7);
  });
});

describe('dentroDaJanelaArrependimento — relógio da COMPRA (RN-351)', () => {
  const compra = ts('2026-03-01T12:00:00Z');

  it('4 dias depois da compra: dentro', () => {
    expect(dentroDaJanelaArrependimento(politicaRetem, compra, new Date('2026-03-05T12:00:00Z'))).toBe(true);
  });

  it('limite EXATO de 7 dias: dentro; 7d + 1ms: fora', () => {
    expect(dentroDaJanelaArrependimento(politicaRetem, compra, new Date('2026-03-08T12:00:00Z'))).toBe(true);
    expect(
      dentroDaJanelaArrependimento(politicaRetem, compra, new Date('2026-03-08T12:00:00.001Z'))
    ).toBe(false);
  });

  it('NÃO depende da proximidade do evento — o art. 49 é da compra', () => {
    // Mesmo instante, mesma compra: a resposta é a mesma com ou sem evento
    // na véspera. Quem bloqueia por véspera é RN-339, e é outra pergunta.
    const agora = new Date('2026-03-03T12:00:00Z');
    expect(dentroDaJanelaArrependimento(politicaRetem, compra, agora)).toBe(true);
    expect(dentroDaJanelaArrependimento({ ...politicaRetem, corteHoras: 720 }, compra, agora)).toBe(true);
  });

  it('janela de 0 dia: só o instante da compra fica dentro', () => {
    const zero = { ...politicaRetem, janelaArrependimentoDias: 0 };
    expect(dentroDaJanelaArrependimento(zero, compra, new Date('2026-03-01T12:00:00Z'))).toBe(true);
    expect(dentroDaJanelaArrependimento(zero, compra, new Date('2026-03-01T12:00:01Z'))).toBe(false);
  });
});

describe('calcularDevolucaoEstorno — o que volta e o que fica (RN-352)', () => {
  const FACE = 170.91;
  const TAXA = 17.95;

  it('DENTRO da janela: volta face + taxa integral (art. 49)', () => {
    const d = calcularDevolucaoEstorno(politicaRetem, FACE, TAXA, true);
    expect(d.valorDevolvido).toBe(188.86);
    expect(d.valorFace).toBe(FACE);
    expect(d.taxaDevolvida).toBe(TAXA);
    expect(d.taxaRetida).toBe(0);
    expect(d.dentroDaJanela).toBe(true);
  });

  it('DENTRO da janela, a política NÃO consegue reter (não é parametrizável)', () => {
    // Reter no prazo de arrependimento é a multa de R$ 300.047,34 do
    // Procon-MG contra a Ingresse. O flag de política não alcança este bolso.
    const d = calcularDevolucaoEstorno(politicaRetem, FACE, TAXA, true);
    const dMesmo = calcularDevolucaoEstorno(politicaDevolve, FACE, TAXA, true);
    expect(d).toEqual(dMesmo);
    expect(d.taxaRetida).toBe(0);
  });

  it('FORA da janela com o default: volta só o face, a taxa fica retida', () => {
    const d = calcularDevolucaoEstorno(politicaRetem, FACE, TAXA, false);
    expect(d.valorDevolvido).toBe(FACE);
    expect(d.taxaDevolvida).toBe(0);
    expect(d.taxaRetida).toBe(TAXA);
    expect(d.dentroDaJanela).toBe(false);
  });

  it('FORA da janela com o flag ligado: volta tudo', () => {
    const d = calcularDevolucaoEstorno(politicaDevolve, FACE, TAXA, false);
    expect(d.valorDevolvido).toBe(188.86);
    expect(d.taxaDevolvida).toBe(TAXA);
    expect(d.taxaRetida).toBe(0);
  });

  it('evento de taxa INCORPORADA (taxa 0): as duas rotas coincidem', () => {
    const dentro = calcularDevolucaoEstorno(politicaRetem, 189.9, 0, true);
    const fora = calcularDevolucaoEstorno(politicaRetem, 189.9, 0, false);
    expect(dentro.valorDevolvido).toBe(189.9);
    expect(fora.valorDevolvido).toBe(189.9);
    expect(fora.taxaRetida).toBe(0);
  });

  it('face + taxaDevolvida + taxaRetida fecha com o pago, cent-exato', () => {
    const casos: [number, number][] = [
      [170.91, 17.95],
      [170.91, 17.94],
      [0.01, 0.01],
      [1234.56, 129.63],
      [99.99, 10.5],
    ];
    for (const [face, taxa] of casos) {
      for (const dentro of [true, false]) {
        for (const politica of [politicaRetem, politicaDevolve]) {
          const d = calcularDevolucaoEstorno(politica, face, taxa, dentro);
          expect(roundMoney(d.valorDevolvido + d.taxaRetida)).toBe(roundMoney(face + taxa));
          expect(roundMoney(d.taxaDevolvida + d.taxaRetida)).toBe(roundMoney(taxa));
          expect(d.valorFace).toBe(roundMoney(face));
        }
      }
    }
  });

  it('taxa negativa (doc corrompido) nunca vira crédito ao comprador', () => {
    const d = calcularDevolucaoEstorno(politicaRetem, 100, -50, true);
    expect(d.valorDevolvido).toBe(100);
    expect(d.taxaDevolvida).toBe(0);
    expect(d.taxaRetida).toBe(0);
  });
});
