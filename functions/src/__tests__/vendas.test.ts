/**
 * vendas.test.ts — LEELA-S300-T1 (E04 · ADR-012)
 *
 * Unit: tipos/derivações/parse do kernel de vendas em @leela/core —
 * Lote (pertence à modalidade), Cupom e PaginaVendas + o seed canônico da
 * Meia Floripa. Sem I/O (Rules ficam no gate consolidado do emulator).
 */

import { describe, expect, it } from 'vitest';
import {
  // Lote
  loteShapeValido,
  validarLotesModalidade,
  loteEsgotado,
  loteEncerrado,
  loteVigente,
  loteAtivo,
  precoVigente,
  parseLote,
  // Cupom
  isTipoCupom,
  normalizarCodigoCupom,
  isCodigoCupomValido,
  valorCupomValido,
  cupomNoTeto,
  cupomNaJanela,
  cupomVigente,
  descontoDoCupom,
  parseCupom,
  // PaginaVendas
  isCanalSecao,
  isSecaoVendas,
  isSeoVendas,
  checkoutTravado,
  secoesVendasPadrao,
  parsePaginaVendas,
  type Timestamp,
} from '@leela/core';
import { LOTE_SEEDS, CUPOM_SEEDS } from '../seed/eventos.seed';

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
// LOTE — ADR-012 (lote pertence à modalidade)
// ─────────────────────────────────────────────────────────────────────────

const loteBase = {
  modalidade: '5k',
  ordem: 1,
  nome: 'Lote 1',
  inicioEm: ts('2026-02-01T00:00:00-03:00'),
  fimEm: ts('2026-04-01T00:00:00-03:00'),
  quantidadeLimite: 300,
  preco: 75,
  vendidos: 0,
};

describe('Lote — shape (ADR-012 · RN-300/301)', () => {
  it('loteShapeValido aceita janela/vaga/preço coerentes', () => {
    expect(loteShapeValido(loteBase)).toBe(true);
  });

  it('rejeita fimEm ≤ inicioEm, quantidadeLimite < 1, preco < 0, ordem < 1', () => {
    expect(loteShapeValido({ ...loteBase, fimEm: loteBase.inicioEm })).toBe(false);
    expect(loteShapeValido({ ...loteBase, quantidadeLimite: 0 })).toBe(false);
    expect(loteShapeValido({ ...loteBase, preco: -1 })).toBe(false);
    expect(loteShapeValido({ ...loteBase, ordem: 0 })).toBe(false);
    expect(loteShapeValido({ ...loteBase, quantidadeLimite: 1.5 })).toBe(false);
  });

  it('parseLote normaliza vendidos ausente para 0 e rejeita shape inválido', () => {
    const data: Record<string, unknown> = {
      tenantId: 'castelo-producoes', modalidade: '5k', ordem: 1, nome: 'Lote 1',
      inicioEm: loteBase.inicioEm, fimEm: loteBase.fimEm,
      quantidadeLimite: 300, preco: 75, criadoEm: fakeTs, atualizadoEm: fakeTs,
    };
    expect(parseLote('5k-lote-1', data).vendidos).toBe(0);
    expect(() => parseLote('x', { ...data, preco: -5 })).toThrow(/RN-301/);
    expect(() => parseLote('x', { ...data, fimEm: loteBase.inicioEm })).toThrow(/fimEm/);
    expect(() => parseLote('x', { ...data, ordem: 0 })).toThrow(/ordem/);
    expect(() => parseLote('x', { ...data, quantidadeLimite: 0 })).toThrow(/quantidadeLimite/);
    expect(() => parseLote('x', { ...data, modalidade: '' })).toThrow(/ADR-012/);
    expect(() => parseLote('x', { ...data, vendidos: -1 })).toThrow(/vendidos/);
  });
});

