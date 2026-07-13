/**
 * rn347TaxaRepassada.test.ts — RN-347 · fio do checkout (taxa incorporada vs
 * repassada). Unit PURO (sem I/O, sem Emulator).
 *
 * Invariantes provadas aqui (as de emulator vivem em
 * rn347Checkout.integration.test.ts):
 *   I1. 'incorporada' (default e explícito): total do comprador = face;
 *       líquido do produtor = face − taxa (REGRESSÃO — E09 já lê).
 *   I2. 'repassada': total = face + taxa; taxa SEMPRE do termo, server-side;
 *       líquido do produtor = face; cupom desconta o face ANTES da taxa.
 *   I5. Parcelamento Price sobre o total CORRETO nos dois modos (base =
 *       total do comprador, não o face).
 *   Rateio: Σ itens.taxaRepassada === taxa (cent-exato, maior resto);
 *       linha gratuita nunca recebe taxa; 'incorporada' não ganha o campo.
 *   Contrato: cotação expõe taxaServico (VALOR) e NUNCA platformFeePct;
 *       o input do checkout NÃO tem taxaModo (forja é inerte por contrato —
 *       o modo vem do doc do evento, ver carregarInsumos).
 *   Parse: pedido/pagamento aceitam os campos novos e mantêm as invariantes
 *       monetárias (piso do cartão endurecido: juros nunca ficam abaixo de
 *       valorFinal + taxaRepassada).
 */

import { describe, expect, it } from 'vitest';
import {
  buildInstallmentOptions,
  computeSaleState,
  computeTaxa,
  montarItensDoPedido,
  parsePagamento,
  parsePedido,
  roundMoney,
  valorPagoPeloComprador,
  type CupomVenda,
  type LoteVenda,
  type ModoTaxa,
  type Timestamp,
} from '@leela/core';
import {
  validarCreateInscricaoChargeInput,
  type CreateInscricaoChargeInput,
} from '../checkout/createInscricaoCharge';
import {
  validarCotarInput,
  type CotarInscricaoCheckoutResult,
} from '../checkout/cotarInscricaoCheckout';

// ---------------------------------------------------------------------------
// Fixtures (espelho de checkoutCore.test.ts — seed canônico da Castelo)
// ---------------------------------------------------------------------------

function ts(iso: string): Timestamp {
  const ms = Date.parse(iso);
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: (ms % 1000) * 1_000_000,
    toDate: () => new Date(ms),
    toMillis: () => ms,
  };
}

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

const LOTES_10K: readonly LoteVenda[] = [
  lote({ id: '10k-l2', nome: 'Lote 2', ordem: 2, preco: 189.9, vendidos: 40 }),
];
const LOTES_5K: readonly LoteVenda[] = [
  lote({ id: '5k-l2', nome: 'Lote 2', ordem: 2, preco: 129.9 }),
];

const RULES_COM_JUROS = { maxParcelas: 12, jurosAoMes: 3.49, parcelaMinima: 20 };
const RULES_SEM_JUROS = { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 20 };
const FEE = 10.5; // % do TERMO da Castelo (RN-406 — vem do termo, não daqui)

const CUPOM_10: CupomVenda = {
  codigo: 'HEROI10',
  tipo: 'percentual',
  valor: 10,
  tetoUso: null,
  usos: 0,
  inicioEm: ts('2026-01-01T00:00:00-03:00'),
  fimEm: ts('2026-04-27T00:00:00-03:00'),
};

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

// Face 189.90 · taxa 10,5% = 19.94 (roundMoney(189.9 × 0.105) = 19.9395 → 19.94)
const FACE = 189.9;
const TAXA_FACE = computeTaxa(FACE, FEE); // 19.94

// ---------------------------------------------------------------------------
// I1 — 'incorporada' (default e explícito): comportamento VIGENTE intocado
// ---------------------------------------------------------------------------

