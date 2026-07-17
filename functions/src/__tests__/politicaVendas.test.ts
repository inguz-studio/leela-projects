/**
 * politicaVendas.test.ts — LEELA-S305-T1 (E04 · unit puro do kernel)
 *
 * Defaults legais (CDC Art. 49), validação de shape (espelhada nas Rules),
 * parse fail-fast e as DERIVAÇÕES que parametrizam a máquina de S904:
 * roteamento RN-338/339/340 e janelas RN-343/344. Relógio SEMPRE injetado.
 */
import { describe, expect, it } from 'vitest';
import {
  CORTE_HORAS_DEFAULT,
  JANELA_ARREPENDIMENTO_DIAS_DEFAULT,
  parsePoliticaVendas,
  politicaVendasPadrao,
  rotearReembolso,
  transferenciaAberta,
  trocaIngressoAberta,
  validarPoliticaVendas,
  type PoliticaReembolso,
} from '@leela/core';

import type { Timestamp } from '@leela/core';

/** Timestamp estrutural de teste (a derivação só usa toMillis). */
function ts(iso: string): Timestamp {
  const millis = new Date(iso).getTime();
  return {
    seconds: Math.floor(millis / 1000),
    nanoseconds: (millis % 1000) * 1e6,
    toDate: () => new Date(millis),
    toMillis: () => millis,
  };
}

const politicaOk = () => ({
  tenantId: 'castelo-producoes',
  ...politicaVendasPadrao(),
  atualizadoEm: ts('2026-01-01T00:00:00Z'),
});

describe('politicaVendasPadrao — defaults legais (aceite S305-T1)', () => {
  it('7 dias / 48h / SLA 3 / transferência 72h taxa 0 / troca 48h downgrade off', () => {
    const p = politicaVendasPadrao();
    expect(p.reembolso.janelaArrependimentoDias).toBe(7);
    expect(p.reembolso.corteHoras).toBe(48);
    expect(p.reembolso.slaAnaliseDias).toBe(3);
    expect(p.transferencia.janelaHoras).toBe(72);
    expect(p.transferencia.taxa).toBe(0);
    expect(p.trocaIngresso.janelaHoras).toBe(48);
    expect(p.trocaIngresso.permiteReembolsoDowngrade).toBe(false);
    // Flags opt-in nascem DESLIGADAS (RN-343/344)
    expect(p.transferencia.habilitada).toBe(false);
    expect(p.trocaIngresso.habilitada).toBe(false);
  });
});

describe('validarPoliticaVendas — shape (espelho das Rules)', () => {
  it('política padrão é válida', () => {
    expect(validarPoliticaVendas(politicaVendasPadrao())).toEqual([]);
  });

  it('rejeita não-objeto, bloco ausente e campo com tipo errado', () => {
    expect(validarPoliticaVendas(null).length).toBeGreaterThan(0);
    expect(validarPoliticaVendas([]).length).toBeGreaterThan(0);
    const semBloco = { ...politicaVendasPadrao() } as Record<string, unknown>;
    delete semBloco['transferencia'];
    expect(validarPoliticaVendas(semBloco).some((e) => e.includes('transferencia'))).toBe(true);
  });

  it('rejeita inteiro negativo, float, NaN, Infinity e acima do teto', () => {
    const base = politicaVendasPadrao();
    const casos: Array<[string, unknown]> = [
      ['negativo', { ...base, reembolso: { ...base.reembolso, corteHoras: -1 } }],
      ['float', { ...base, reembolso: { ...base.reembolso, janelaArrependimentoDias: 7.5 } }],
      ['NaN', { ...base, reembolso: { ...base.reembolso, slaAnaliseDias: NaN } }],
      ['Infinity', { ...base, transferencia: { ...base.transferencia, taxa: Infinity } }],
      ['teto', { ...base, reembolso: { ...base.reembolso, janelaArrependimentoDias: 91 } }],
      ['taxa negativa', { ...base, transferencia: { ...base.transferencia, taxa: -0.01 } }],
      ['janela 0', { ...base, transferencia: { ...base.transferencia, janelaHoras: 0 } }],
      ['bool forjado', { ...base, trocaIngresso: { ...base.trocaIngresso, habilitada: 'sim' } }],
    ];
    for (const [nome, caso] of casos) {
      expect(validarPoliticaVendas(caso).length, nome).toBeGreaterThan(0);
    }
  });
});

