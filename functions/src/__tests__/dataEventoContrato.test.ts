/**
 * dataEventoContrato.test.ts — fix review Onda1 L2 · achado #01 (+ base do #02)
 *
 * Unit PURO (sem Emulator): contrato de `data` cliente↔servidor.
 *
 * Bug original: o form envia `yyyy-mm-dd`; a UI validava contra a meia-noite
 * LOCAL e o servidor contra `Date.parse` (meia-noite UTC) — data=hoje passava
 * no cliente e morria `invalid-argument` no servidor em UTC-3 (100% repro;
 * idem amanhã após 21:00 locais). Estes testes provam a fonte única
 * (`@leela/core/eventos/dataEvento`) nas bordas de UTC-3 usando INSTANTES
 * explícitos com offset -03:00 — determinísticos em qualquer TZ de runner.
 *
 * Prova negativa: os casos "hoje é válido" e "borda 21:00–00:00" FALHAM
 * contra o código antigo (`Date.parse(data) <= agora` rejeitava ambos).
 */
import { describe, expect, it } from 'vitest';
import {
  FUSO_EVENTO,
  dataEventoNoFuturo,
  dataEventoParaDate,
  dataLocalISO,
  diasCivisAte,
  isDataEventoISO,
} from '@leela/core';
import { validarCriarEventoInput, type CriarEventoInput } from '../eventos/criarEvento';

function inputValido(overrides: Partial<CriarEventoInput> = {}): CriarEventoInput {
  return {
    nome: 'Corrida do Sol 2027',
    data: '2027-09-12',
    local: 'Jurerê, Florianópolis/SC',
    modalidades: ['5k', '10k'],
    percursos: [
      { nome: '5k', preco: 89 },
      { nome: '10k', preco: 129 },
    ],
    ...overrides,
  };
}

describe('isDataEventoISO — shape date-only do form', () => {
  it('aceita yyyy-mm-dd de calendário válido', () => {
    expect(isDataEventoISO('2026-07-10')).toBe(true);
    expect(isDataEventoISO('2026-01-01')).toBe(true);
  });

  it('rejeita datetime ISO, calendário impossível e lixo', () => {
    expect(isDataEventoISO('2027-04-25T07:00:00-03:00')).toBe(false);
    expect(isDataEventoISO('2026-02-30')).toBe(false); // 30 de fevereiro
    expect(isDataEventoISO('2026-13-01')).toBe(false);
    expect(isDataEventoISO('10/07/2026')).toBe(false);
    expect(isDataEventoISO(null)).toBe(false);
  });
});

describe('dataLocalISO / dataEventoNoFuturo — dia civil em UTC-3', () => {
  it('o dia civil em SP difere do UTC entre 21:00 e 00:00 locais', () => {
    // 2026-07-05T01:30Z = 2026-07-04 22:30 em São Paulo
    const bordaNoturna = new Date('2026-07-04T22:30:00-03:00');
    expect(dataLocalISO(bordaNoturna)).toBe('2026-07-04');
    expect(bordaNoturna.toISOString().slice(0, 10)).toBe('2026-07-05'); // ≠ UTC
  });

  it('data = HOJE é válida (o caso que matava o submit — #01)', () => {
    const meioDia = new Date('2026-07-04T12:00:00-03:00');
    expect(dataEventoNoFuturo('2026-07-04', meioDia)).toBe(true);
  });

  it('borda 21:00–00:00 UTC-3: hoje continua válido às 22:30 locais', () => {
    // No código antigo: Date.parse('2026-07-04') = 04T00:00Z < agora → rejeitado
    const agora = new Date('2026-07-04T22:30:00-03:00');
    expect(dataEventoNoFuturo('2026-07-04', agora)).toBe(true);
    expect(dataEventoNoFuturo('2026-07-05', agora)).toBe(true);
  });

  it('ontem (dia civil SP) é inválido — mesmo quando ainda é "hoje" em UTC', () => {
    // 2026-07-05T02:30Z: UTC já é dia 05, SP ainda é 04 → 04 é HOJE, 03 é ontem
    const agora = new Date('2026-07-05T02:30:00Z');
    expect(dataEventoNoFuturo('2026-07-03', agora)).toBe(false);
    expect(dataEventoNoFuturo('2026-07-04', agora)).toBe(true);
  });

  it('shape inválido nunca é "futuro"', () => {
    const agora = new Date('2026-07-04T12:00:00-03:00');
    expect(dataEventoNoFuturo('2026-02-30', agora)).toBe(false);
    expect(dataEventoNoFuturo('amanhã', agora)).toBe(false);
  });
});