describe('RN-347 · I1 — incorporada: comprador paga o FACE (regressão)', () => {
  it('sem modoTaxa (default) — total = face; taxaRepassada 0; líquido = face − taxa', () => {
    const sale = venda();
    expect(sale.valorFinal).toBe(FACE);
    expect(sale.taxaRepassada).toBe(0);
    expect(sale.totalComprador).toBe(FACE);
    expect(sale.totalCobrado).toBe(FACE);
    expect(sale.taxa).toBe(TAXA_FACE);
    expect(sale.receitaLiquidaOrganizador).toBe(roundMoney(FACE - TAXA_FACE)); // 169.96
  });

  it("modoTaxa 'incorporada' explícito — idêntico ao default", () => {
    const sale = venda({ modoTaxa: 'incorporada' });
    expect(sale.totalCobrado).toBe(FACE);
    expect(sale.taxaRepassada).toBe(0);
    expect(sale.receitaLiquidaOrganizador).toBe(roundMoney(FACE - TAXA_FACE));
  });

  it('incorporada + cupom/parcelas — cadeia INALTERADA (parcelamento sobre o face)', () => {
    const sale = venda({
      cupom: CUPOM_10,
      forma: 'cartao_credito',
      parcelas: 3,
      installmentRules: RULES_COM_JUROS,
    });
    const valorFinal = roundMoney(FACE - roundMoney(FACE * 0.1)); // 170.91
    expect(sale.valorFinal).toBe(valorFinal);
    expect(sale.totalComprador).toBe(valorFinal);
    // Opções = MESMA base de antes do RN-347 (face pós-desconto)
    expect(sale.opcoesParcelamento).toEqual(
      buildInstallmentOptions(valorFinal, RULES_COM_JUROS)
    );
    expect(sale.totalCobrado).toBe(sale.parcelamento.valorTotal);
  });

  it('modoTaxa fora do enum (lixo de chamador JS) → lança', () => {
    expect(() => venda({ modoTaxa: 'gratis' as ModoTaxa })).toThrow(/modoTaxa/);
  });
});

// ---------------------------------------------------------------------------
// I2 — 'repassada': comprador paga face + taxa (taxa do TERMO, server-side)
// ---------------------------------------------------------------------------

describe('RN-347 · I2 — repassada: total = face + taxa; líquido = face', () => {
  it('PIX: totalCobrado = face + taxa (taxa = % do termo sobre o valorFinal)', () => {
    const sale = venda({ modoTaxa: 'repassada' });
    expect(sale.valorFinal).toBe(FACE); // organizador segue enxergando o face
    expect(sale.taxa).toBe(TAXA_FACE);
    expect(sale.taxaRepassada).toBe(TAXA_FACE);
    expect(sale.totalComprador).toBe(roundMoney(FACE + TAXA_FACE)); // 209.84
    expect(sale.totalCobrado).toBe(209.84);
    // Líquido do produtor = FACE (a taxa é cobrada por fora — RN-347/E09)
    expect(sale.receitaLiquidaOrganizador).toBe(FACE);
  });

  it('cupom desconta o FACE antes da taxa (taxa sobre o valorFinal pós-desconto)', () => {
    const sale = venda({ modoTaxa: 'repassada', cupom: CUPOM_10 });
    const valorFinal = roundMoney(FACE - roundMoney(FACE * 0.1)); // 170.91
    const taxa = computeTaxa(valorFinal, FEE); // 17.95
    expect(sale.valorFinal).toBe(valorFinal);
    expect(sale.desconto).toBe(18.99);
    expect(sale.taxaRepassada).toBe(taxa);
    expect(sale.totalCobrado).toBe(roundMoney(valorFinal + taxa)); // 188.86
  });

  it('fee 0 (produtor-sócio) → taxaRepassada 0; total = face mesmo em repassada', () => {
    const sale = venda({ modoTaxa: 'repassada', platformFeePct: 0 });
    expect(sale.taxaRepassada).toBe(0);
    expect(sale.totalCobrado).toBe(FACE);
    expect(sale.receitaLiquidaOrganizador).toBe(FACE);
  });
});

// ---------------------------------------------------------------------------
// I5 — parcelamento Price sobre o TOTAL DO COMPRADOR nos dois modos
// ---------------------------------------------------------------------------