describe('Lote — virada RN-300 (data OU quantidade) e preço vigente RN-301', () => {
  const cheio = { ...loteBase, vendidos: 300 };

  it('loteEsgotado: vendidos ≥ limite', () => {
    expect(loteEsgotado(cheio)).toBe(true);
    expect(loteEsgotado({ ...loteBase, vendidos: 299 })).toBe(false);
  });

  it('loteEncerrado: por DATA (agora ≥ fimEm) OU por QUANTIDADE', () => {
    const dentro = new Date('2026-03-01T00:00:00-03:00');
    const depois = new Date('2026-05-01T00:00:00-03:00');
    expect(loteEncerrado(loteBase, dentro)).toBe(false);
    expect(loteEncerrado(loteBase, depois)).toBe(true); // por data
    expect(loteEncerrado(cheio, dentro)).toBe(true); // por quantidade
  });

  it('loteVigente: janela começou e ainda não encerrou', () => {
    expect(loteVigente(loteBase, new Date('2026-03-01T00:00:00-03:00'))).toBe(true);
    expect(loteVigente(loteBase, new Date('2026-01-15T00:00:00-03:00'))).toBe(false); // antes
    expect(loteVigente(cheio, new Date('2026-03-01T00:00:00-03:00'))).toBe(false); // esgotado
  });

  it('loteAtivo escolhe o vigente de MENOR ordem; precoVigente deriva dele', () => {
    const l2 = { ...loteBase, ordem: 2, preco: 90, inicioEm: ts('2026-02-01T00:00:00-03:00'), fimEm: ts('2026-04-01T00:00:00-03:00') };
    const l1 = { ...loteBase, ordem: 1, preco: 75, inicioEm: ts('2025-12-01T00:00:00-03:00'), fimEm: ts('2026-02-01T00:00:00-03:00'), vendidos: 300 };
    const agora = new Date('2026-03-01T00:00:00-03:00');
    expect(loteAtivo([l1, l2], agora)?.ordem).toBe(2); // l1 encerrou (data+qtd)
    expect(precoVigente({ lotesDaModalidade: [l1, l2], agora })).toBe(90);
  });

  it('precoVigente cai no precoLegado (PercursoEvento.preco) quando não há lote ativo', () => {
    const agora = new Date('2026-06-01T00:00:00-03:00'); // depois de tudo
    expect(precoVigente({ lotesDaModalidade: [loteBase], agora, precoLegado: 120 })).toBe(120);
    expect(precoVigente({ lotesDaModalidade: [loteBase], agora })).toBeNull();
  });
});

