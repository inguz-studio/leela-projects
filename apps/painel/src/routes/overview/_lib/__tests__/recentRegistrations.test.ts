import { describe, expect, it } from 'vitest';
import { badgeStatusInscrito, derivarInscricoesRecentes, valorDaInscricao } from '../recentRegistrations';
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

  it('T6: view carrega valor (null quando ausente) e a coluna Data derivada', () => {
    const agora = new Date(2026, 3, 19, 15, 0);
    const [comValor, semValor] = derivarInscricoesRecentes(
      [
        mkInscricao({ id: '1', valor: 189, criadoEm: ts(new Date(2026, 3, 19, 14, 22)) }),
        mkInscricao({ id: '2', criadoEm: ts(new Date(2026, 3, 18, 19, 58)) }),
      ],
      5,
      agora
    );
    expect(comValor!.valor).toBe(189);
    expect(comValor!.quando).toBe('Hoje · 14:22');
    expect(semValor!.valor).toBeNull();
    expect(semValor!.quando).toBe('Ontem · 19:58');
  });
});

describe('valorDaInscricao (T6 — preço via percursos, RN-200)', () => {
  const percursos = [
    { nome: '21km', preco: 189 },
    { nome: 'MTB 90km', preco: 245 },
  ];

  it('match case-insensitive com trim → preço do percurso', () => {
    expect(valorDaInscricao(percursos, '21km')).toBe(189);
    expect(valorDaInscricao(percursos, ' mtb 90KM ')).toBe(245);
  });

  it('sem match / sem percursos / modalidade vazia → null (nunca inventa)', () => {
    expect(valorDaInscricao(percursos, '10km')).toBeNull();
    expect(valorDaInscricao([], '21km')).toBeNull();
    expect(valorDaInscricao(undefined, '21km')).toBeNull();
    expect(valorDaInscricao(percursos, '  ')).toBeNull();
  });

  it('preço 0 é válido (percurso gratuito ≠ desconhecido)', () => {
    expect(valorDaInscricao([{ nome: 'Kids', preco: 0 }], 'Kids')).toBe(0);
  });
});