describe('RN-347 · I5 — Price sobre o total correto', () => {
  it('repassada + cartão: opções construídas sobre face + taxa (não sobre o face)', () => {
    const sale = venda({
      modoTaxa: 'repassada',
      forma: 'cartao_credito',
      parcelas: 3,
      installmentRules: RULES_COM_JUROS,
    });
    const totalComprador = roundMoney(FACE + TAXA_FACE); // 209.84
    expect(sale.totalComprador).toBe(totalComprador);
    expect(sale.opcoesParcelamento).toEqual(
      buildInstallmentOptions(totalComprador, RULES_COM_JUROS)
    );
    // 1x do CARTÃO carrega 1 mês de juros Price (modelo do termo) — a base
    // é o total do COMPRADOR (face + taxa), não o face (RN-347/I5).
    expect(sale.opcoesParcelamento[0]?.valorTotal).toBe(
      roundMoney(totalComprador * 1.0349)
    );
    // 3x: juros Price sobre (face + taxa); parcelas fecham cent-a-cent
    const esperado3x = roundMoney(totalComprador * Math.pow(1.0349, 3));
    expect(sale.parcelamento.parcelas).toBe(3);
    expect(sale.parcelamento.valorTotal).toBe(esperado3x);
    expect(sale.totalCobrado).toBe(esperado3x);
    expect(
      Math.abs(3 * sale.parcelamento.valorParcela - sale.parcelamento.valorTotal)
    ).toBeLessThanOrEqual(3 * 0.005 + 1e-9);
    // Juros nunca reduzem: total parcelado ≥ total à vista do comprador
    expect(sale.parcelamento.valorTotal).toBeGreaterThanOrEqual(totalComprador);
  });

  it('repassada + PIX segue 1x sem juros (total = face + taxa)', () => {
    const sale = venda({ modoTaxa: 'repassada', installmentRules: RULES_COM_JUROS });
    expect(sale.opcoesParcelamento).toHaveLength(1);
    expect(sale.totalCobrado).toBe(roundMoney(FACE + TAXA_FACE));
  });
});

// ---------------------------------------------------------------------------
// Rateio da taxa por linha (estorno por inscrito — RN-341 + RN-347)
// ---------------------------------------------------------------------------

