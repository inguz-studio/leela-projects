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
  montarItensDoPedido,
  proximaEtapa,
  roundMoney,
  validarDadosMinimosInscrito,
  type CupomVenda,
  type KitVenda,
  type LoteVenda,
  type Timestamp,
} from '@leela/core';
import {
  idsDoCheckout,
  kitEnumInscritoFromId,
  validarCreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import type { CotarInscricaoCheckoutResult } from '../checkout/cotarInscricaoCheckout';

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
      { modalidade: '10k', loteId: '10k-l2', loteNome: 'Lote 2', kitNome: null, kitPreco: 0, preco: 189.9 },
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

  it('cai no preço LEGADO quando a modalidade NÃO tem lotes configurados (schema evolution)', () => {
    const sale = venda({
      itens: [{ modalidade: '10k', lotesDaModalidade: [], precoLegado: 99.9 }],
    });
    expect(sale.itens[0]).toEqual({
      modalidade: '10k', loteId: null, loteNome: null, kitNome: null, kitPreco: 0, preco: 99.9,
    });
  });

  it('JANELA-MORTA: com lotes todos encerrados/esgotados, precoLegado NÃO reabre a venda (espelho S300 #1)', () => {
    const encerradoPorData = lote({
      id: '10k-l1', nome: 'Lote 1', ordem: 1, preco: 149.9,
      inicioEm: ts('2026-01-01T00:00:00-03:00'), fimEm: ts('2026-02-01T00:00:00-03:00'),
    });
    const esgotado = lote({ id: '10k-l2', nome: 'Lote 2', ordem: 2, preco: 189.9, vendidos: 100 });
    expect(() =>
      venda({
        itens: [{
          modalidade: '10k',
          lotesDaModalidade: [encerradoPorData, esgotado],
          precoLegado: 99.9, // presente — e mesmo assim NÃO vende ao preço-base
        }],
      })
    ).toThrow(/venda fechada/);
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

// ===========================================================================
// 5. REFINO KIT — revisão antagonista (Fable · Schneier). Refuta a integridade
//    do dinheiro na fiação de kit que entrou no checkout (commit dc57504).
// ===========================================================================

// Kits canônicos do seed (kits.seed.ts) — a fonte de verdade do preço é o DOC.
const KIT_OURO: KitVenda = { nome: 'Kit Ouro', preco: 89, modalidades: ['21k'] };
const KIT_PRATA: KitVenda = { nome: 'Kit Prata', preco: 35, modalidades: ['10k', '21k'] };
const SEM_KIT: KitVenda = { nome: 'Sem kit', preco: -15, modalidades: ['5k'] };

describe('H1 — preço do kit NUNCA vem do cliente (só kitId; doc é a verdade)', () => {
  it('o input do checkout não tem campo de preço de kit — só kitId (string) + kit (enum)', () => {
    // O cliente injeta um "preço" fingindo ser o kit → o guard de enum recusa
    // (kit deve ser string do enum, nunca objeto com preço arbitrário).
    const erros = validarCreateInscricaoChargeInput({
      eventoId: 'meia-floripa-2026',
      inscritos: [
        {
          nome: 'Ana Souza',
          email: 'ana@exemplo.com',
          cpf: '52998224725',
          modalidade: '21k',
          kit: { preco: -9999 } as unknown, // tentativa de injeção de preço
          kitId: 'kit-ouro',
        },
      ],
      responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
      forma: 'pix',
      parcelas: 1,
      idempotencyKey: 'chk-0001-aaaa-bbbb',
    });
    expect(erros.join(' ')).toMatch(/kit fora do enum/);
  });

  it('kitId válido (string) é aceito — o preço será resolvido do doc no servidor', () => {
    const erros = validarCreateInscricaoChargeInput({
      eventoId: 'meia-floripa-2026',
      inscritos: [
        { nome: 'Ana Souza', email: 'ana@exemplo.com', cpf: '52998224725', modalidade: '21k', kitId: 'kit-ouro' },
      ],
      responsavel: { nome: 'Ana Souza', email: 'ana@exemplo.com' },
      forma: 'pix',
      parcelas: 1,
      idempotencyKey: 'chk-0001-aaaa-bbbb',
    });
    expect(erros).toEqual([]);
  });
});

describe('H2 — kit de outra modalidade NÃO precifica (RN-210, defesa no core)', () => {
  it('Kit Ouro (só 21k) numa inscrição 10k → LANÇA (não ganha o preço/benefício)', () => {
    expect(() =>
      venda({ itens: [{ modalidade: '10k', lotesDaModalidade: LOTES_10K, kit: KIT_OURO }] })
    ).toThrow(/não é ofertado para a modalidade|RN-210/);
  });

  it('Sem kit (desconto só-5k) aplicado numa 10k → LANÇA (desconto não vaza p/ outra modalidade)', () => {
    expect(() =>
      venda({ itens: [{ modalidade: '10k', lotesDaModalidade: LOTES_10K, kit: SEM_KIT }] })
    ).toThrow(/não é ofertado para a modalidade|RN-210/);
  });

  it('kit na modalidade CERTA precifica normalmente (prova que o guard não é falso-positivo)', () => {
    const sale = venda({ itens: [{ modalidade: '10k', lotesDaModalidade: LOTES_10K, kit: KIT_PRATA }] });
    expect(sale.itens[0]?.kitNome).toBe('Kit Prata');
    expect(sale.itens[0]?.kitPreco).toBe(35);
    expect(sale.itens[0]?.preco).toBe(224.9); // 189.90 + 35
  });
});

describe('H3 — kit-desconto não zera/negativa a venda (piso do item + guard global)', () => {
  it('EXPLOIT antes do fix: item negativo (kit-desconto > lote) num GRUPO escapava do guard global e detonava 500 no rateio — agora LANÇA limpo', () => {
    // 5k lote R$ 10 + Sem kit −R$15 = −R$5. Sozinho, o guard global valorFinal≤0
    // pegaria; em GRUPO (com um 10k positivo) o TOTAL fica > 0 e a linha negativa
    // passava por computeSaleState, explodindo só lá no parseMoney (500).
    const semKit5k: KitVenda = { nome: 'Sem kit', preco: -15, modalidades: ['5k'] };
    expect(() =>
      venda({
        itens: [
          { modalidade: '10k', lotesDaModalidade: LOTES_10K },
          {
            modalidade: '5k',
            lotesDaModalidade: [lote({ id: '5k-barato', nome: 'Lote 2', preco: 10 })],
            kit: semKit5k,
          },
        ],
      })
    ).toThrow(/NEGATIVO|negativo/);
  });

  it('valorFinal ≤ 0 (kit-desconto + cupom levam a venda a zero) → LANÇA (sem cobrança de R$ 0)', () => {
    // 5k R$ 20 + Sem kit −15 = 5; cupom fixo R$ 5 → valorFinal 0 → bloqueado.
    const semKit5k: KitVenda = { nome: 'Sem kit', preco: -15, modalidades: ['5k'] };
    expect(() =>
      venda({
        itens: [
          {
            modalidade: '5k',
            lotesDaModalidade: [lote({ id: '5k-20', nome: 'Lote 2', preco: 20 })],
            kit: semKit5k,
          },
        ],
        cupom: cupom({ codigo: 'ZERA', tipo: 'fixo', valor: 5 }),
      })
    ).toThrow(/gratuito|valorFinal/);
  });

  it('não dá para EMPILHAR desconto: adicionar um inscrito com kit-desconto AUMENTA o total (lote ≫ desconto)', () => {
    const soloUm = venda({ itens: [{ modalidade: '10k', lotesDaModalidade: LOTES_10K }] });
    const comMais = venda({
      itens: [
        { modalidade: '10k', lotesDaModalidade: LOTES_10K },
        { modalidade: '5k', lotesDaModalidade: LOTES_5K, kit: SEM_KIT }, // 129.90 − 15
      ],
    });
    expect(comMais.valorBase).toBe(304.8); // 189.90 + 114.90
    expect(comMais.valorBase).toBeGreaterThan(soloUm.valorBase);
  });
});

describe('H4 — arredondamento com o delta do kit mantém a invariante Σ==total', () => {
  it('Σ itens.preco == valorBase e Σ itens.valorFinal == valorFinal (cent-exato) com kits + cupom', () => {
    const sale = venda({
      itens: [
        { modalidade: '10k', lotesDaModalidade: LOTES_10K, kit: KIT_PRATA }, // 224.90
        { modalidade: '5k', lotesDaModalidade: LOTES_5K, kit: SEM_KIT }, // 114.90
      ],
      cupom: cupom({ codigo: 'GRUPO10' }), // 10%
    });
    // valorBase = Σ dos preços por item (cada um já cent-exato)
    const somaItens = roundMoney(sale.itens.reduce((s, i) => s + i.preco, 0));
    expect(somaItens).toBe(sale.valorBase);
    expect(sale.valorBase).toBe(339.8);
    expect(sale.desconto).toBe(33.98); // 10% de 339.80
    expect(sale.valorFinal).toBe(305.82);

    // O rateio do desconto (produtor de escrita) fecha cent-exato sobre as
    // MESMAS bases (lote + kit) — nenhum centavo criado/perdido pelo delta.
    const linhas = montarItensDoPedido(
      sale.itens.map((i, n): { inscritoRef: string; loteId: string | null; valorBase: number } => ({
        inscritoRef: `i${n + 1}`,
        loteId: i.loteId,
        valorBase: i.preco,
      })),
      sale.desconto
    );
    const somaFinal = roundMoney(linhas.reduce((s, l) => s + l.valorFinal, 0));
    const somaDesc = roundMoney(linhas.reduce((s, l) => s + l.desconto, 0));
    expect(somaFinal).toBe(sale.valorFinal);
    expect(somaDesc).toBe(sale.desconto);
    for (const l of linhas) {
      expect(roundMoney(l.valorBase - l.desconto)).toBe(l.valorFinal);
    }
  });

  it('kit com preço em sub-centavo é normalizado (roundMoney) antes de somar', () => {
    const kitSubcentavo: KitVenda = { nome: 'Kit X', preco: 35.004, modalidades: ['10k'] };
    const sale = venda({ itens: [{ modalidade: '10k', lotesDaModalidade: LOTES_10K, kit: kitSubcentavo }] });
    expect(sale.itens[0]?.kitPreco).toBe(35); // 35.004 → 35.00
    expect(sale.itens[0]?.preco).toBe(224.9);
  });
});

describe('H5 — a cotação read-only NÃO expõe a taxa (canal-lateral do termo privado)', () => {
  it('o contrato da cotação não tem campo `taxa` (prova de tipo — trava no gate tsc)', () => {
    const amostra = {} as CotarInscricaoCheckoutResult;
    // @ts-expect-error `taxa` não faz parte do contrato da cotação pública (RN-330/RN-404)
    const _taxa = amostra.taxa;
    void _taxa;
    expect(true).toBe(true);
  });
});

describe('H1/fulfillment — rótulo do kit DERIVA do kitId cobrado, não do cliente', () => {
  it('kitEnumInscritoFromId mapeia os ids canônicos do seed (id→enum)', () => {
    expect(kitEnumInscritoFromId('kit-ouro')).toBe('kit_ouro');
    expect(kitEnumInscritoFromId('kit-prata')).toBe('kit_prata');
    expect(kitEnumInscritoFromId('kit-basico')).toBe('kit_basico');
    expect(kitEnumInscritoFromId('sem-kit')).toBe('sem_kit');
  });

  it('sem kit / kitId custom → sem_kit (degradação honesta; preço vem do core)', () => {
    expect(kitEnumInscritoFromId(undefined)).toBe('sem_kit');
    expect(kitEnumInscritoFromId('')).toBe('sem_kit');
    expect(kitEnumInscritoFromId('kit-personalizado-do-organizador')).toBe('sem_kit');
  });

  it('EXPLOIT fechado: pagar Sem kit (−R$15) e carimbar kit_ouro no doc é impossível — o rótulo espelha o kitId cobrado', () => {
    // Antes: `kit` (rótulo) e `kitId` (preço) eram inputs independentes.
    // Agora o rótulo persistido deriva do kitId → não há como pagar barato
    // (kitId 'sem-kit') e receber o kit caro pelo rótulo ('kit_ouro').
    const kitIdCobrado = 'sem-kit';
    const rotuloForjadoPeloCliente = 'kit_ouro';
    expect(kitEnumInscritoFromId(kitIdCobrado)).toBe('sem_kit');
    expect(kitEnumInscritoFromId(kitIdCobrado)).not.toBe(rotuloForjadoPeloCliente);
  });
});
