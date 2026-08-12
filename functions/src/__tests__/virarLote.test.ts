/**
 * virarLote.test.ts — LEELA-S300-T2 (E04 · RN-300 · ADR-012)
 *
 * Unit PURO (sem I/O — emulator fica na suíte .integration): derivações da
 * virada de lote nos LIMITES exatos de quantidade e de data (aceite S300-T2:
 * "testes puros de fronteira (data e quantidade) verdes").
 *
 *   - `motivoEncerramento` (kernel novo): fronteira exata `vendidos ==
 *     quantidadeLimite` e `agora == fimEm`; precedência determinística
 *     'quantidade' quando ambos satisfeitos;
 *   - `tallyVendasPorLote` (projeção pura da contagem por linha de pedido):
 *     linha sem lote não conta; inscrito fora da base não conta; estornado
 *     conta (decisão registrada: estorno não devolve vaga);
 *   - composição com o kernel S300-T1 (loteAtivo/precoVigente CONSUMIDOS,
 *     não reimplementados): 100ª venda esgota o L1 e o L2 da MESMA
 *     modalidade assume; modalidade vizinha intocada;
 *   - `camposFaltantesParaPublicarPagina` (completude da publicação);
 *   - `parseLote` com carimbos de virada (roundtrip + corrompidos lançam).
 */

import { describe, expect, it } from 'vitest';
import {
  loteAtivo,
  loteEncerrado,
  motivoEncerramento,
  parseLote,
  precoVigente,
  CAMPOS_FUNCTION_LOTE,
  type Timestamp,
} from '@leela/core';
import { tallyVendasPorLote, type LinhaVenda } from '../eventos/virarLote';
import { camposFaltantesParaPublicarPagina } from '../eventos/publicarPaginaVendas';
import { checkoutTravado, parsePaginaVendas, secoesVendasPadrao } from '@leela/core';

// Timestamp estrutural de teste (compatível com firebase/admin).
function ts(iso: string): Timestamp {
  const d = new Date(iso);
  return {
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime(),
  };
}

const fakeTs = ts('2026-01-01T00:00:00-03:00');

// ─────────────────────────────────────────────────────────────────────────
// motivoEncerramento — fronteiras exatas RN-300
// ─────────────────────────────────────────────────────────────────────────

describe('motivoEncerramento — fronteira exata de QUANTIDADE (RN-300)', () => {
  const lote = {
    fimEm: ts('2026-03-31T23:59:59-03:00'),
    quantidadeLimite: 100,
  };
  const antesDoFim = new Date('2026-03-01T12:00:00-03:00');

  it('99/100 vendidos → aberto (null)', () => {
    expect(motivoEncerramento({ ...lote, vendidos: 99 }, antesDoFim)).toBeNull();
  });

  it('100/100 vendidos (fronteira EXATA) → quantidade', () => {
    expect(motivoEncerramento({ ...lote, vendidos: 100 }, antesDoFim)).toBe('quantidade');
  });

  it('101/100 (overshoot de corrida) → quantidade', () => {
    expect(motivoEncerramento({ ...lote, vendidos: 101 }, antesDoFim)).toBe('quantidade');
  });
});

