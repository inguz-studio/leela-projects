/**
 * pedido.test.ts — LEELA-FABLE-A-T1
 *
 * Unit: tipos/derivações/parse de `Pedido` em @leela/core (ADR-011).
 * Sem I/O — parse fail-fast + guards + derivações puras.
 */

import { describe, expect, it } from 'vitest';
import {
  CAMPOS_FUNCTION_PEDIDO,
  isStatusPedido,
  montarItensDoPedido,
  parsePedido,
  pedidoCoerenteComPagamento,
  pedidoContemInscrito,
  pedidoDeGrupo,
  pedidoPago,
  podeTransicionarStatusPedido,
  STATUS_PEDIDO,
  TRANSICOES_STATUS_PEDIDO,
} from '@leela/core';

const fakeTs = { seconds: 1_770_000_000, nanoseconds: 0 };

/** Uma linha da decomposição por inscrito (re-review A2). */
function itemPedido(n: number): Record<string, unknown> {
  return {
    inscritoRef: `insc-000${n}`,
    loteId: 'lote-2-regular',
    valorBase: 63.0,
    desconto: 6.3,
    valorFinal: 56.7,
  };
}

/**
 * Fixture COERENTE com docPagamento() de pagamento.test.ts (re-review A1):
 * 3 inscritos de R$ 63,00 no mesmo lote, cupom 10% → base 189,00, desconto
 * 18,90, valorTotal 170,10 === pag-0001.valorFinal (equação canônica).
 */
function docPedido(): Record<string, unknown> {
  return {
    tenantId: 'castelo-producoes',
    eventoId: 'meia-floripa-2026',
    responsavel: {
      atletaId: 'atleta-0001',
      nome: 'Marina Silva',
      email: 'marina@example.com',
    },
    inscritoRefs: ['insc-0001', 'insc-0002', 'insc-0003'],
    itens: [itemPedido(1), itemPedido(2), itemPedido(3)],
    pagamentoRef: 'pag-0001',
    valorTotal: 170.1,
    status: 'pago',
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
  };
}

describe('enums de Pedido (ADR-011)', () => {
  it('status aceita exatamente os 4 valores canônicos', () => {
    expect(STATUS_PEDIDO).toEqual(['pendente', 'pago', 'falhou', 'cancelado']);
    for (const status of STATUS_PEDIDO) {
      expect(isStatusPedido(status)).toBe(true);
    }
  });

  it('NÃO existe estorno no nível do pedido (estorno é por inscrito — ADR-011)', () => {
    expect(isStatusPedido('estornado')).toBe(false);
    expect(isStatusPedido('reembolsado')).toBe(false);
    expect(isStatusPedido('confirmado')).toBe(false); // vocabulário do inscrito, não do pedido
  });
});