describe('parsePoliticaVendas — fail-fast', () => {
  it('doc válido parseia com id/tenantId', () => {
    const p = parsePoliticaVendas('config', politicaOk() as unknown as Record<string, unknown>);
    expect(p.id).toBe('config');
    expect(p.tenantId).toBe('castelo-producoes');
    expect(p.reembolso.janelaArrependimentoDias).toBe(JANELA_ARREPENDIMENTO_DIAS_DEFAULT);
  });

  it('doc corrompido LANÇA (nunca parametriza a máquina de dinheiro)', () => {
    const corrompido = politicaOk() as unknown as Record<string, unknown>;
    (corrompido['reembolso'] as Record<string, unknown>)['corteHoras'] = 'quarenta e oito';
    expect(() => parsePoliticaVendas('config', corrompido)).toThrow();
    const semTenant = politicaOk() as unknown as Record<string, unknown>;
    delete semTenant['tenantId'];
    expect(() => parsePoliticaVendas('config', semTenant)).toThrow();
  });
});

describe('rotearReembolso — RN-338/339/340 (relógio injetado)', () => {
  const politica: PoliticaReembolso = {
    janelaArrependimentoDias: JANELA_ARREPENDIMENTO_DIAS_DEFAULT,
    corteHoras: CORTE_HORAS_DEFAULT,
    slaAnaliseDias: 3,
  };
  const evento = ts('2026-04-25T12:00:00Z');

  it('dentro de 7 dias da compra e antes do corte ⇒ aprovado_auto (RN-338)', () => {
    const compra = ts('2026-03-01T12:00:00Z');
    const agora = new Date('2026-03-05T12:00:00Z'); // 4 dias após a compra
    expect(rotearReembolso(politica, compra, evento, agora)).toBe('aprovado_auto');
  });

  it('limite EXATO de 7 dias ainda é aprovado_auto; 7d+1ms vira em_analise', () => {
    const compra = ts('2026-03-01T12:00:00Z');
    expect(
      rotearReembolso(politica, compra, evento, new Date('2026-03-08T12:00:00Z'))
    ).toBe('aprovado_auto');
    expect(
      rotearReembolso(politica, compra, evento, new Date('2026-03-08T12:00:00.001Z'))
    ).toBe('em_analise');
  });

  it('fora da janela e antes do corte ⇒ em_analise (RN-340)', () => {
    const compra = ts('2026-01-01T12:00:00Z');
    expect(
      rotearReembolso(politica, compra, evento, new Date('2026-02-01T12:00:00Z'))
    ).toBe('em_analise');
  });

  it('a ≤48h do evento ⇒ bloqueado_corte, MESMO dentro do arrependimento (RN-339 vence RN-338)', () => {
    const compra = ts('2026-04-23T13:00:00Z'); // ontem
    const agora = new Date('2026-04-24T12:00:00Z'); // faltam 24h
    expect(rotearReembolso(politica, compra, evento, agora)).toBe('bloqueado_corte');
    // Limite exato: faltando EXATAMENTE 48h ⇒ bloqueado (<= corte)
    expect(
      rotearReembolso(politica, compra, evento, new Date('2026-04-23T12:00:00Z'))
    ).toBe('bloqueado_corte');
    // 48h + 1ms ⇒ passa do corte (aprovado_auto: comprou ontem)
    expect(
      rotearReembolso(politica, compra, evento, new Date('2026-04-23T11:59:59.999Z'))
    ).toBe('aprovado_auto');
  });

  it('evento já ocorrido ⇒ bloqueado_corte', () => {
    const compra = ts('2026-04-20T12:00:00Z');
    expect(
      rotearReembolso(politica, compra, evento, new Date('2026-05-01T12:00:00Z'))
    ).toBe('bloqueado_corte');
  });
});

describe('janelas de transferência/troca — RN-343/344', () => {
  const evento = ts('2026-04-25T12:00:00Z');

  it('flag desligada ⇒ fechada, mesmo longe do evento', () => {
    expect(
      transferenciaAberta(
        { habilitada: false, janelaHoras: 72, taxa: 0 },
        evento,
        new Date('2026-01-01T00:00:00Z')
      )
    ).toBe(false);
    expect(
      trocaIngressoAberta(
        { habilitada: false, janelaHoras: 48, permiteReembolsoDowngrade: false },
        evento,
        new Date('2026-01-01T00:00:00Z')
      )
    ).toBe(false);
  });

  it('transferência: aberta a >72h; fechada a exatamente 72h e depois', () => {
    const politica = { habilitada: true, janelaHoras: 72, taxa: 0 };
    expect(transferenciaAberta(politica, evento, new Date('2026-04-22T11:59:59.999Z'))).toBe(true);
    expect(transferenciaAberta(politica, evento, new Date('2026-04-22T12:00:00Z'))).toBe(false);
    expect(transferenciaAberta(politica, evento, new Date('2026-04-24T12:00:00Z'))).toBe(false);
  });

  it('troca: aberta a >48h; fechada a exatamente 48h e depois', () => {
    const politica = { habilitada: true, janelaHoras: 48, permiteReembolsoDowngrade: false };
    expect(trocaIngressoAberta(politica, evento, new Date('2026-04-23T11:59:59.999Z'))).toBe(true);
    expect(trocaIngressoAberta(politica, evento, new Date('2026-04-23T12:00:00Z'))).toBe(false);
  });
});
