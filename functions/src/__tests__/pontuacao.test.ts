/**
 * pontuacao.test.ts — LEELA-S106-T1
 *
 * Unit (puro, sem emulator): motor de pontuação (RN-115 — bônus +20%
 * 3 pilares/dia e +10% 5+ dias/semana, acumuláveis), validação de
 * publicação por modelo (RN-110/111) e copy de vínculo de evento (RN-113).
 */
import { describe, expect, it } from 'vitest';
import {
  calcularPontos,
  chaveDia,
  chaveSemanaIso,
  copyPreparacao,
  podePublicar,
  pontosDoRegistro,
  validarPublicacao,
  type DesafioParaPublicar,
  type RegistroAcao,
} from '@leela/core';

// ── Helpers de fixture ──────────────────────────────────────────────────────

function registro(
  overrides: Partial<RegistroAcao> & { data: Date }
): RegistroAcao {
  return {
    acaoId: 'correr',
    pilar: 'fisico',
    pontosBase: 2,
    unidadeBase: 1,
    quantidade: 5,
    ...overrides,
  };
}

/** Semana ISO cheia e conhecida: 2026-06-01 (segunda) … 2026-06-07 (domingo) */
const SEG = new Date('2026-06-01T12:00:00Z');
const TER = new Date('2026-06-02T12:00:00Z');
const QUA = new Date('2026-06-03T12:00:00Z');
const QUI = new Date('2026-06-04T12:00:00Z');
const SEX = new Date('2026-06-05T12:00:00Z');

// ── pontosDoRegistro (pontuação canônica do catálogo) ───────────────────────

describe('pontosDoRegistro', () => {
  it('Correr 10 km = 20 pts (2 pt/km)', () => {
    expect(
      pontosDoRegistro(registro({ data: SEG, quantidade: 10 }))
    ).toBe(20);
  });

  it('Ler 30 páginas = 6 pts (2 pts/10 páginas)', () => {
    expect(
      pontosDoRegistro(
        registro({
          data: SEG,
          acaoId: 'ler',
          pilar: 'mental',
          pontosBase: 2,
          unidadeBase: 10,
          quantidade: 30,
        })
      )
    ).toBe(6);
  });

  it('Meditar 30 min = 15 pts (5 pts/10 min)', () => {
    expect(
      pontosDoRegistro(
        registro({
          data: SEG,
          acaoId: 'meditar',
          pilar: 'espiritual',
          pontosBase: 5,
          unidadeBase: 10,
          quantidade: 30,
        })
      )
    ).toBe(15);
  });

  it('quantidade 0 ou negativa não pontua', () => {
    expect(pontosDoRegistro(registro({ data: SEG, quantidade: 0 }))).toBe(0);
    expect(pontosDoRegistro(registro({ data: SEG, quantidade: -5 }))).toBe(0);
  });
});

// ── calcularPontos — bônus RN-115 ───────────────────────────────────────────

