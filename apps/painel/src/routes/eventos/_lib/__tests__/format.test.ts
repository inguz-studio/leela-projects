import { describe, it, expect } from 'vitest';
import { dataEventoParaDate } from '@leela/core';
import { diasParaEvento, formatBRL, formatDataEvento, formatInt } from '../format';
import { ts } from '../../_test/fixtures';

describe('formatBRL', () => {
  it('formata o mock canônico sem decimais', () => {
    //   = espaço não-quebrável usado pelo Intl entre "R$" e o número
    expect(formatBRL(85617).replace(/ /g, ' ')).toBe('R$ 85.617');
  });
});

describe('formatInt', () => {
  it('usa separador de milhar pt-BR', () => {
    expect(formatInt(453)).toBe('453');
    expect(formatInt(1200)).toBe('1.200');
  });
});

describe('formatDataEvento', () => {
  it('formata a data por extenso', () => {
    const out = formatDataEvento(ts(new Date('2026-04-27T12:00:00Z')));
    expect(out).toContain('27');
    expect(out).toContain('2026');
  });

  it('trata data ausente', () => {
    expect(formatDataEvento(null)).toBe('Data a definir');
  });

  it('BORDA (review #02): meia-noite civil de 10/07 exibe "10 de julho", nunca N−1', () => {
    // Round-trip real: o que criarEvento grava para o input '2026-07-10'
    // (2026-07-10T03:00:00Z) renderiza o MESMO dia civil, pinado no fuso do
    // produto — em qualquer TZ de runner. Antes (formatação no fuso local +
    // Timestamp UTC-midnight), UTC-3 exibia "09 de julho".
    const out = formatDataEvento(ts(dataEventoParaDate('2026-07-10')));
    expect(out).toBe('10 de julho de 2026');
  });
});

describe('diasParaEvento', () => {
  it('conta dias até a prova', () => {
    const dias = diasParaEvento(
      ts(new Date('2026-04-25T00:00:00Z')),
      new Date('2026-04-20T00:00:00Z'),
    );
    expect(dias).toBe(5);
  });

  it('null quando não há data', () => {
    expect(diasParaEvento(undefined)).toBeNull();
  });

  it('BORDA 21:00–00:00 UTC-3 (review #02): "é hoje" segue hoje às 22:30 locais', () => {
    const prova = ts(dataEventoParaDate('2026-07-04'));
    // 22:30 em SP = 01:30Z do dia seguinte — buckets de 24h davam -1/0 instável
    expect(diasParaEvento(prova, new Date('2026-07-04T22:30:00-03:00'))).toBe(0);
    // e o dia anterior às 23:59 ainda conta 1 dia inteiro de calendário
    expect(diasParaEvento(prova, new Date('2026-07-03T23:59:00-03:00'))).toBe(1);
  });
});
