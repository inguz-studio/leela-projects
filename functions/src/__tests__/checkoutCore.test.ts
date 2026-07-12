/**
 * checkoutCore.test.ts — LEELA-E12 (fundação do checkout)
 *
 * Unit PURO (sem I/O, sem Emulator — gate serial da task):
 *   1. computeSaleState — preço vigente (lote ativo/legado), cupom
 *      (%/fixo/clamp/vigência/teto), valorFinal, taxa/líquido do termo,
 *      parcelamento Price (juros repassados) e fail-fast de dinheiro
 *   2. validarDadosMinimosInscrito — nome/email/CPF (reuso cpfValido)
 *   3. etapas — máquina pura dados → pagamento → confirmação
 *   4. validarCreateInscricaoChargeInput + idsDoCheckout (fronteira do
 *      servidor + determinismo da idempotência)
 */

import { describe, expect, it } from 'vitest';
import {
  computeSaleState,
  ETAPAS_CHECKOUT,
  etapaAnterior,
  indiceEtapa,
  isEtapaCheckout,
  proximaEtapa,
  roundMoney,
  validarDadosMinimosInscrito,
  type CupomVenda,
  type LoteVenda,
  type Timestamp,
} from '@leela/core';
import {
  idsDoCheckout,
  validarCreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Timestamp estrutural (compatível client/Admin SDK) a partir de ISO. */
function ts(iso: string): Timestamp {
  const ms = Date.parse(iso);
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: (ms % 1000) * 1_000_000,
    toDate: () => new Date(ms),
    toMillis: () => ms,
  };
}

/** 15/mar/2026 — dentro da janela do Lote 2 do seed canônico. */
const AGORA = new Date('2026-03-15T12:00:00-03:00');

function lote(partial: Partial<LoteVenda> & { id: string; preco: number }): LoteVenda {
  return {
    nome: partial.id,
    ordem: 1,
    inicioEm: ts('2026-02-01T00:00:00-03:00'),
    fimEm: ts('2026-04-01T00:00:00-03:00'),
    vendidos: 0,
    quantidadeLimite: 100,
    ...partial,
  };
}

/** 3 lotes da 10k: L1 encerrado (janela passada), L2 VIGENTE, L3 futuro. */
const LOTES_10K: readonly LoteVenda[] = [
  lote({
    id: '10k-l1', nome: 'Lote 1', ordem: 1, preco: 149.9,
    inicioEm: ts('2026-01-01T00:00:00-03:00'), fimEm: ts('2026-02-01T00:00:00-03:00'),
    vendidos: 100,
  }),
  lote({ id: '10k-l2', nome: 'Lote 2', ordem: 2, preco: 189.9, vendidos: 40 }),
  lote({
    id: '10k-l3', nome: 'Lote 3', ordem: 3, preco: 219.9,
    inicioEm: ts('2026-04-01T00:00:00-03:00'), fimEm: ts('2026-04-26T00:00:00-03:00'),
  }),
];

const LOTES_5K: readonly LoteVenda[] = [
  lote({ id: '5k-l2', nome: 'Lote 2', ordem: 2, preco: 129.9 }),
];

const RULES_SEM_JUROS = { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 20 };
const FEE = 10.5; // % do TERMO da Castelo (RN-406 — vem do termo, não daqui)

function cupom(partial: Partial<CupomVenda> & { codigo: string }): CupomVenda {
  return {
    tipo: 'percentual',
    valor: 10,
    tetoUso: null,
    usos: 0,
    inicioEm: ts('2026-01-01T00:00:00-03:00'),
    fimEm: ts('2026-04-27T00:00:00-03:00'),
    ...partial,
  };
}