describe('parsePedido (fail-fast — ADR-011)', () => {
  it('parseia doc válido com os campos mínimos do ADR-011', () => {
    const pedido = parsePedido('ped-0001', docPedido());
    expect(pedido.id).toBe('ped-0001');
    expect(pedido.responsavel.atletaId).toBe('atleta-0001');
    expect(pedido.inscritoRefs).toHaveLength(3);
    expect(pedido.itens).toHaveLength(3);
    expect(pedido.itens[0]).toEqual({
      inscritoRef: 'insc-0001',
      loteId: 'lote-2-regular',
      valorBase: 63.0,
      desconto: 6.3,
      valorFinal: 56.7,
    });
    expect(pedido.pagamentoRef).toBe('pag-0001');
    expect(pedido.valorTotal).toBe(170.1);
    expect(pedido.status).toBe('pago');
  });

  it('pagamentoRef ausente normaliza para null (pedido pré-cobrança = pendente)', () => {
    const raw = docPedido();
    delete raw['pagamentoRef'];
    raw['status'] = 'pendente'; // pré-cobrança é pendente (r1 fix 6: pago exige ref)
    expect(parsePedido('x', raw).pagamentoRef).toBeNull();
  });

  it('lança status "pago" com pagamentoRef null (estado financeiro incoerente — r1 fix 6)', () => {
    const raw = docPedido();
    raw['pagamentoRef'] = null; // status segue 'pago' do doc base
    expect(() => parsePedido('x', raw)).toThrow(/pago.*pagamentoRef null/);
  });

  it('lança sem tenantId (ADR-009)', () => {
    const raw = docPedido();
    delete raw['tenantId'];
    expect(() => parsePedido('x', raw)).toThrow(/tenantId/);
  });

  it('lança sem eventoId (denormalização obrigatória)', () => {
    const raw = docPedido();
    delete raw['eventoId'];
    expect(() => parsePedido('x', raw)).toThrow(/eventoId/);
  });

  it('lança com responsavel incompleto (sem email não há e-mail do pedido)', () => {
    const raw = docPedido();
    raw['responsavel'] = { atletaId: 'a1', nome: 'Fulano' };
    expect(() => parsePedido('x', raw)).toThrow(/responsavel\.email/);
  });

  it('lança com inscritoRefs vazio (pedido tem SEMPRE ≥ 1 inscrito)', () => {
    const raw = docPedido();
    raw['inscritoRefs'] = [];
    expect(() => parsePedido('x', raw)).toThrow(/inscritoRefs/);
  });

  it('lança com inscritoRefs contendo não-string', () => {
    const raw = docPedido();
    raw['inscritoRefs'] = ['insc-0001', 42];
    expect(() => parsePedido('x', raw)).toThrow(/inscritoRefs/);
  });

  it('lança com ids DUPLICADOS em inscritoRefs (r1 fix 5 — split por inscrito)', () => {
    const raw = docPedido();
    raw['inscritoRefs'] = ['insc-0001', 'insc-0002', 'insc-0001'];
    expect(() => parsePedido('x', raw)).toThrow(/duplicados/);
  });

  it('lança com valorTotal negativo ou não-numérico (dinheiro errado > ausente)', () => {
    const raw = docPedido();
    raw['valorTotal'] = -10;
    expect(() => parsePedido('x', raw)).toThrow(/valorTotal/);
    raw['valorTotal'] = '567,00';
    expect(() => parsePedido('x', raw)).toThrow(/valorTotal/);
  });

  it('lança com valorTotal de sub-centavo (r1 fix 2e — helper comum de dinheiro)', () => {
    const raw = docPedido();
    raw['valorTotal'] = 567.0001;
    expect(() => parsePedido('x', raw)).toThrow(/sub-centavo/);
  });

  it('lança sem criadoEm (obrigatório no ADR-011 — doc sumiria do orderBy) — r1 fix 4', () => {
    const semCriadoEm = docPedido();
    delete semCriadoEm['criadoEm'];
    expect(() => parsePedido('x', semCriadoEm)).toThrow(/criadoEm/);

    const malformado = docPedido();
    malformado['criadoEm'] = '2026-07-11T10:00:00Z'; // string ISO não é Timestamp
    expect(() => parsePedido('x', malformado)).toThrow(/criadoEm/);

    const semAtualizadoEm = docPedido();
    delete semAtualizadoEm['atualizadoEm'];
    expect(() => parsePedido('x', semAtualizadoEm)).toThrow(/atualizadoEm/);
  });

  it('lança com status fora do enum', () => {
    const raw = docPedido();
    raw['status'] = 'aguardando';
    expect(() => parsePedido('x', raw)).toThrow(/fora do enum/);
  });

  it('aceita espelhos opcionais formaPagamento/parcelas e valida o shape', () => {
    const raw = docPedido();
    raw['formaPagamento'] = 'cartao_credito';
    raw['parcelas'] = 12;
    const pedido = parsePedido('x', raw);
    expect(pedido.formaPagamento).toBe('cartao_credito');
    expect(pedido.parcelas).toBe(12);

    raw['formaPagamento'] = 'boleto'; // sem boleto — decisão 2026-07-05
    expect(() => parsePedido('x', raw)).toThrow(/formaPagamento/);
    raw['formaPagamento'] = 'pix';
    raw['parcelas'] = 0;
    expect(() => parsePedido('x', raw)).toThrow(/parcelas/);
  });
});