describe('motivoEncerramento — fronteira exata de DATA (RN-300)', () => {
  const fim = '2026-03-31T23:59:59-03:00';
  const lote = { fimEm: ts(fim), vendidos: 10, quantidadeLimite: 100 };

  it('1ms ANTES de fimEm → aberto (null)', () => {
    expect(
      motivoEncerramento(lote, new Date(new Date(fim).getTime() - 1))
    ).toBeNull();
  });

  it('relógio EXATAMENTE em fimEm → data (>= — mesma fronteira de loteEncerrado)', () => {
    expect(motivoEncerramento(lote, new Date(fim))).toBe('data');
    // Coerência com o kernel S300-T1: mesmo instante, mesma resposta.
    expect(loteEncerrado(lote, new Date(fim))).toBe(true);
  });

  it('1ms DEPOIS de fimEm → data', () => {
    expect(
      motivoEncerramento(lote, new Date(new Date(fim).getTime() + 1))
    ).toBe('data');
  });

  it('data E quantidade satisfeitos → quantidade (precedência determinística)', () => {
    expect(
      motivoEncerramento(
        { fimEm: ts(fim), vendidos: 100, quantidadeLimite: 100 },
        new Date(new Date(fim).getTime() + 1)
      )
    ).toBe('quantidade');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// tallyVendasPorLote — contagem por (modalidade, lote) via linhas do pedido
// ─────────────────────────────────────────────────────────────────────────

describe('tallyVendasPorLote — base da contagem ADR-012', () => {
  const linhas: LinhaVenda[] = [
    { inscritoRef: 'i1', loteId: '5k-l1' },
    { inscritoRef: 'i2', loteId: '5k-l1' },
    { inscritoRef: 'i3', loteId: '10k-l1' },
    { inscritoRef: 'i4', loteId: null }, // venda a preço legado — sem lote
    { inscritoRef: 'i5', loteId: '5k-l1' }, // inscrito FORA da base (pendente)
  ];

  it('conta por lote só inscritos da base; linha sem lote não conta', () => {
    const tally = tallyVendasPorLote(linhas, new Set(['i1', 'i2', 'i3', 'i4']));
    expect(tally.get('5k-l1')).toBe(2);
    expect(tally.get('10k-l1')).toBe(1);
    expect([...tally.keys()]).not.toContain(null);
  });

  it('inscrito pendente/cancelado (fora da base) não conta', () => {
    const tally = tallyVendasPorLote(linhas, new Set(['i1']));
    expect(tally.get('5k-l1')).toBe(1);
    expect(tally.get('10k-l1')).toBeUndefined();
  });

  it('base vazia → mapa vazio (evento sem venda)', () => {
    expect(tallyVendasPorLote(linhas, new Set()).size).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Composição com o kernel — 100ª venda vira o lote; vizinha intocada
// ─────────────────────────────────────────────────────────────────────────

describe('virada por quantidade compõe com loteAtivo/precoVigente (kernel S300-T1)', () => {
  const agora = new Date('2026-03-01T12:00:00-03:00');
  const l1 = (vendidos: number) => ({
    id: '5k-l1',
    ordem: 1,
    inicioEm: ts('2026-01-01T00:00:00-03:00'),
    fimEm: ts('2026-03-31T23:59:59-03:00'),
    quantidadeLimite: 100,
    preco: 75,
    vendidos,
  });
  const l2 = {
    id: '5k-l2',
    ordem: 2,
    inicioEm: ts('2026-04-01T00:00:00-03:00'),
    fimEm: ts('2026-04-20T23:59:59-03:00'),
    quantidadeLimite: 200,
    preco: 95,
    vendidos: 0,
  };

  it('99ª venda: L1 segue ativo a R$75', () => {
    const lotes = [l1(99), l2];
    expect(loteAtivo(lotes, agora)?.id).toBe('5k-l1');
    expect(precoVigente({ lotesDaModalidade: lotes, agora })).toBe(75);
  });

  it('100ª venda: L1 encerra e L2 assume por hand-off a R$95 (RN-300/ADR-012)', () => {
    const lotes = [l1(100), l2];
    expect(loteAtivo(lotes, agora)?.id).toBe('5k-l2');
    expect(precoVigente({ lotesDaModalidade: lotes, agora })).toBe(95);
  });

  it('modalidade vizinha tem derivação própria — não é afetada pela virada da outra', () => {
    const lotes10k = [
      { ...l1(40), id: '10k-l1' }, // 40/100 — segue ativo
    ];
    expect(loteAtivo(lotes10k, agora)?.id).toBe('10k-l1');
  });
});

// ─────────────────────────────────────────────────────────────────────────
// parseLote — carimbos de virada (S300-T2)
// ─────────────────────────────────────────────────────────────────────────

describe('parseLote — carimbos encerradoEm/encerradoMotivo', () => {
  const docBase = {
    tenantId: 'castelo-producoes',
    modalidade: '5k',
    ordem: 1,
    nome: 'Lote 1',
    inicioEm: ts('2026-01-01T00:00:00-03:00'),
    fimEm: ts('2026-03-31T23:59:59-03:00'),
    quantidadeLimite: 100,
    preco: 75,
    vendidos: 100,
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
  };

  it('CAMPOS_FUNCTION_LOTE cobre os DOIS contadores E os carimbos (espelho das Rules)', () => {
    // `reservas` entrou com a RN-543 e tem de estar aqui: esta lista é o
    // espelho declarado das Security Rules, e contador de vaga fora dela
    // seria contador que o cliente escreve. A falha deste caso é o aviso de
    // que alguém adicionou campo de Function sem trancar a Rule.
    expect(CAMPOS_FUNCTION_LOTE).toEqual([
      'vendidos',
      'reservas',
      'encerradoEm',
      'encerradoMotivo',
    ]);
  });

  it('roundtrip com carimbos presentes', () => {
    const lote = parseLote('5k-l1', {
      ...docBase,
      encerradoEm: fakeTs,
      encerradoMotivo: 'quantidade',
    });
    expect(lote.encerradoEm).toBe(fakeTs);
    expect(lote.encerradoMotivo).toBe('quantidade');
  });

  it('carimbos ausentes → opcionais ausentes (doc pré-S300-T2 segue lendo)', () => {
    const lote = parseLote('5k-l1', docBase);
    expect(lote.encerradoEm).toBeUndefined();
    expect(lote.encerradoMotivo).toBeUndefined();
  });

  it('encerradoMotivo corrompido lança (trilha comercial é fail-fast)', () => {
    expect(() =>
      parseLote('5k-l1', { ...docBase, encerradoMotivo: 'fraude' })
    ).toThrow(/encerradoMotivo/);
  });

  it('encerradoEm não-Timestamp lança', () => {
    expect(() =>
      parseLote('5k-l1', { ...docBase, encerradoEm: '2026-03-01' })
    ).toThrow(/encerradoEm/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// camposFaltantesParaPublicarPagina — completude server-side da publicação
// ─────────────────────────────────────────────────────────────────────────

describe('camposFaltantesParaPublicarPagina — completude (S300-T2 · lacuna #1 T3)', () => {
  const paginaValida = parsePaginaVendas('config', {
    tenantId: 'castelo-producoes',
    eventoId: 'meia-floripa-2026',
    secoes: secoesVendasPadrao(),
    seo: {
      titulo: 'Meia Floripa 2026',
      descricao: 'A meia mais bonita do Brasil.',
      slugAmigavel: '{DOMINIO_LEELA}/meia-floripa-2026',
    },
    publicada: false,
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
  });

  it('página completa → nada faltando', () => {
    expect(camposFaltantesParaPublicarPagina(paginaValida)).toEqual([]);
  });

  it('titulo/descricao vazios (ou só espaço) → listados', () => {
    const faltas = camposFaltantesParaPublicarPagina({
      ...paginaValida,
      seo: { ...paginaValida.seo, titulo: '  ', descricao: '' },
    });
    expect(faltas).toEqual(['seo.titulo', 'seo.descricao']);
  });

  it('invariante do kernel segue de pé: secoesVendasPadrao tem checkout travada', () => {
    expect(checkoutTravado(paginaValida.secoes)).toBe(true);
  });
});
