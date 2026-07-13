/**
 * registroCore.test.ts — LEELA-S1307-T1 (E13 adiantado · Onda 2 T2-L2)
 *
 * Unit PURO (sem Emulator) do domínio de registro/agregação (@leela/core):
 *   - validarRegistro contra o catálogo (RN-114);
 *   - agregarParticipante com os bônus RN-115 (+20% dia 3 pilares, +10%
 *     semana 5+ dias, ACUMULÁVEIS — 1.2 × 1.1) + diasAtivos distintos;
 *   - metaTotalEmPontos por modelo (A deriva das ações; B/C usam
 *     metaTotalPontos);
 *   - derivarProgressoDesafio/derivarProgressoPorPilar.
 */
import { describe, expect, it } from 'vitest';
import {
  agregarParticipante,
  dentroDaJanelaDesafio,
  derivarProgressoDesafio,
  derivarProgressoPorPilar,
  getAcaoCatalogo,
  isOrigemRegistro,
  metaTotalEmPontos,
  paraRegistroAcao,
  validarRegistro,
  type RegistroAcao,
} from '@leela/core';

const CORRER = getAcaoCatalogo('correr')!; // 2 pts/km (fisico)
const LER = getAcaoCatalogo('ler')!; // 2 pts/10 páginas (mental)
const MEDITAR = getAcaoCatalogo('meditar')!; // 5 pts/10 min (espiritual)

function reg(
  acao: typeof CORRER,
  quantidade: number,
  dataIso: string
): RegistroAcao {
  return paraRegistroAcao(
    { acaoRef: acao.id, quantidade, data: new Date(dataIso) },
    acao
  );
}

describe('validarRegistro — RN-114 (sempre contra o catálogo)', () => {
  const base = {
    acaoRef: 'correr',
    pilar: 'fisico',
    quantidade: 5,
    unidade: 'km',
    origem: 'manual',
  } as const;

  it('registro coerente com o catálogo passa', () => {
    expect(validarRegistro(base, CORRER)).toEqual([]);
  });

  it('ação inexistente no catálogo é erro', () => {
    expect(validarRegistro({ ...base, acaoRef: 'crossfit' }, null)).toHaveLength(1);
  });

  it('pilar divergente do catálogo é erro (denormalizado nunca vence)', () => {
    expect(
      validarRegistro({ ...base, pilar: 'mental' }, CORRER).join(' ')
    ).toContain('Pilar divergente');
  });

  it('unidade divergente é erro', () => {
    expect(
      validarRegistro({ ...base, unidade: 'min' }, CORRER).join(' ')
    ).toContain('Unidade divergente');
  });

  it.each([0, -1, NaN, Infinity])('quantidade inválida (%s) é erro', (q) => {
    expect(
      validarRegistro({ ...base, quantidade: q }, CORRER).join(' ')
    ).toContain('quantidade');
  });

  it('origem fora do enum é erro', () => {
    expect(isOrigemRegistro('strava')).toBe(false);
    expect(
      validarRegistro({ ...base, origem: 'strava' as never }, CORRER).join(' ')
    ).toContain('origem');
  });

  it('clubeId sem desafioId (e vice-versa) é erro — par ADR-009', () => {
    expect(
      validarRegistro({ ...base, clubeId: 'cps' }, CORRER).join(' ')
    ).toContain('ambos ou nenhum');
    expect(
      validarRegistro({ ...base, desafioId: 'x' }, CORRER).join(' ')
    ).toContain('ambos ou nenhum');
    expect(
      validarRegistro({ ...base, clubeId: 'cps', desafioId: 'x' }, CORRER)
    ).toEqual([]);
  });
});

describe('paraRegistroAcao — catálogo é a fonte', () => {
  it('pilar/pontosBase/unidadeBase saem do catálogo, não do registro', () => {
    const r = paraRegistroAcao(
      { acaoRef: 'meditar', quantidade: 20, data: new Date('2026-03-02T10:00:00Z') },
      MEDITAR
    );
    expect(r.pilar).toBe('espiritual');
    expect(r.pontosBase).toBe(5);
    expect(r.unidadeBase).toBe(10);
  });
});