function venda(overrides: Partial<Parameters<typeof computeSaleState>[0]> = {}) {
  return computeSaleState({
    itens: [{ modalidade: '10k', lotesDaModalidade: LOTES_10K }],
    forma: 'pix',
    parcelas: 1,
    installmentRules: RULES_SEM_JUROS,
    platformFeePct: FEE,
    agora: AGORA,
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// 1. computeSaleState
// ---------------------------------------------------------------------------

describe('computeSaleState — preço vigente (RN-301/ADR-012)', () => {
  it('deriva o preço do lote ATIVO da modalidade (PIX à vista)', () => {
    const sale = venda();
    expect(sale.itens).toEqual([
      { modalidade: '10k', loteId: '10k-l2', loteNome: 'Lote 2', preco: 189.9 },
    ]);
    expect(sale.valorBase).toBe(189.9);
    expect(sale.desconto).toBe(0);
    expect(sale.valorFinal).toBe(189.9);
    expect(sale.cupomAplicado).toBeNull();
    expect(sale.totalCobrado).toBe(189.9);
    expect(sale.parcelamento).toEqual({ parcelas: 1, valorParcela: 189.9, valorTotal: 189.9 });
  });

  it('pedido em GRUPO soma os preços por modalidade (ADR-011)', () => {
    const sale = venda({
      itens: [
        { modalidade: '10k', lotesDaModalidade: LOTES_10K },
        { modalidade: '5k', lotesDaModalidade: LOTES_5K },
      ],
    });
    expect(sale.valorBase).toBe(319.8); // 189.90 + 129.90
    expect(sale.itens).toHaveLength(2);
  });

  it('cai no preço LEGADO quando não há lote vigente (schema evolution)', () => {
    const sale = venda({
      itens: [{ modalidade: '10k', lotesDaModalidade: [], precoLegado: 99.9 }],
    });
    expect(sale.itens[0]).toEqual({
      modalidade: '10k', loteId: null, loteNome: null, preco: 99.9,
    });
  });

  it('VENDA FECHADA: sem lote vigente e sem legado → lança (RN-300)', () => {
    const esgotado = lote({ id: 'x', preco: 100, vendidos: 100 }); // ≥ limite
    expect(() =>
      venda({ itens: [{ modalidade: '10k', lotesDaModalidade: [esgotado] }] })
    ).toThrow(/venda fechada/);
  });

  it('itens vazios → lança (ADR-011 exige ≥ 1 inscrição)', () => {
    expect(() => venda({ itens: [] })).toThrow(/≥ 1 inscrição/);
  });
});

describe('computeSaleState — cupom (E04)', () => {
  it('percentual: 10% sobre o total do pedido', () => {
    const sale = venda({ cupom: cupom({ codigo: 'HEROI10' }) });
    expect(sale.desconto).toBe(18.99);
    expect(sale.valorFinal).toBe(170.91);
    expect(sale.cupomAplicado).toEqual({ codigo: 'HEROI10', tipo: 'percentual', valor: 10 });
  });

  it('fixo: abate R$ do total', () => {
    const sale = venda({ cupom: cupom({ codigo: 'CORRA50', tipo: 'fixo', valor: 50 }) });
    expect(sale.desconto).toBe(50);
    expect(sale.valorFinal).toBe(139.9);
  });

  it('fixo MAIOR que o total → gratuito → lança (fora da fundação E12)', () => {
    expect(() =>
      venda({ cupom: cupom({ codigo: 'TUDO', tipo: 'fixo', valor: 500 }) })
    ).toThrow(/gratuito/);
  });

  it('fora da janela de validade → lança', () => {
    expect(() =>
      venda({
        cupom: cupom({
          codigo: 'VENCIDO',
          inicioEm: ts('2025-01-01T00:00:00-03:00'),
          fimEm: ts('2025-12-31T00:00:00-03:00'),
        }),
      })
    ).toThrow(/fora da janela/);
  });

  it('teto de usos atingido → lança', () => {
    expect(() =>
      venda({ cupom: cupom({ codigo: 'LOTADO', tetoUso: 100, usos: 100 }) })
    ).toThrow(/teto de usos/);
  });
});

describe('computeSaleState — taxa/líquido do TERMO (RN-330/RN-406)', () => {
  it('taxa = % do termo sobre o valorFinal; líquido = final − taxa', () => {
    const sale = venda();
    expect(sale.taxa).toBe(19.94); // roundMoney(189.90 × 10,5%)
    expect(sale.receitaLiquidaOrganizador).toBe(169.96);
    expect(roundMoney(sale.taxa + sale.receitaLiquidaOrganizador)).toBe(sale.valorFinal);
  });

  it('fee 0 → taxa 0 (0 é válido — produtor-sócio)', () => {
    const sale = venda({ platformFeePct: 0 });
    expect(sale.taxa).toBe(0);
    expect(sale.receitaLiquidaOrganizador).toBe(sale.valorFinal);
  });
});

describe('computeSaleState — parcelamento (RN-311 · Price repassado)', () => {
  const RULES_COM_JUROS = { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 10 };
  const LOTE_300 = [lote({ id: 'l300', preco: 300 })];

  it('cartão 3x com juros 3,49% a.m.: total com juros ≥ à vista; parcelas fecham', () => {
    const sale = venda({
      itens: [{ modalidade: '10k', lotesDaModalidade: LOTE_300 }],
      forma: 'cartao_credito',
      parcelas: 3,
      installmentRules: RULES_COM_JUROS,
    });
    const esperado = roundMoney(300 * Math.pow(1.0349, 3));
    expect(sale.parcelamento.parcelas).toBe(3);
    expect(sale.parcelamento.valorTotal).toBe(esperado);
    expect(sale.totalCobrado).toBe(esperado);
    // Juros REPASSADOS: comprador nunca paga menos que o valorFinal
    expect(sale.totalCobrado).toBeGreaterThanOrEqual(sale.valorFinal);
    // Invariante de parsePagamento: n × parcela ≈ total (½ centavo/parcela)
    expect(
      Math.abs(3 * sale.parcelamento.valorParcela - sale.parcelamento.valorTotal)
    ).toBeLessThanOrEqual(3 * 0.005 + 1e-9);
  });

  it('PIX com parcelas > 1 → lança (PIX é à vista)', () => {
    expect(() => venda({ forma: 'pix', parcelas: 2 })).toThrow(/à vista/);
  });

  it('parcelas acima do máximo do termo → lança', () => {
    expect(() =>
      venda({ forma: 'cartao_credito', parcelas: 13 })
    ).toThrow(/não é uma opção válida/);
  });

  it('parcela abaixo da mínima do termo trunca as opções → lança', () => {
    // valorFinal 30 com mínima 20: 2x = 15 < 20 → só 1x é ofertável
    expect(() =>
      venda({
        itens: [{ modalidade: '10k', lotesDaModalidade: [lote({ id: 'l30', preco: 30 })] }],
        forma: 'cartao_credito',
        parcelas: 2,
      })
    ).toThrow(/não é uma opção válida/);
  });

  it('parcelas 0/negativa/fracionária → lança', () => {
    expect(() => venda({ parcelas: 0 })).toThrow(/inteiro ≥ 1/);
    expect(() => venda({ parcelas: 1.5 })).toThrow(/inteiro ≥ 1/);
  });
});

// ---------------------------------------------------------------------------
// 2. validarDadosMinimosInscrito
// ---------------------------------------------------------------------------

describe('validarDadosMinimosInscrito — mínimo do checkout (E12)', () => {
  const VALIDO = { nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '529.982.247-25' };

  it('dados válidos → sem erros (CPF com máscara aceito)', () => {
    expect(validarDadosMinimosInscrito(VALIDO)).toEqual([]);
  });

  it('CPF com DV errado → erro (sem ecoar o CPF — LGPD)', () => {
    const erros = validarDadosMinimosInscrito({ ...VALIDO, cpf: '529.982.247-26' });
    expect(erros).toHaveLength(1);
    expect(erros[0]).toMatch(/"cpf" inválido/);
    expect(erros[0]).not.toContain('529');
  });

  it('email inválido → erro', () => {
    expect(validarDadosMinimosInscrito({ ...VALIDO, email: 'ana@' })).toEqual([
      '"email" inválido.',
    ]);
  });

  it('nome curto → erro; nome ausente → erro', () => {
    expect(validarDadosMinimosInscrito({ ...VALIDO, nome: 'Al' })).toHaveLength(1);
    const { nome: _nome, ...semNome } = VALIDO;
    expect(validarDadosMinimosInscrito(semNome)).toHaveLength(1);
  });

  it('não-objeto → erro único de obrigatoriedade', () => {
    expect(validarDadosMinimosInscrito(null)).toHaveLength(1);
    expect(validarDadosMinimosInscrito([])).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// 3. Etapas do checkout
// ---------------------------------------------------------------------------

describe('etapas — máquina pura do checkout', () => {
  it('sequência canônica dados → pagamento → confirmação', () => {
    expect(ETAPAS_CHECKOUT).toEqual(['dados', 'pagamento', 'confirmacao']);
    expect(proximaEtapa('dados')).toBe('pagamento');
    expect(proximaEtapa('pagamento')).toBe('confirmacao');
    expect(proximaEtapa('confirmacao')).toBeNull();
    expect(etapaAnterior('dados')).toBeNull();
    expect(etapaAnterior('confirmacao')).toBe('pagamento');
    expect(indiceEtapa('pagamento')).toBe(1);
  });

  it('type guard rejeita etapa fora do enum', () => {
    expect(isEtapaCheckout('pagamento')).toBe(true);
    expect(isEtapaCheckout('resumo')).toBe(false);
    expect(isEtapaCheckout(1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Fronteira do servidor — validarCreateInscricaoChargeInput + ids
// ---------------------------------------------------------------------------

describe('validarCreateInscricaoChargeInput — fronteira de segurança', () => {
  const INPUT_VALIDO = {
    eventoId: 'meia-floripa-2026',
    inscritos: [
      { nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '52998224725', modalidade: '10k' },
    ],
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: 'chk-0001-aaaa-bbbb',
  };

  it('input válido → sem erros', () => {
    expect(validarCreateInscricaoChargeInput(INPUT_VALIDO)).toEqual([]);
  });

  it('sem idempotencyKey → erro (RN-333 — dinheiro exige chave)', () => {
    const { idempotencyKey: _k, ...sem } = INPUT_VALIDO;
    expect(validarCreateInscricaoChargeInput(sem).join(' ')).toMatch(/idempotencyKey/);
  });

  it('idempotencyKey com "/" ou curta → erro (docId-safe)', () => {
    expect(
      validarCreateInscricaoChargeInput({ ...INPUT_VALIDO, idempotencyKey: 'a/b' })
    ).not.toEqual([]);
    expect(
      validarCreateInscricaoChargeInput({ ...INPUT_VALIDO, idempotencyKey: 'curta' })
    ).not.toEqual([]);
  });

  it('PIX parcelado → erro', () => {
    expect(
      validarCreateInscricaoChargeInput({ ...INPUT_VALIDO, parcelas: 3 }).join(' ')
    ).toMatch(/PIX é à vista/);
  });

  it('responsavelIndex fora do range → erro', () => {
    expect(
      validarCreateInscricaoChargeInput({ ...INPUT_VALIDO, responsavelIndex: 5 }).join(' ')
    ).toMatch(/responsavelIndex/);
  });

  it('inscrito com CPF inválido/modalidade ausente → erros posicionados', () => {
    const erros = validarCreateInscricaoChargeInput({
      ...INPUT_VALIDO,
      inscritos: [{ nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '111.111.111-11' }],
    });
    expect(erros.join(' ')).toMatch(/inscritos\[0\].*cpf/);
    expect(erros.join(' ')).toMatch(/inscritos\[0\].*modalidade/);
  });

  it('kit fora do enum → erro (RN-202)', () => {
    expect(
      validarCreateInscricaoChargeInput({
        ...INPUT_VALIDO,
        inscritos: [{ ...INPUT_VALIDO.inscritos[0], kit: 'tier_gold' }],
      }).join(' ')
    ).toMatch(/kit fora do enum/);
  });
});

describe('idsDoCheckout — determinismo da idempotência (RN-333)', () => {
  it('mesma (uid, key) → SEMPRE os mesmos ids (retry não cria segundo pedido)', () => {
    const a = idsDoCheckout('uid-ana', 'chk-0001-aaaa-bbbb', 2);
    const b = idsDoCheckout('uid-ana', 'chk-0001-aaaa-bbbb', 2);
    expect(a).toEqual(b);
    expect(a.pedidoId).toBe('ped-uid-ana-chk-0001-aaaa-bbbb');
    expect(a.pagamentoId).toBe('pag-uid-ana-chk-0001-aaaa-bbbb');
    expect(a.inscritoIds).toEqual([
      'ped-uid-ana-chk-0001-aaaa-bbbb-i1',
      'ped-uid-ana-chk-0001-aaaa-bbbb-i2',
    ]);
  });

  it('uid diferente com a MESMA key → ids diferentes (sem colisão entre pagadores)', () => {
    expect(idsDoCheckout('uid-ana', 'chk-0001-aaaa-bbbb', 1).pedidoId).not.toBe(
      idsDoCheckout('uid-bruno', 'chk-0001-aaaa-bbbb', 1).pedidoId
    );
  });
});
