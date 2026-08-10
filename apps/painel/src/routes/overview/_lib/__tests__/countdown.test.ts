import { describe, expect, it } from 'vitest';
import { derivarCountdown, diasAte, numeroUnidade, rotuloDias } from '../countdown';
import { mkEventoCountdown, ts } from '../../_test/fixtures';

describe('rotuloDias', () => {
  it('8 dias → "08 dias restantes" (zero-pad)', () => {
    expect(rotuloDias(8)).toBe('08 dias restantes');
  });
  it('1 dia → singular', () => {
    expect(rotuloDias(1)).toBe('01 dia restante');
  });
  it('0 ou negativo → "Hoje"', () => {
    expect(rotuloDias(0)).toBe('Hoje');
    expect(rotuloDias(-3)).toBe('Hoje');
  });
  it('12 dias → sem pad', () => {
    expect(rotuloDias(12)).toBe('12 dias restantes');
  });
});

describe('numeroUnidade (T6 — número grande do card)', () => {
  it('8 → "08" + "dias restantes"; 1 → singular; 0 → "Hoje" sem unidade', () => {
    expect(numeroUnidade(8)).toEqual({ numero: '08', unidade: 'dias restantes' });
    expect(numeroUnidade(1)).toEqual({ numero: '01', unidade: 'dia restante' });
    expect(numeroUnidade(0)).toEqual({ numero: 'Hoje', unidade: null });
    expect(numeroUnidade(12)).toEqual({ numero: '12', unidade: 'dias restantes' });
  });
});

describe('diasAte', () => {
  it('27 Abr vs 19 Abr → 8', () => {
    expect(diasAte(ts(new Date('2026-04-27T09:00:00Z')), new Date('2026-04-19T09:00:00Z'))).toBe(8);
  });

  it('BORDA 21:00–00:00 UTC-3 (review #02): dias civis, não buckets de 24h', () => {
    // Prova em 05/07 (meia-noite civil SP = 05T03:00Z); agora = 04/07 22:30 SP.
    const prova = ts(new Date('2026-07-05T03:00:00Z'));
    expect(diasAte(prova, new Date('2026-07-04T22:30:00-03:00'))).toBe(1);
    // No dia da prova, à noite, ainda é "Hoje" (0) — não -1.
    expect(diasAte(prova, new Date('2026-07-05T22:30:00-03:00'))).toBe(0);
  });
});

describe('derivarCountdown (S602-T1)', () => {
  it('próximo evento: 27 Abr vs hoje 19 Abr → "08 dias restantes" + 453/47', () => {
    const view = derivarCountdown(
      [mkEventoCountdown({ qtdInscritos: 453, capacidade: 500, local: 'Florianópolis/SC' })],
      new Date('2026-04-19T09:00:00Z')
    );
    expect(view).not.toBeNull();
    expect(view!.rotulo).toBe('08 dias restantes');
    expect(view!.numero).toBe('08');
    expect(view!.unidade).toBe('dias restantes');
    expect(view!.quando).toBe('27 Abr · Florianópolis/SC');
    expect(view!.qtdInscritos).toBe(453);
    expect(view!.vagasRestantes).toBe(47);
    // Stat "ocupado" do protótipo v3: razão canônica do core, arredondada.
    expect(view!.ocupacaoPct).toBe(91);
    expect(view!.checkinHref).toBe('/eventos/meia-floripa-2026/credenciamento');
    expect(view!.gerenciarHref).toBe('/eventos/meia-floripa-2026');
    expect(view!.inscritosHref).toBe('/eventos/meia-floripa-2026/inscritos');
  });

  it('sem local → quando só com a data curta; sem hora inventada', () => {
    const view = derivarCountdown(
      [mkEventoCountdown()],
      new Date('2026-04-19T09:00:00Z')
    );
    expect(view!.quando).toBe('27 Abr');
  });

  it('escolhe o evento futuro mais próximo, ignorando encerrados e passados', () => {
    const view = derivarCountdown(
      [
        mkEventoCountdown({ slug: 'longe', data: ts(new Date('2026-06-01T00:00:00Z')) }),
        mkEventoCountdown({ slug: 'proximo', data: ts(new Date('2026-04-25T00:00:00Z')) }),
        mkEventoCountdown({ slug: 'passado', data: ts(new Date('2026-04-10T00:00:00Z')) }),
        mkEventoCountdown({ slug: 'encerrado', status: 'encerrado', data: ts(new Date('2026-04-21T00:00:00Z')) }),
      ],
      new Date('2026-04-19T00:00:00Z')
    );
    expect(view!.slug).toBe('proximo');
  });

  it('capacidade desconhecida → ocupacaoPct null (nunca 0 falso)', () => {
    const view = derivarCountdown(
      [mkEventoCountdown({ capacidade: null })],
      new Date('2026-04-19T09:00:00Z')
    );
    expect(view!.ocupacaoPct).toBeNull();
    expect(view!.vagasRestantes).toBeNull();
  });

  it('sem evento futuro → null', () => {
    const view = derivarCountdown(
      [mkEventoCountdown({ data: ts(new Date('2026-01-01T00:00:00Z')) })],
      new Date('2026-04-19T00:00:00Z')
    );
    expect(view).toBeNull();
  });
});