describe('validarLotesModalidade — invariantes cross-doc por modalidade', () => {
  const seq = [
    { modalidade: '5k', ordem: 1, inicioEm: ts('2025-12-01T00:00:00-03:00'), fimEm: ts('2026-02-01T00:00:00-03:00') },
    { modalidade: '5k', ordem: 2, inicioEm: ts('2026-02-01T00:00:00-03:00'), fimEm: ts('2026-04-01T00:00:00-03:00') },
  ];

  it('sequência não-sobreposta (janelas tocando) é válida', () => {
    expect(validarLotesModalidade(seq)).toBeNull();
  });

  it('ordem duplicada na mesma modalidade é rejeitada', () => {
    const dup = [...seq, { ...seq[1]!, ordem: 1 }];
    expect(validarLotesModalidade(dup)).toMatch(/ordem 1 duplicada/);
  });

  it('janelas sobrepostas na mesma modalidade são rejeitadas', () => {
    const overlap = [
      seq[0]!,
      { modalidade: '5k', ordem: 2, inicioEm: ts('2026-01-15T00:00:00-03:00'), fimEm: ts('2026-04-01T00:00:00-03:00') },
    ];
    expect(validarLotesModalidade(overlap)).toMatch(/sobrepost|antes do fim/);
  });

  it('modalidades diferentes são independentes (mesma ordem ok)', () => {
    const duas = [
      { modalidade: '5k', ordem: 1, inicioEm: ts('2025-12-01T00:00:00-03:00'), fimEm: ts('2026-02-01T00:00:00-03:00') },
      { modalidade: '10k', ordem: 1, inicioEm: ts('2025-12-01T00:00:00-03:00'), fimEm: ts('2026-02-01T00:00:00-03:00') },
    ];
    expect(validarLotesModalidade(duas)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
// CUPOM
// ─────────────────────────────────────────────────────────────────────────

const cupomBase = {
  codigo: 'HEROI10',
  tipo: 'percentual' as const,
  valor: 10,
  tetoUso: 100,
  inicioEm: ts('2026-01-01T00:00:00-03:00'),
  fimEm: ts('2026-04-26T23:59:00-03:00'),
  usos: 0,
};

describe('Cupom — código, tipo e valor', () => {
  it('normalizarCodigoCupom faz trim + UPPER; valida A-Z0-9 3..20', () => {
    expect(normalizarCodigoCupom('  heroi10 ')).toBe('HEROI10');
    expect(isCodigoCupomValido('HEROI10')).toBe(true);
    expect(isCodigoCupomValido('ab')).toBe(false); // curto
    expect(isCodigoCupomValido('herói-10')).toBe(false); // fora do charset
  });

  it('isTipoCupom e valorCupomValido (percentual ≤ 100; fixo > 0)', () => {
    expect(isTipoCupom('percentual')).toBe(true);
    expect(isTipoCupom('brinde')).toBe(false);
    expect(valorCupomValido('percentual', 10)).toBe(true);
    expect(valorCupomValido('percentual', 150)).toBe(false);
    expect(valorCupomValido('fixo', 50)).toBe(true);
    expect(valorCupomValido('fixo', 0)).toBe(false);
  });

  it('parseCupom exige docId == codigo e rejeita shape inválido', () => {
    const data: Record<string, unknown> = {
      tenantId: 'castelo-producoes', codigo: 'HEROI10', tipo: 'percentual',
      valor: 10, tetoUso: 100, inicioEm: cupomBase.inicioEm, fimEm: cupomBase.fimEm,
      criadoEm: fakeTs, atualizadoEm: fakeTs,
    };
    expect(parseCupom('HEROI10', data).usos).toBe(0);
    expect(() => parseCupom('OUTRO', data)).toThrow(/igual ao docId/);
    expect(() => parseCupom('HEROI10', { ...data, valor: 150 })).toThrow(/valor/);
    expect(() => parseCupom('HEROI10', { ...data, tetoUso: 0 })).toThrow(/tetoUso/);
    expect(() => parseCupom('HEROI10', { ...data, fimEm: data['inicioEm'] })).toThrow(/fimEm/);
  });
});

describe('Cupom — vigência e desconto', () => {
  it('cupomNoTeto: ilimitado (null) nunca atinge', () => {
    expect(cupomNoTeto({ tetoUso: 100, usos: 100 })).toBe(true);
    expect(cupomNoTeto({ tetoUso: 100, usos: 99 })).toBe(false);
    expect(cupomNoTeto({ tetoUso: null, usos: 999 })).toBe(false);
  });

  it('cupomNaJanela / cupomVigente', () => {
    const dentro = new Date('2026-03-01T00:00:00-03:00');
    const fora = new Date('2025-11-01T00:00:00-03:00');
    expect(cupomNaJanela(cupomBase, dentro)).toBe(true);
    expect(cupomNaJanela(cupomBase, fora)).toBe(false);
    expect(cupomVigente(cupomBase, dentro)).toBe(true);
    expect(cupomVigente({ ...cupomBase, usos: 100 }, dentro)).toBe(false); // no teto
  });

  it('descontoDoCupom: percentual, fixo e clamp ao valor-base', () => {
    expect(descontoDoCupom({ tipo: 'percentual', valor: 10 }, 200)).toBe(20);
    expect(descontoDoCupom({ tipo: 'fixo', valor: 50 }, 200)).toBe(50);
    expect(descontoDoCupom({ tipo: 'fixo', valor: 300 }, 200)).toBe(200); // clamp
    expect(descontoDoCupom({ tipo: 'percentual', valor: 10 }, 0)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// PAGINA VENDAS
// ─────────────────────────────────────────────────────────────────────────

describe('PaginaVendas — seções por canal e SEO', () => {
  it('guards de canal/seção/seo', () => {
    expect(isCanalSecao('essenciais')).toBe(true);
    expect(isCanalSecao('outro')).toBe(false);
    expect(isSecaoVendas({ id: 'hero', canal: 'landing', ativa: true, travada: false })).toBe(true);
    expect(isSecaoVendas({ id: 'hero', canal: 'x', ativa: true, travada: false })).toBe(false);
    expect(isSeoVendas({ titulo: 't', descricao: 'd', slugAmigavel: '{DOMINIO_LEELA}/x' })).toBe(true);
    expect(isSeoVendas({ titulo: 't', descricao: 'd', slugAmigavel: '' })).toBe(false);
  });

  it('secoesVendasPadrao inclui checkout travada+ativa (invariante S300)', () => {
    const secoes = secoesVendasPadrao();
    expect(checkoutTravado(secoes)).toBe(true);
    const checkout = secoes.find((s) => s.id === 'checkout');
    expect(checkout?.travada).toBe(true);
    expect(checkout?.ativa).toBe(true);
  });

  it('checkoutTravado é falso sem checkout ou com checkout destravado', () => {
    expect(checkoutTravado([{ id: 'hero', canal: 'essenciais', ativa: true, travada: false }])).toBe(false);
    expect(checkoutTravado([{ id: 'checkout', canal: 'sistema', ativa: true, travada: false }])).toBe(false);
  });

  it('parsePaginaVendas exige checkout travada e seo/eventoId válidos', () => {
    const data: Record<string, unknown> = {
      tenantId: 'castelo-producoes', eventoId: 'meia-floripa-2026',
      secoes: secoesVendasPadrao(),
      seo: { titulo: 'Meia Floripa', descricao: 'Corra', slugAmigavel: '{DOMINIO_LEELA}/meia-floripa-2026' },
      publicada: true, criadoEm: fakeTs, atualizadoEm: fakeTs,
    };
    const pagina = parsePaginaVendas('config', data);
    expect(pagina.publicada).toBe(true);
    expect(pagina.secoes).toHaveLength(7);

    const semCheckout = secoesVendasPadrao().filter((s) => s.id !== 'checkout');
    expect(() => parsePaginaVendas('config', { ...data, secoes: semCheckout })).toThrow(/checkout/);
    expect(() => parsePaginaVendas('config', { ...data, eventoId: '' })).toThrow(/eventoId/);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// SEED canônico da Meia Floripa (S300-T1)
// ─────────────────────────────────────────────────────────────────────────

describe('seed E04 — lotes por modalidade + cupons', () => {
  it('9 lotes: 3 modalidades × 3 lotes, ordem coerente (ADR-012)', () => {
    expect(LOTE_SEEDS).toHaveLength(9);
    for (const mod of ['5k', '10k', '21k']) {
      const daMod = LOTE_SEEDS.filter((l) => l.modalidade === mod);
      expect(daMod.map((l) => l.ordem).sort()).toEqual([1, 2, 3]);
    }
  });

  it('sequência do seed passa validarLotesModalidade (janelas coerentes)', () => {
    const asTs = LOTE_SEEDS.map((l) => ({
      modalidade: l.modalidade, ordem: l.ordem,
      inicioEm: ts(l.inicioEm), fimEm: ts(l.fimEm),
    }));
    expect(validarLotesModalidade(asTs)).toBeNull();
  });

  it('L1 encerrado/esgotado, L2 vigente ~40%, L3 futuro zerado (em 2026-03-01)', () => {
    const agora = new Date('2026-03-01T00:00:00-03:00');
    const lotes5k = LOTE_SEEDS.filter((l) => l.modalidade === '5k').map((l) => ({
      ordem: l.ordem, preco: l.preco, quantidadeLimite: l.quantidadeLimite,
      vendidos: l.vendidos, inicioEm: ts(l.inicioEm), fimEm: ts(l.fimEm),
    }));
    const ativo = loteAtivo(lotes5k, agora);
    expect(ativo?.ordem).toBe(2); // L2 vigente
    expect(loteEsgotado(lotes5k.find((l) => l.ordem === 1)!)).toBe(true); // L1 esgotado
    expect(lotes5k.find((l) => l.ordem === 3)!.vendidos).toBe(0); // L3 zerado
    // preço vigente do 5k = Lote 2 = round(60 * 1.25) = 75
    expect(precoVigente({ lotesDaModalidade: lotes5k, agora })).toBe(75);
  });

  it('preço escala por lote e por distância (5k<10k<21k)', () => {
    const l1 = (mod: string) => LOTE_SEEDS.find((l) => l.modalidade === mod && l.ordem === 1)!.preco;
    expect(l1('5k')).toBeLessThan(l1('10k'));
    expect(l1('10k')).toBeLessThan(l1('21k'));
    const cinco = LOTE_SEEDS.filter((l) => l.modalidade === '5k').sort((a, b) => a.ordem - b.ordem);
    expect(cinco[0]!.preco).toBeLessThan(cinco[2]!.preco); // L1 < L3
  });

  it('cupons: HEROI10 percentual 10 + CORRA50 fixo 50, docId = código normalizado', () => {
    expect(CUPOM_SEEDS).toHaveLength(2);
    const heroi = CUPOM_SEEDS.find((c) => c.codigo === 'HEROI10');
    expect(heroi?.tipo).toBe('percentual');
    expect(heroi?.valor).toBe(10);
    const corra = CUPOM_SEEDS.find((c) => c.codigo === 'CORRA50');
    expect(corra?.tipo).toBe('fixo');
    expect(corra?.tetoUso).toBeNull(); // ilimitado
    for (const c of CUPOM_SEEDS) {
      expect(c.codigo).toBe(normalizarCodigoCupom(c.codigo)); // já normalizado
      expect(isCodigoCupomValido(c.codigo)).toBe(true);
    }
  });
});
