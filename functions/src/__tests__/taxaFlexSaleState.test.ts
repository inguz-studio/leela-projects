/**
 * taxaFlexSaleState.test.ts — LEELA-TAXAFLEX-T2 (RN-180/182/183 · unit puro)
 *
 * Extensão do `computeSaleState`/`computeLiquidoProdutor` de percentual
 * único para percentual + fixo POR MEIO (tabela RN-178):
 *   - repassada: comprador paga face + taxa(meio); líquido = face;
 *   - incorporada: comprador paga face; líquido = face − taxa(meio);
 *   - PIX e cartão com linhas distintas ⇒ totais distintos (base da
 *     exibição por opção — S1210);
 *   - caminho LEGADO (sem tabela) byte a byte igual ao vigente (regressão);
 *   - rateio do fixo nas linhas do pedido (RN-181 — mecânica reusada de
 *     `montarItensDoPedido`, ∑ cent-exato por maior resto).
 *
 * Fixtures espelham rn347TaxaRepassada.test.ts (seed canônico Castelo).
 */
import { describe, expect, it } from 'vitest';
import {
  computeLiquidoProdutor,
  computeSaleState,
  computeTaxa,
  montarItensDoPedido,
  roundMoney,
  type LoteVenda,
  type TaxaMeioResolvida,
  type Timestamp,
} from '@leela/core';