describe('dataEventoParaDate — meia-noite civil no fuso do produto (#02)', () => {
  it("'2026-07-10' vira o instante 2026-07-10T03:00:00Z (00:00 em SP)", () => {
    const instante = dataEventoParaDate('2026-07-10');
    expect(instante.toISOString()).toBe('2026-07-10T03:00:00.000Z');
    expect(dataLocalISO(instante)).toBe('2026-07-10');
  });

  it('round-trip com a formatação pinada: o produtor vê o dia que digitou', () => {
    const instante = dataEventoParaDate('2026-07-10');
    const rotulo = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: FUSO_EVENTO,
    }).format(instante);
    expect(rotulo).toBe('10 de julho de 2026');
    // Contraexemplo do bug: UTC-midnight renderiza o dia ANTERIOR em SP
    const utcMidnight = new Date('2026-07-10T00:00:00Z');
    expect(dataLocalISO(utcMidnight)).toBe('2026-07-09');
  });

  it('lança em shape inválido (borda de validação)', () => {
    expect(() => dataEventoParaDate('2026-02-30')).toThrow(/inválida/);
  });
});

describe('diasCivisAte — contagem por calendário, não por buckets de 24h', () => {
  it('0 = o evento é hoje, mesmo à noite (borda 21:00–00:00)', () => {
    const prova = dataEventoParaDate('2026-07-04');
    expect(diasCivisAte(prova, new Date('2026-07-04T22:30:00-03:00'))).toBe(0);
    expect(diasCivisAte(prova, new Date('2026-07-04T05:00:00-03:00'))).toBe(0);
  });

  it('amanhã = 1 e ontem = -1, independentemente da hora', () => {
    const prova = dataEventoParaDate('2026-07-05');
    expect(diasCivisAte(prova, new Date('2026-07-04T23:59:00-03:00'))).toBe(1);
    expect(diasCivisAte(prova, new Date('2026-07-06T00:01:00-03:00'))).toBe(-1);
  });
});

describe('validarCriarEventoInput — contrato de data alinhado à UI (#01)', () => {
  it('data = HOJE (yyyy-mm-dd) passa no servidor — repro do bug corrigido', () => {
    const agora = () => new Date('2026-07-04T15:00:00-03:00');
    expect(
      validarCriarEventoInput(inputValido({ data: '2026-07-04' }), agora)
    ).toEqual([]);
  });

  it('borda 21:00–00:00 UTC-3: hoje e amanhã passam às 22:30 locais', () => {
    const agora = () => new Date('2026-07-04T22:30:00-03:00');
    expect(
      validarCriarEventoInput(inputValido({ data: '2026-07-04' }), agora)
    ).toEqual([]);
    expect(
      validarCriarEventoInput(inputValido({ data: '2026-07-05' }), agora)
    ).toEqual([]);
  });

  it('ontem (date-only) é rejeitado com mensagem acionável', () => {
    const agora = () => new Date('2026-07-04T12:00:00-03:00');
    const erros = validarCriarEventoInput(inputValido({ data: '2026-07-03' }), agora);
    expect(erros.join(' ')).toContain('hoje ou futura');
  });

  it('regressão: datetime ISO segue exigindo instante futuro', () => {
    const agora = () => new Date('2026-07-04T12:00:00-03:00');
    expect(
      validarCriarEventoInput(
        inputValido({ data: '2027-09-12T07:00:00-03:00' }),
        agora
      )
    ).toEqual([]);
    expect(
      validarCriarEventoInput(
        inputValido({ data: '2025-01-01T07:00:00-03:00' }),
        agora
      ).join(' ')
    ).toContain('futura');
  });

  it('calendário impossível é rejeitado como data inválida', () => {
    const agora = () => new Date('2026-07-04T12:00:00-03:00');
    const erros = validarCriarEventoInput(inputValido({ data: '2026-02-30' }), agora);
    expect(erros.length).toBeGreaterThan(0);
  });
});