describe('calcularPontos (RN-115)', () => {
  it('sem bônus: 1 pilar, poucos dias → total == base', () => {
    const r = calcularPontos([
      registro({ data: SEG, quantidade: 10 }), // 20
      registro({ data: TER, quantidade: 5 }), // 10
    ]);
    expect(r.base).toBe(30);
    expect(r.total).toBe(30);
    expect(r.diasComBonus20).toEqual([]);
    expect(r.semanasComBonus10).toEqual([]);
  });

  it('+20% quando os 3 pilares acontecem no MESMO dia', () => {
    const r = calcularPontos([
      registro({ data: SEG, quantidade: 10 }), // físico 20
      registro({
        data: SEG, acaoId: 'ler', pilar: 'mental',
        pontosBase: 2, unidadeBase: 10, quantidade: 50,
      }), // mental 10
      registro({
        data: SEG, acaoId: 'meditar', pilar: 'espiritual',
        pontosBase: 5, unidadeBase: 10, quantidade: 20,
      }), // espiritual 10
    ]);
    expect(r.base).toBe(40);
    expect(r.total).toBeCloseTo(48, 10); // 40 × 1.2
    expect(r.diasComBonus20).toEqual(['2026-06-01']);
    expect(r.semanasComBonus10).toEqual([]);
  });

  it('3 pilares em dias DIFERENTES não ganham +20%', () => {
    const r = calcularPontos([
      registro({ data: SEG, quantidade: 10 }),
      registro({
        data: TER, acaoId: 'ler', pilar: 'mental',
        pontosBase: 2, unidadeBase: 10, quantidade: 50,
      }),
      registro({
        data: QUA, acaoId: 'meditar', pilar: 'espiritual',
        pontosBase: 5, unidadeBase: 10, quantidade: 20,
      }),
    ]);
    expect(r.total).toBe(r.base);
    expect(r.diasComBonus20).toEqual([]);
  });

  it('+10% quando há 5+ dias com registro na MESMA semana ISO', () => {
    const r = calcularPontos(
      [SEG, TER, QUA, QUI, SEX].map((data) =>
        registro({ data, quantidade: 5 })
      ) // 5 dias × 10 pts
    );
    expect(r.base).toBe(50);
    expect(r.total).toBeCloseTo(55, 10); // 50 × 1.1
    expect(r.semanasComBonus10).toEqual(['2026-W23']);
    expect(r.diasComBonus20).toEqual([]);
  });

  it('5 dias ESPALHADOS em 2 semanas ISO não ganham +10%', () => {
    // sáb+dom (fim da W22) + seg+ter+qua (início da W23)
    const r = calcularPontos(
      [
        new Date('2026-05-30T12:00:00Z'), // sábado W22
        new Date('2026-05-31T12:00:00Z'), // domingo W22
        SEG,
        TER,
        QUA,
      ].map((data) => registro({ data, quantidade: 5 }))
    );
    expect(r.total).toBe(r.base);
    expect(r.semanasComBonus10).toEqual([]);
  });

  it('bônus ACUMULAM: dia 3-pilares dentro de semana 5+ dias → ×1.32', () => {
    const registros: RegistroAcao[] = [
      // Segunda: 3 pilares (10+10+10 = 30 pts → ×1.2 = 36)
      registro({ data: SEG, quantidade: 5 }), // físico 10
      registro({
        data: SEG, acaoId: 'ler', pilar: 'mental',
        pontosBase: 2, unidadeBase: 10, quantidade: 50,
      }), // mental 10
      registro({
        data: SEG, acaoId: 'meditar', pilar: 'espiritual',
        pontosBase: 5, unidadeBase: 10, quantidade: 20,
      }), // espiritual 10
      // Ter–Sex: 4 dias × 10 pts
      ...[TER, QUA, QUI, SEX].map((data) =>
        registro({ data, quantidade: 5 })
      ),
    ];
    const r = calcularPontos(registros);
    expect(r.base).toBe(70);
    // (30×1.2 + 40) × 1.1 = 76 × 1.1 = 83.6
    expect(r.total).toBeCloseTo(83.6, 10);
    expect(r.diasComBonus20).toEqual(['2026-06-01']);
    expect(r.semanasComBonus10).toEqual(['2026-W23']);
    // O dia 3-pilares efetivamente rendeu 30 × 1.32 = 39.6
    const pontosSegunda = r.total - 40 * 1.1;
    expect(pontosSegunda).toBeCloseTo(30 * 1.32, 10);
  });

  it('porPilar soma o total (com bônus distribuído proporcionalmente)', () => {
    const r = calcularPontos([
      registro({ data: SEG, quantidade: 5 }),
      registro({
        data: SEG, acaoId: 'ler', pilar: 'mental',
        pontosBase: 2, unidadeBase: 10, quantidade: 50,
      }),
      registro({
        data: SEG, acaoId: 'meditar', pilar: 'espiritual',
        pontosBase: 5, unidadeBase: 10, quantidade: 20,
      }),
    ]);
    const soma = r.porPilar.fisico + r.porPilar.mental + r.porPilar.espiritual;
    expect(soma).toBeCloseTo(r.total, 10);
  });

  it('sem registros → tudo zero', () => {
    const r = calcularPontos([]);
    expect(r.total).toBe(0);
    expect(r.base).toBe(0);
    expect(r.porPilar).toEqual({ fisico: 0, mental: 0, espiritual: 0 });
  });
});

