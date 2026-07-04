import { describe, expect, it } from 'vitest';
import { badgeStatusInscrito, derivarInscricoesRecentes } from '../recentRegistrations';
import { mkInscricao, ts } from '../../_test/fixtures';

describe('badgeStatusInscrito (RN-204)', () => {
  it('confirmado → Pago (vitoria)', () => {
    expect(badgeStatusInscrito('confirmado')).toEqual({ label: 'Pago', variant: 'vitoria' });
  });
  it('pendente → Pendente (alerta), nunca Pago', () => {
    expect(badgeStatusInscrito('pendente')).toEqual({ label: 'Pendente', variant: 'alerta' });
  });
  it('cancelado → Recusado (vulcao)', () => {
    expect(badgeStatusInscrito('cancelado')).toEqual({ label: 'Recusado', variant: 'vulcao' });
  });
});

describe('derivarInscricoesRecentes (S601-T2)', () => {
  it('ordena por data desc e corta em 5', () => {
    const entradas = [
      mkInscricao({ id: 'a', criadoEm: ts(new Date('2026-04-10T00:00:00Z')) }),
      mkInscricao({ id: 'b', criadoEm: ts(new Date('2026-04-18T00:00:00Z')) }),
      mkInscricao({ id: 'c', criadoEm: ts(new Date('2026-04-15T00:00:00Z')) }),
      mkInscricao({ id: 'd', criadoEm: ts(new Date('2026-04-12T00:00:00Z')) }),
      mkInscricao({ id: 'e', criadoEm: ts(new Date('2026-04-01T00:00:00Z')) }),
      mkInscricao({ id: 'f', criadoEm: ts(new Date('2026-04-05T00:00:00Z')) }),
    ];
    const views = derivarInscricoesRecentes(entradas, 5);
    expect(views).toHaveLength(5);
    expect(views.map((v) => v.id)).toEqual(['b', 'c', 'd', 'a', 'f']);
  });

  it('pendente rende "Pendente" (Alerta) e não "Pago"', () => {
    const [view] = derivarInscricoesRecentes([mkInscricao({ status: 'pendente' })]);
    expect(view!.badge.label).toBe('Pendente');
    expect(view!.badge.variant).toBe('alerta');
  });

  it('não muta o array de entrada', () => {
    const entradas = [
      mkInscricao({ id: 'x', criadoEm: ts(new Date('2026-04-01T00:00:00Z')) }),
      mkInscricao({ id: 'y', criadoEm: ts(new Date('2026-04-20T00:00:00Z')) }),
    ];
    derivarInscricoesRecentes(entradas);
    expect(entradas.map((i) => i.id)).toEqual(['x', 'y']);
  });
});