describe('RN-347 · montarItensDoPedido — rateio da taxa repassada', () => {
  it('grupo 2 linhas + cupom: Σ taxaRepassada == taxa total (cent-exato, maior resto)', () => {
    // 10k 189.90 + 5k 129.90; cupom 10%; fee 10,5% ⇒ taxa 30.22 sobre 287.82
    const sale = computeSaleState({
      itens: [
        { modalidade: '10k', lotesDaModalidade: LOTES_10K },
        { modalidade: '5k', lotesDaModalidade: LOTES_5K },
      ],
      cupom: CUPOM_10,
      forma: 'pix',
      parcelas: 1,
      installmentRules: RULES_SEM_JUROS,
      platformFeePct: FEE,
      modoTaxa: 'repassada',
      agora: AGORA,
    });
    expect(sale.taxaRepassada).toBe(30.22);

    const itens = montarItensDoPedido(
      sale.itens.map((item, i) => ({
        inscritoRef: `ped-x-i${i + 1}`,
        loteId: item.loteId,
        valorBase: item.preco,
      })),
      sale.desconto,
      sale.taxaRepassada
    );
    const somaTaxa = roundMoney(
      itens.reduce((s, i) => s + (i.taxaRepassada ?? 0), 0)
    );
    expect(somaTaxa).toBe(sale.taxaRepassada);
    // Determinístico: proporcional ao valorFinal da linha (maior resto)
    expect(itens[0]?.taxaRepassada).toBe(17.94);
    expect(itens[1]?.taxaRepassada).toBe(12.28);
    // Invariantes vigentes intocadas (Σ valorFinal == face pós-desconto)
    expect(roundMoney(itens.reduce((s, i) => s + i.valorFinal, 0))).toBe(
      sale.valorFinal
    );
    // O que os inscritos PAGARAM fecha com o total do comprador (PIX)
    expect(
      roundMoney(itens.reduce((s, i) => s + i.valorFinal + (i.taxaRepassada ?? 0), 0))
    ).toBe(sale.totalCobrado);
  });

  it("modo 'incorporada' (sem 3º argumento): NENHUMA linha ganha o campo — doc idêntico ao vigente", () => {
    const itens = montarItensDoPedido(
      [{ inscritoRef: 'i1', valorBase: 189.9 }],
      0
    );
    expect(itens[0]).not.toHaveProperty('taxaRepassada');
  });

  it('linha gratuita (valorFinal 0) nunca recebe taxa — tudo vai para as pagas', () => {
    const itens = montarItensDoPedido(
      [
        { inscritoRef: 'i1', valorBase: 100 },
        { inscritoRef: 'i2', valorBase: 0 },
      ],
      0,
      10.5
    );
    expect(itens[0]?.taxaRepassada).toBe(10.5);
    expect(itens[1]?.taxaRepassada).toBe(0);
  });

  it('taxa > 0 com pedido 100% gratuito → lança (taxa sem base de rateio)', () => {
    expect(() =>
      montarItensDoPedido([{ inscritoRef: 'i1', valorBase: 0 }], 0, 5)
    ).toThrow(/taxaRepassadaTotal/);
  });

  it('taxa negativa ou sub-centavo → lança (parseMoney na fronteira)', () => {
    expect(() =>
      montarItensDoPedido([{ inscritoRef: 'i1', valorBase: 100 }], 0, -1)
    ).toThrow();
    expect(() =>
      montarItensDoPedido([{ inscritoRef: 'i1', valorBase: 100 }], 0, 10.505)
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Parse — pedido/pagamento aceitam os campos RN-347 (e negam lixo)
// ---------------------------------------------------------------------------

describe('RN-347 · parsePedido/parsePagamento — campos novos', () => {
  const TS = ts('2026-03-15T12:00:00-03:00');

  function pedidoDoc(itemExtra: Record<string, unknown> = {}) {
    return {
      tenantId: 'castelo-producoes',
      eventoId: 'meia-floripa-2026',
      responsavel: { atletaId: 'uid-ana', nome: 'Ana', email: 'ana@ex.com' },
      inscritoRefs: ['i1'],
      itens: [
        { inscritoRef: 'i1', valorBase: 189.9, desconto: 0, valorFinal: 189.9, ...itemExtra },
      ],
      pagamentoRef: null,
      valorTotal: 189.9,
      status: 'pendente',
      criadoEm: TS,
      atualizadoEm: TS,
    };
  }

  it('parsePedido aceita itens[].taxaRepassada (≥ 0, cent-exato)', () => {
    const pedido = parsePedido('ped-1', pedidoDoc({ taxaRepassada: 19.94 }));
    expect(pedido.itens[0]?.taxaRepassada).toBe(19.94);
    // Equação canônica A1 permanece FACE (a taxa não entra em valorTotal)
    expect(pedido.valorTotal).toBe(189.9);
  });

  it('parsePedido sem o campo (docs vigentes/incorporada) segue válido', () => {
    const pedido = parsePedido('ped-1', pedidoDoc());
    expect(pedido.itens[0]?.taxaRepassada).toBeUndefined();
  });

  it('parsePedido nega taxaRepassada negativa/sub-centavo', () => {
    expect(() => parsePedido('ped-1', pedidoDoc({ taxaRepassada: -1 }))).toThrow();
    expect(() => parsePedido('ped-1', pedidoDoc({ taxaRepassada: 19.945 }))).toThrow();
  });

  function pagamentoDoc(extra: Record<string, unknown> = {}) {
    return {
      tenantId: 'castelo-producoes',
      eventoId: 'meia-floripa-2026',
      pedidoRef: 'ped-1',
      status: 'pendente',
      forma: 'pix',
      valorBase: 189.9,
      desconto: 0,
      valorFinal: 189.9,
      criadoEm: TS,
      atualizadoEm: TS,
      ...extra,
    };
  }

  it('parsePagamento aceita taxaRepassada; valorPagoPeloComprador soma no PIX', () => {
    const pagamento = parsePagamento('pag-1', pagamentoDoc({ taxaRepassada: 19.94 }));
    expect(pagamento.taxaRepassada).toBe(19.94);
    expect(valorPagoPeloComprador(pagamento)).toBe(209.84);
    // Invariante vigente: valorFinal = base − desconto NÃO muda (face)
    expect(pagamento.valorFinal).toBe(189.9);
  });

  it('sem o campo (incorporada/legado): valorPagoPeloComprador == valorFinal (regressão)', () => {
    const pagamento = parsePagamento('pag-1', pagamentoDoc());
    expect(valorPagoPeloComprador(pagamento)).toBe(189.9);
  });

  it('piso do cartão ENDURECIDO: valorTotalComJuros < valorFinal + taxaRepassada → lança', () => {
    const cartaoDoc = pagamentoDoc({
      forma: 'cartao_credito',
      taxaRepassada: 19.94,
      cartao: {
        bandeira: 'Visa',
        ultimos4: '4821',
        parcelas: 1,
        valorParcela: 189.9,
        // Igual ao face, mas ABAIXO de face + taxa: cobrança que "perdeu" a
        // taxa repassada no parcelamento — doc incoerente, lança.
        valorTotalComJuros: 189.9,
      },
    });
    expect(() => parsePagamento('pag-1', cartaoDoc)).toThrow(/taxaRepassada/);
  });

  it('cartão coerente (total com juros ≥ face + taxa) → passa', () => {
    const pagamento = parsePagamento(
      'pag-1',
      pagamentoDoc({
        forma: 'cartao_credito',
        taxaRepassada: 19.94,
        cartao: {
          bandeira: 'Visa',
          ultimos4: '4821',
          parcelas: 1,
          valorParcela: 209.84,
          valorTotalComJuros: 209.84,
        },
      })
    );
    expect(valorPagoPeloComprador(pagamento)).toBe(209.84);
  });
});

// ---------------------------------------------------------------------------
// Contrato/confidencialidade (I3 forja + I4 vazamento — camada de contrato;
// a prova E2E contra o doc do evento vive na suíte de emulator)
// ---------------------------------------------------------------------------

describe('RN-347 · contrato — forja de taxaModo é inerte; pct nunca sai', () => {
  const INPUT_VALIDO: CreateInscricaoChargeInput = {
    eventoId: 'meia-floripa-2026',
    inscritos: [
      { nome: 'Ana Silva', email: 'ana@ex.com', cpf: '52998224725', modalidade: '10k' },
    ],
    responsavelIndex: 0,
    responsavel: { nome: 'Ana Silva', email: 'ana@ex.com' },
    forma: 'pix',
    parcelas: 1,
    idempotencyKey: 'k-rn347-0001',
  };

  it('o input do checkout NÃO tem campo taxaModo (prova de tipo — trava no tsc)', () => {
    const amostra = {} as CreateInscricaoChargeInput;
    // @ts-expect-error `taxaModo` não faz parte do contrato — o modo vem do DOC do evento
    const _modo = amostra.taxaModo;
    void _modo;
    expect(true).toBe(true);
  });

  it('payload com taxaModo forjado passa na validação SEM efeito (campo ignorado)', () => {
    // O validador não conhece o campo; carregarInsumos lê o modo do DOC.
    // A prova de que o total NÃO muda com a forja é da suíte de emulator.
    expect(
      validarCreateInscricaoChargeInput({ ...INPUT_VALIDO, taxaModo: 'incorporada' })
    ).toEqual([]);
    expect(
      validarCotarInput({
        eventoId: 'meia-floripa-2026',
        itens: [{ modalidade: '10k' }],
        forma: 'pix',
        parcelas: 1,
        taxaModo: 'incorporada',
      })
    ).toEqual([]);
  });

  it('cotação expõe taxaServico (VALOR em R$) e NUNCA platformFeePct/taxa', () => {
    const amostra = {} as CotarInscricaoCheckoutResult;
    const _valor: number = amostra.taxaServico; // presente e numérico
    const _aVista: number = amostra.totalAVista; // total à vista do comprador
    void _valor;
    void _aVista;
    // @ts-expect-error `platformFeePct` nunca sai na cotação pública (703db9c)
    const _pct = amostra.platformFeePct;
    void _pct;
    // @ts-expect-error `taxa` (repasse do organizador) segue fora do contrato
    const _taxa = amostra.taxa;
    void _taxa;
    expect(true).toBe(true);
  });
});