// ── Calendário ISO ──────────────────────────────────────────────────────────

describe('calendário UTC (chaveDia / chaveSemanaIso)', () => {
  it('chaveDia usa a data-calendário UTC', () => {
    expect(chaveDia(new Date('2026-06-01T23:59:59Z'))).toBe('2026-06-01');
  });

  it('semana ISO: 29 Dez 2025 (segunda) já é 2026-W01', () => {
    expect(chaveSemanaIso(new Date('2025-12-29T12:00:00Z'))).toBe('2026-W01');
    expect(chaveSemanaIso(new Date('2026-01-01T12:00:00Z'))).toBe('2026-W01');
  });

  it('domingo pertence à semana da segunda anterior', () => {
    expect(chaveSemanaIso(new Date('2026-06-07T12:00:00Z'))).toBe('2026-W23');
    expect(chaveSemanaIso(new Date('2026-06-08T12:00:00Z'))).toBe('2026-W24');
  });
});

// ── validarPublicacao (RN-110/111) ──────────────────────────────────────────

describe('validarPublicacao (RN-110/111)', () => {
  const base: DesafioParaPublicar = {
    nome: 'Desafio Teste',
    modelo: 'B',
    dataInicio: new Date('2026-03-01T00:00:00Z'),
    dataFim: new Date('2026-04-26T00:00:00Z'),
    metaTotalPontos: 2000,
  };

  it('Modelo A: toda ação precisa de meta > 0', () => {
    const desafio = { ...base, modelo: 'A' as const };
    expect(
      validarPublicacao(desafio, [
        { acaoRef: 'correr', meta: 80 },
        { acaoRef: 'ler', meta: 300 },
      ])
    ).toEqual([]);

    const erros = validarPublicacao(desafio, [
      { acaoRef: 'correr', meta: 80 },
      { acaoRef: 'ler' }, // sem meta
    ]);
    expect(erros).toHaveLength(1);
    expect(erros[0]).toContain('Modelo A');
    expect(erros[0]).toContain('ler');
  });

  it('Modelo B: exige metaTotalPontos; ações não exigem meta', () => {
    expect(
      validarPublicacao(base, [{ acaoRef: 'correr' }, { acaoRef: 'ler' }])
    ).toEqual([]);

    // omite metaTotalPontos de verdade (exactOptionalPropertyTypes)
    const { metaTotalPontos: _semMeta, ...baseSemMeta } = base;
    const erros = validarPublicacao(baseSemMeta, [{ acaoRef: 'correr' }]);
    expect(erros.some((e) => e.includes('Modelo B'))).toBe(true);
  });

  it('Modelo C completo (meta total + mínimo nos 3 pilares) publica', () => {
    const desafio: DesafioParaPublicar = {
      ...base,
      modelo: 'C',
      minimoPorPilar: { fisico: 300, mental: 300, espiritual: 300 },
    };
    expect(validarPublicacao(desafio, [{ acaoRef: 'correr' }])).toEqual([]);
    expect(podePublicar(desafio, [{ acaoRef: 'correr' }])).toBe(true);
  });

  it('Modelo C SEM mínimo em um pilar → erro (RN-111 — aceite do brief)', () => {
    const desafio: DesafioParaPublicar = {
      ...base,
      modelo: 'C',
      minimoPorPilar: { fisico: 300, mental: 300 }, // falta espiritual
    };
    const erros = validarPublicacao(desafio, [{ acaoRef: 'correr' }]);
    expect(erros).toHaveLength(1);
    expect(erros[0]).toContain('RN-111');
    expect(erros[0]).toContain('espiritual');
    expect(podePublicar(desafio, [{ acaoRef: 'correr' }])).toBe(false);
  });

  it('Modelo C com mínimo 0 num pilar → erro (0 não é mínimo)', () => {
    const desafio: DesafioParaPublicar = {
      ...base,
      modelo: 'C',
      minimoPorPilar: { fisico: 300, mental: 0, espiritual: 300 },
    };
    expect(
      validarPublicacao(desafio, [{ acaoRef: 'correr' }]).some((e) =>
        e.includes('mental')
      )
    ).toBe(true);
  });

  it('validações comuns: nome vazio, datas invertidas, zero ações', () => {
    const erros = validarPublicacao(
      {
        ...base,
        nome: '  ',
        dataInicio: new Date('2026-04-26T00:00:00Z'),
        dataFim: new Date('2026-03-01T00:00:00Z'),
      },
      []
    );
    expect(erros.some((e) => e.includes('nome'))).toBe(true);
    expect(erros.some((e) => e.includes('dataFim'))).toBe(true);
    expect(erros.some((e) => e.includes('1 ação'))).toBe(true);
  });

  // ── T13 · decisão RATIFICADA (Vitor): SEM limite/cap de pontuação ────────
  // A pontuação não tem teto em nenhuma camada (form/core/Rules) — apenas
  // sanidade: número finito e positivo. Estes testes CONGELAM a decisão:
  // se um cap for introduzido, eles quebram e exigem nova decisão.

  it('T13: SEM cap de pontuação — metas e mínimos arbitrariamente altos publicam', () => {
    const desafio: DesafioParaPublicar = {
      ...base,
      modelo: 'C',
      metaTotalPontos: 1_000_000_000,
      minimoPorPilar: {
        fisico: 50_000_000, mental: 50_000_000, espiritual: 50_000_000,
      },
    };
    expect(validarPublicacao(desafio, [{ acaoRef: 'correr' }])).toEqual([]);
    expect(podePublicar(desafio, [{ acaoRef: 'correr' }])).toBe(true);

    // Modelo A com meta por ação gigante também passa
    expect(
      validarPublicacao({ ...base, modelo: 'A' }, [
        { acaoRef: 'correr', meta: 999_999_999 },
      ])
    ).toEqual([]);
  });

  it('T13: sanidade mantida — negativo e NaN seguem rejeitados', () => {
    expect(
      validarPublicacao(
        { ...base, metaTotalPontos: -100 },
        [{ acaoRef: 'correr' }]
      ).some((e) => e.includes('Modelo B'))
    ).toBe(true);
    expect(
      validarPublicacao(
        { ...base, metaTotalPontos: Number.NaN },
        [{ acaoRef: 'correr' }]
      ).some((e) => e.includes('Modelo B'))
    ).toBe(true);
    expect(
      validarPublicacao(
        {
          ...base, modelo: 'C',
          minimoPorPilar: { fisico: -1, mental: 300, espiritual: 300 },
        },
        [{ acaoRef: 'correr' }]
      ).some((e) => e.includes('fisico'))
    ).toBe(true);
  });
});

// ── copyPreparacao (RN-113) ─────────────────────────────────────────────────

describe('copyPreparacao (RN-113)', () => {
  it('gera a copy canônica do aceite do brief', () => {
    expect(copyPreparacao('Meia Maratona Floripa 2026')).toBe(
      '(Preparação para Meia Maratona Floripa 2026)'
    );
  });

  it('trim no nome do evento', () => {
    expect(copyPreparacao('  Trail Run Ratones 2026  ')).toBe(
      '(Preparação para Trail Run Ratones 2026)'
    );
  });

  it('nome vazio → string vazia (sem parênteses órfãos)', () => {
    expect(copyPreparacao('')).toBe('');
    expect(copyPreparacao('   ')).toBe('');
  });
});