function ts(iso: string): Timestamp {
  const ms = Date.parse(iso);
  return {
    seconds: Math.floor(ms / 1000),
    nanoseconds: (ms % 1000) * 1_000_000,
    toDate: () => new Date(ms),
    toMillis: () => ms,
  } as Timestamp;
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
const RULES_SEM_JUROS = { maxParcelas: 12, jurosAoMes: 0, parcelaMinima: 20 };
const FEE = 10.5; // % legado do termo da Castelo (RN-406)
const FACE = 189.9;

const PIX_6_200: TaxaMeioResolvida = { percentual: 6, fixoCentavos: 200, origem: 'global' };
const CARTAO_8_150: TaxaMeioResolvida = { percentual: 8, fixoCentavos: 150, origem: 'global' };

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

// Taxa cent-exata esperada: round(18990 × 600/10000) = 1139c + 200c = 13,39
const TAXA_PIX = 13.39;
// round(18990 × 800/10000) = round(1519,2) = 1519c + 150c = 16,69
const TAXA_CARTAO = 16.69;

// ── RN-180 · repassada com tabela: comprador paga face + taxa(meio) ────────
describe('RN-180 — repassada com pct+fixo por meio', () => {
  it('PIX {6%, R$2,00}: taxa 13,39 · total 203,29 · líquido = face', () => {
    const sale = venda({ modoTaxa: 'repassada', taxaMeio: PIX_6_200 });
    expect(sale.taxa).toBe(TAXA_PIX);
    expect(sale.taxaRepassada).toBe(TAXA_PIX);
    expect(sale.totalComprador).toBe(roundMoney(FACE + TAXA_PIX)); // 203.29
    expect(sale.totalCobrado).toBe(203.29);
    expect(sale.receitaLiquidaOrganizador).toBe(FACE);
    expect(sale.taxaMeioAplicada).toEqual(PIX_6_200);
  });

  it('cartão {8%, R$1,50}: taxa 16,69 — total DIFERENTE do PIX (S1210)', () => {
    const pix = venda({ modoTaxa: 'repassada', taxaMeio: PIX_6_200 });
    const cartao = venda({
      forma: 'cartao_credito',
      modoTaxa: 'repassada',
      taxaMeio: CARTAO_8_150,
    });
    expect(cartao.taxa).toBe(TAXA_CARTAO);
    expect(cartao.totalComprador).toBe(roundMoney(FACE + TAXA_CARTAO)); // 206.59
    expect(cartao.totalComprador).not.toBe(pix.totalComprador);
  });

  it('exemplo verbatim: face R$100 + PIX {6%, R$2} ⇒ comprador paga R$108,00', () => {
    const sale = venda({
      itens: [{ modalidade: '10k', lotesDaModalidade: [lote({ id: 'l1', preco: 100 })] }],
      modoTaxa: 'repassada',
      taxaMeio: PIX_6_200,
    });
    expect(sale.taxa).toBe(8);
    expect(sale.totalCobrado).toBe(108);
  });
});

// ── RN-180/182 · incorporada com tabela: líquido = face − taxa(meio) ───────
describe('RN-180/182 — incorporada com pct+fixo por meio', () => {
  it('cartão {8%, R$1,50}: total = face; líquido = face − 16,69', () => {
    const sale = venda({
      forma: 'cartao_credito',
      modoTaxa: 'incorporada',
      taxaMeio: CARTAO_8_150,
    });
    expect(sale.taxa).toBe(TAXA_CARTAO);
    expect(sale.taxaRepassada).toBe(0);
    expect(sale.totalComprador).toBe(FACE);
    expect(sale.totalCobrado).toBe(FACE);
    expect(sale.receitaLiquidaOrganizador).toBe(roundMoney(FACE - TAXA_CARTAO)); // 173.21
  });

  it('o líquido VARIA por meio em incorporada (PIX ≠ cartão)', () => {
    const pix = venda({ modoTaxa: 'incorporada', taxaMeio: PIX_6_200 });
    const cartao = venda({
      forma: 'cartao_credito',
      modoTaxa: 'incorporada',
      taxaMeio: CARTAO_8_150,
    });
    expect(pix.receitaLiquidaOrganizador).toBe(roundMoney(FACE - TAXA_PIX));
    expect(cartao.receitaLiquidaOrganizador).toBe(roundMoney(FACE - TAXA_CARTAO));
    expect(pix.receitaLiquidaOrganizador).not.toBe(cartao.receitaLiquidaOrganizador);
  });
});

// ── Regressão · caminho LEGADO byte a byte (RN-406 vigente) ────────────────
describe('legado — sem tabela, nada muda (regressão)', () => {
  it('sem taxaMeio: idêntico ao vigente + linha congelável origem legado', () => {
    const sale = venda();
    expect(sale.taxa).toBe(computeTaxa(FACE, FEE)); // 19.94
    expect(sale.receitaLiquidaOrganizador).toBe(roundMoney(FACE - 19.94));
    expect(sale.taxaMeioAplicada).toEqual({
      percentual: FEE,
      fixoCentavos: 0,
      origem: 'legado',
    });
  });

  it("origem 'legado' explícita com pct FORA do passo bp (10,555%) NÃO lança", () => {
    const sale = venda({
      taxaMeio: { percentual: 10.555, fixoCentavos: 0, origem: 'legado' },
    });
    // caminho REAIS legado: roundMoney(189.9 × 0.10555) = 20.04
    expect(sale.taxa).toBe(computeTaxa(FACE, 10.555));
    expect(sale.taxaMeioAplicada.origem).toBe('legado');
  });

  it('taxaMeio null se comporta como ausente', () => {
    expect(venda({ taxaMeio: null }).taxa).toBe(computeTaxa(FACE, FEE));
  });
});

// ── computeLiquidoProdutor — união number | TaxaMeio ───────────────────────
describe('computeLiquidoProdutor com TaxaMeio (RN-182)', () => {
  it('incorporada: R$100 com {6%, R$2} ⇒ líquido 92,00', () => {
    expect(computeLiquidoProdutor(100, { percentual: 6, fixoCentavos: 200 }, 'incorporada')).toBe(92);
  });

  it('repassada: líquido = face nos dois formatos de fee', () => {
    expect(computeLiquidoProdutor(100, { percentual: 6, fixoCentavos: 200 }, 'repassada')).toBe(100);
    expect(computeLiquidoProdutor(100, 10.5, 'repassada')).toBe(100);
  });

  it('number legado: comportamento vigente (regressão)', () => {
    expect(computeLiquidoProdutor(189.9, 10.5, 'incorporada')).toBe(roundMoney(189.9 - 19.94));
  });

  it('TaxaMeio inválida lança (tabela lixo nunca precifica)', () => {
    expect(() =>
      computeLiquidoProdutor(100, { percentual: 6.001, fixoCentavos: 0 }, 'incorporada')
    ).toThrow(RangeError);
    expect(() =>
      computeLiquidoProdutor(100, { percentual: 6, fixoCentavos: 1.5 }, 'incorporada')
    ).toThrow(RangeError);
  });
});

// ── RN-181 (mecânica) · fixo entra no rateio cent-exato das linhas ─────────
describe('RN-181 — fixo no rateio itens[].taxaRepassada (maior resto)', () => {
  it('fixo indivisível por 3: ∑ linhas === taxa total, diferença máx. 1c', () => {
    // 3 inscrições de R$100; taxa PIX {6%, R$2,00} sobre 300 = 18 + 2 = 20,00
    // 20,00 / 3 = 6,666… ⇒ rateio 6,67 + 6,67 + 6,66 (maior resto)
    const sale = venda({
      itens: [
        { modalidade: '10k', lotesDaModalidade: [lote({ id: 'a', preco: 100 })] },
        { modalidade: '10k', lotesDaModalidade: [lote({ id: 'b', preco: 100 })] },
        { modalidade: '10k', lotesDaModalidade: [lote({ id: 'c', preco: 100 })] },
      ],
      modoTaxa: 'repassada',
      taxaMeio: PIX_6_200,
    });
    expect(sale.taxa).toBe(20);
    const itens = montarItensDoPedido(
      sale.itens.map((i, idx) => ({
        inscritoRef: `insc-${idx}`,
        valorBase: i.preco,
        loteId: i.loteId,
      })),
      sale.desconto,
      sale.taxaRepassada
    );
    const fatias = itens.map((i) => i.taxaRepassada ?? 0);
    expect(roundMoney(fatias.reduce((s, f) => s + f, 0))).toBe(20);
    expect(Math.max(...fatias) - Math.min(...fatias)).toBeLessThanOrEqual(0.01 + 1e-9);
    expect(fatias.every((f) => f > 0)).toBe(true);
  });

  it('bases desiguais: ∑ fatias === taxa com fixo, proporcional ao valorFinal', () => {
    // Bases 189,90 + 129,90 = 319,80; taxa PIX {6%, R$2}:
    // round(31980 × 600/10000) = 1919c + 200c = 21,19
    const itens = montarItensDoPedido(
      [
        { inscritoRef: 'a', valorBase: 189.9 },
        { inscritoRef: 'b', valorBase: 129.9 },
      ],
      0,
      21.19
    );
    const fatias = itens.map((i) => i.taxaRepassada ?? 0);
    expect(roundMoney(fatias.reduce((s, f) => s + f, 0))).toBe(21.19);
    // Proporcionalidade: linha maior carrega fatia maior
    expect(fatias[0]).toBeGreaterThan(fatias[1] ?? 0);
  });
});