describe('agregarParticipante — RN-115 acumulável + diasAtivos', () => {
  it('3 pilares no MESMO dia ⇒ +20% (17 base → 20.4)', () => {
    // correr 5km = 10 · ler 10pg = 2 · meditar 10min = 5 ⇒ base 17
    const agregado = agregarParticipante([
      reg(CORRER, 5, '2026-03-02T10:00:00Z'),
      reg(LER, 10, '2026-03-02T21:00:00Z'),
      reg(MEDITAR, 10, '2026-03-02T22:00:00Z'),
    ]);
    expect(agregado.pontos).toBeCloseTo(20.4, 5);
    expect(agregado.diasAtivos).toBe(1);
  });

  it('5 dias distintos na semana ⇒ +10% no total da semana', () => {
    // seg..sex da mesma semana ISO (2026-03-02 é segunda) — 1km/dia = 2 pts
    const agregado = agregarParticipante([
      reg(CORRER, 1, '2026-03-02T10:00:00Z'),
      reg(CORRER, 1, '2026-03-03T10:00:00Z'),
      reg(CORRER, 1, '2026-03-04T10:00:00Z'),
      reg(CORRER, 1, '2026-03-05T10:00:00Z'),
      reg(CORRER, 1, '2026-03-06T10:00:00Z'),
    ]);
    // base 10 × 1.1 = 11 (nenhum dia com 3 pilares)
    expect(agregado.pontos).toBeCloseTo(11, 5);
    expect(agregado.diasAtivos).toBe(5);
  });

  it('AMBOS acumulam: dia 3-pilares dentro de semana 5+ dias ⇒ 1.2 × 1.2? NÃO — 1.2 × 1.1', () => {
    // dia 1 (3 pilares): 10+2+5 = 17 → ×1.2 = 20.4
    // dias 2-5: 2 pts/dia = 8
    // semana com 5 dias ⇒ tudo ×1.1 → (20.4 + 8) × 1.1 = 31.24 → arred1 31.2
    const agregado = agregarParticipante([
      reg(CORRER, 5, '2026-03-02T10:00:00Z'),
      reg(LER, 10, '2026-03-02T21:00:00Z'),
      reg(MEDITAR, 10, '2026-03-02T22:00:00Z'),
      reg(CORRER, 1, '2026-03-03T10:00:00Z'),
      reg(CORRER, 1, '2026-03-04T10:00:00Z'),
      reg(CORRER, 1, '2026-03-05T10:00:00Z'),
      reg(CORRER, 1, '2026-03-06T10:00:00Z'),
    ]);
    expect(agregado.pontos).toBeCloseTo(31.2, 5);
    expect(agregado.diasAtivos).toBe(5);
    // por pilar: físico (10×1.2 + 8)×1.1 = 22 · mental 2×1.32 = 2.6 (arred1)
    expect(agregado.pontosPorPilar.fisico).toBeCloseTo(22, 1);
    expect(agregado.pontosPorPilar.mental).toBeCloseTo(2.6, 1);
    expect(agregado.pontosPorPilar.espiritual).toBeCloseTo(6.6, 1);
  });

  it('diasAtivos conta dias DISTINTOS (2 registros no mesmo dia = 1 dia)', () => {
    const agregado = agregarParticipante([
      reg(CORRER, 1, '2026-03-02T08:00:00Z'),
      reg(CORRER, 2, '2026-03-02T18:00:00Z'),
    ]);
    expect(agregado.diasAtivos).toBe(1);
  });

  it('registro sem pontos (quantidade 0) não vira dia ativo', () => {
    const agregado = agregarParticipante([reg(CORRER, 0, '2026-03-02T08:00:00Z')]);
    expect(agregado.pontos).toBe(0);
    expect(agregado.diasAtivos).toBe(0);
  });
});

describe('dentroDaJanelaDesafio — inclusiva nas pontas', () => {
  const inicio = new Date('2026-03-01T00:00:00Z');
  const fim = new Date('2026-04-26T23:59:59Z');
  it.each([
    ['2026-03-01T00:00:00Z', true],
    ['2026-04-26T23:59:59Z', true],
    ['2026-02-28T23:59:59Z', false],
    ['2026-04-27T00:00:00Z', false],
  ])('%s → %s', (iso, esperado) => {
    expect(dentroDaJanelaDesafio(new Date(iso), inicio, fim)).toBe(esperado);
  });
});

describe('metaTotalEmPontos + progresso do desafio', () => {
  it('modelos B/C usam metaTotalPontos', () => {
    expect(metaTotalEmPontos({ modelo: 'C', metaTotalPontos: 2000 }, [], getAcaoCatalogo)).toBe(2000);
    expect(metaTotalEmPontos({ modelo: 'B' }, [], getAcaoCatalogo)).toBeNull();
  });

  it('modelo A deriva a meta das ações via catálogo (caminhar 10 = 10 pts)', () => {
    expect(
      metaTotalEmPontos({ modelo: 'A' }, [{ acaoRef: 'caminhar', meta: 10 }], getAcaoCatalogo)
    ).toBe(10); // 1 pt/km × 10
    expect(metaTotalEmPontos({ modelo: 'A' }, [{ acaoRef: 'caminhar' }], getAcaoCatalogo)).toBeNull();
  });

  it('progresso coletivo = média clampada; sem meta/participante ⇒ 0', () => {
    expect(derivarProgressoDesafio([{ pontos: 500 }, { pontos: 3000 }], 2000)).toBe(63); // (25+100)/2
    expect(derivarProgressoDesafio([], 2000)).toBe(0);
    expect(derivarProgressoDesafio([{ pontos: 10 }], null)).toBe(0);
  });

  it('progressoPorPilar só materializa com minimoPorPilar (Modelo C)', () => {
    const participantes = [
      { pontosPorPilar: { fisico: 100, mental: 50, espiritual: 0 } },
      { pontosPorPilar: { fisico: 300, mental: 150, espiritual: 60 } },
    ];
    const out = derivarProgressoPorPilar(participantes, { fisico: 300, mental: 300 });
    expect(out).toEqual({
      fisico: { atual: 200, meta: 300 },
      mental: { atual: 100, meta: 300 },
    });
    expect(derivarProgressoPorPilar(participantes, undefined)).toBeNull();
  });
});