describe('derivações puras de Pedido', () => {
  it('pedidoDeGrupo: N>1 é grupo; auto-inscrição (1) não é', () => {
    expect(pedidoDeGrupo({ inscritoRefs: ['a', 'b'] })).toBe(true);
    expect(pedidoDeGrupo({ inscritoRefs: ['a'] })).toBe(false);
  });

  it('pedidoPago: só status pago', () => {
    expect(pedidoPago({ status: 'pago' })).toBe(true);
    expect(pedidoPago({ status: 'pendente' })).toBe(false);
    expect(pedidoPago({ status: 'cancelado' })).toBe(false);
  });

  it('pedidoContemInscrito: membership por inscritoRefs', () => {
    const pedido = { inscritoRefs: ['insc-1', 'insc-2'] };
    expect(pedidoContemInscrito(pedido, 'insc-2')).toBe(true);
    expect(pedidoContemInscrito(pedido, 'insc-9')).toBe(false);
  });

  it('CAMPOS_FUNCTION_PEDIDO espelha o estado financeiro (escrita só por Function)', () => {
    expect(CAMPOS_FUNCTION_PEDIDO).toEqual([
      'status',
      'valorTotal',
      'itens',
      'pagamentoRef',
      'formaPagamento',
      'parcelas',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Decomposição por inscrito — itens[] (re-review A2)
// ---------------------------------------------------------------------------

describe('parsePedido — itens[] por inscrito (re-review A2 · S904)', () => {
  it('lança SEM itens (decomposição é tão obrigatória quanto valorTotal)', () => {
    const raw = docPedido();
    delete raw['itens'];
    expect(() => parsePedido('x', raw)).toThrow(/itens.*POR INSCRITO/);
  });

  it('lança com nº de linhas ≠ nº de inscritos (decomposição é 1:1)', () => {
    const raw = docPedido();
    raw['itens'] = [itemPedido(1), itemPedido(2)];
    expect(() => parsePedido('x', raw)).toThrow(/1:1/);
  });

  it('lança com linha ÓRFÃ (inscritoRef fora de inscritoRefs)', () => {
    const raw = docPedido();
    raw['itens'] = [itemPedido(1), itemPedido(2), { ...itemPedido(3), inscritoRef: 'insc-9999' }];
    expect(() => parsePedido('x', raw)).toThrow(/linha órfã/);
  });

  it('lança com linha DUPLICADA para o mesmo inscrito', () => {
    const raw = docPedido();
    raw['itens'] = [itemPedido(1), itemPedido(2), itemPedido(2)];
    expect(() => parsePedido('x', raw)).toThrow(/DUPLICADA/);
  });

  it('lança quando a linha viola valorFinal = valorBase − desconto', () => {
    const raw = docPedido();
    raw['itens'] = [
      itemPedido(1),
      itemPedido(2),
      { ...itemPedido(3), valorFinal: 60.0 }, // ≠ 63,00 − 6,30
    ];
    expect(() => parsePedido('x', raw)).toThrow(/valorBase − desconto/);
  });

  it('lança quando Σ itens.valorFinal ≠ valorTotal (equação canônica A1)', () => {
    const raw = docPedido();
    raw['valorTotal'] = 180.0; // Σ linhas segue 170,10
    expect(() => parsePedido('x', raw)).toThrow(/Σ itens\.valorFinal.*valorTotal/);
  });

  it('aceita linha SEM loteId (preço legado — schema evolution)', () => {
    const raw = docPedido();
    const semLote = [itemPedido(1), itemPedido(2), itemPedido(3)].map((item) => {
      const { loteId: _loteId, ...resto } = item;
      return resto;
    });
    raw['itens'] = semLote;
    const pedido = parsePedido('x', raw);
    expect(pedido.itens[0]?.loteId).toBeUndefined();
  });

  it('lança com valor monetário de linha inválido (negativo/sub-centavo)', () => {
    const raw = docPedido();
    raw['itens'] = [itemPedido(1), itemPedido(2), { ...itemPedido(3), valorBase: -1 }];
    expect(() => parsePedido('x', raw)).toThrow(/itens\[2\]\.valorBase/);
  });

  it('lança com valorTotal acima de MAX_MONEY (re-review A7 — teto sano)', () => {
    const raw = docPedido();
    raw['valorTotal'] = 2_000_000_000;
    expect(() => parsePedido('x', raw)).toThrow(/MAX_MONEY/);
  });
});

// ---------------------------------------------------------------------------
// Coerência dos espelhos pós-cobrança (re-review A5)
// ---------------------------------------------------------------------------

describe('parsePedido — espelhos pós-cobrança (re-review A5)', () => {
  it('lança com espelho (formaPagamento) e pagamentoRef null — espelho sem cobrança', () => {
    const raw = docPedido();
    raw['pagamentoRef'] = null;
    raw['status'] = 'pendente'; // isola: pago+ref null dispararia o fix 6
    raw['formaPagamento'] = 'pix';
    expect(() => parsePedido('x', raw)).toThrow(/espelho.*pagamentoRef null/i);
  });

  it('lança com parcelas em pedido PIX — parcelas espelha cartao.parcelas', () => {
    const raw = docPedido();
    raw['formaPagamento'] = 'pix';
    raw['parcelas'] = 3;
    expect(() => parsePedido('x', raw)).toThrow(/parcelas.*cartão/);
  });

  it('lança com parcelas SEM formaPagamento (espelho parcial)', () => {
    const raw = docPedido();
    raw['parcelas'] = 3;
    expect(() => parsePedido('x', raw)).toThrow(/parcelas/);
  });
});

// ---------------------------------------------------------------------------
// montarItensDoPedido — rateio cent-exato do desconto (produtor)
// ---------------------------------------------------------------------------

describe('montarItensDoPedido (re-review A2 — rateio pelo maior resto)', () => {
  it('bases iguais: rateio uniforme, Σ desconto = descontoTotal', () => {
    const itens = montarItensDoPedido(
      [
        { inscritoRef: 'i1', loteId: 'l2', valorBase: 63.0 },
        { inscritoRef: 'i2', loteId: 'l2', valorBase: 63.0 },
        { inscritoRef: 'i3', loteId: 'l2', valorBase: 63.0 },
      ],
      18.9
    );
    expect(itens).toEqual([
      { inscritoRef: 'i1', loteId: 'l2', valorBase: 63.0, desconto: 6.3, valorFinal: 56.7 },
      { inscritoRef: 'i2', loteId: 'l2', valorBase: 63.0, desconto: 6.3, valorFinal: 56.7 },
      { inscritoRef: 'i3', loteId: 'l2', valorBase: 63.0, desconto: 6.3, valorFinal: 56.7 },
    ]);
  });

  it('desconto que NÃO divide: sobra distribuída pelo maior resto, cent-exato', () => {
    // 10,00 sobre 3 × 33,33: quota 3,333… → 3,33/3,33/3,33 + 1 centavo
    const itens = montarItensDoPedido(
      [
        { inscritoRef: 'i1', valorBase: 33.33 },
        { inscritoRef: 'i2', valorBase: 33.33 },
        { inscritoRef: 'i3', valorBase: 33.33 },
      ],
      10.0
    );
    const somaDesconto = itens.reduce((s, i) => s + Math.round(i.desconto * 100), 0);
    const somaFinal = itens.reduce((s, i) => s + Math.round(i.valorFinal * 100), 0);
    expect(somaDesconto).toBe(1000); // Σ desconto = R$ 10,00 EXATO
    expect(somaFinal).toBe(9999 - 1000); // Σ final = 99,99 − 10,00
    // Determinístico: mesma entrada → mesma saída (empate → índice menor)
    expect(montarItensDoPedido(
      [
        { inscritoRef: 'i1', valorBase: 33.33 },
        { inscritoRef: 'i2', valorBase: 33.33 },
        { inscritoRef: 'i3', valorBase: 33.33 },
      ],
      10.0
    )).toEqual(itens);
  });

  it('bases DESIGUAIS (multi-lote): rateio proporcional ao preço', () => {
    const itens = montarItensDoPedido(
      [
        { inscritoRef: 'i1', loteId: 'l1', valorBase: 100.0 },
        { inscritoRef: 'i2', loteId: 'l3', valorBase: 300.0 },
      ],
      40.0
    );
    expect(itens[0]).toMatchObject({ desconto: 10.0, valorFinal: 90.0 });
    expect(itens[1]).toMatchObject({ desconto: 30.0, valorFinal: 270.0 });
  });

  it('sem cupom: desconto 0 em todas as linhas', () => {
    const itens = montarItensDoPedido([{ inscritoRef: 'i1', valorBase: 189.9 }], 0);
    expect(itens).toEqual([
      { inscritoRef: 'i1', valorBase: 189.9, desconto: 0, valorFinal: 189.9 },
    ]);
  });

  it('desconto de 100% zera as linhas; acima da soma → lança', () => {
    const cem = montarItensDoPedido(
      [
        { inscritoRef: 'i1', valorBase: 50.0 },
        { inscritoRef: 'i2', valorBase: 50.0 },
      ],
      100.0
    );
    expect(cem.every((i) => i.valorFinal === 0)).toBe(true);

    expect(() =>
      montarItensDoPedido([{ inscritoRef: 'i1', valorBase: 50.0 }], 60.0)
    ).toThrow(/excede a soma/);
  });

  it('lança com insumo fora do contrato (sem itens; base sub-centavo)', () => {
    expect(() => montarItensDoPedido([], 0)).toThrow(/≥ 1 item/);
    expect(() =>
      montarItensDoPedido([{ inscritoRef: 'i1', valorBase: 10.001 }], 0)
    ).toThrow(/sub-centavo/);
  });

  it('round-trip: a saída passa em parsePedido (invariantes por construção)', () => {
    const itens = montarItensDoPedido(
      [
        { inscritoRef: 'insc-0001', loteId: 'lote-2-regular', valorBase: 63.0 },
        { inscritoRef: 'insc-0002', loteId: 'lote-2-regular', valorBase: 63.0 },
        { inscritoRef: 'insc-0003', loteId: 'lote-2-regular', valorBase: 63.0 },
      ],
      18.9
    );
    const raw = docPedido();
    raw['itens'] = itens;
    expect(() => parsePedido('x', raw)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Equação canônica pedido ⇄ pagamento (re-review A1)
// ---------------------------------------------------------------------------

describe('pedidoCoerenteComPagamento (re-review A1)', () => {
  const pedido = { id: 'ped-0001', pagamentoRef: 'pag-0001', valorTotal: 170.1 };
  const pagamento = { id: 'pag-0001', pedidoRef: 'ped-0001', valorFinal: 170.1 };

  it('true para o par coerente (valorTotal === valorFinal + backlinks 1:1)', () => {
    expect(pedidoCoerenteComPagamento(pedido, pagamento)).toBe(true);
  });

  it('false quando valorTotal ≠ pagamento.valorFinal (fixtures divergentes A1)', () => {
    expect(
      pedidoCoerenteComPagamento({ ...pedido, valorTotal: 567.0 }, pagamento)
    ).toBe(false);
  });

  it('false com backlink quebrado em qualquer direção', () => {
    expect(
      pedidoCoerenteComPagamento({ ...pedido, pagamentoRef: 'pag-9999' }, pagamento)
    ).toBe(false);
    expect(
      pedidoCoerenteComPagamento(pedido, { ...pagamento, pedidoRef: 'ped-9999' })
    ).toBe(false);
    expect(
      pedidoCoerenteComPagamento({ ...pedido, pagamentoRef: null }, pagamento)
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Matriz de transição de status (re-review A9)
// ---------------------------------------------------------------------------

describe('matriz de transição de StatusPedido (re-review A9)', () => {
  it('pendente transiciona para pago/falhou/cancelado', () => {
    expect(podeTransicionarStatusPedido('pendente', 'pago')).toBe(true);
    expect(podeTransicionarStatusPedido('pendente', 'falhou')).toBe(true);
    expect(podeTransicionarStatusPedido('pendente', 'cancelado')).toBe(true);
  });

  it('pago NÃO retrocede (pago ↛ pendente — estorno é por inscrito)', () => {
    expect(podeTransicionarStatusPedido('pago', 'pendente')).toBe(false);
    expect(podeTransicionarStatusPedido('pago', 'cancelado')).toBe(false);
    expect(podeTransicionarStatusPedido('pago', 'falhou')).toBe(false);
  });

  it('estados finais são TERMINAIS (falhou/cancelado não ressuscitam)', () => {
    expect(TRANSICOES_STATUS_PEDIDO.pago).toEqual([]);
    expect(TRANSICOES_STATUS_PEDIDO.falhou).toEqual([]);
    expect(TRANSICOES_STATUS_PEDIDO.cancelado).toEqual([]);
    expect(podeTransicionarStatusPedido('falhou', 'pendente')).toBe(false);
    expect(podeTransicionarStatusPedido('cancelado', 'pago')).toBe(false);
  });

  it('auto-transição não é transição', () => {
    expect(podeTransicionarStatusPedido('pendente', 'pendente')).toBe(false);
  });
});
