/**
 * pagamento.test.ts — LEELA-FABLE-A-T1
 *
 * Unit: tipos/derivações/parse de `Pagamento` + `Conciliacao` em @leela/core
 * (ADR-011/ADR-006, campos do slide-in [pag] — LEELA-S203). Sem I/O.
 */

import { describe, expect, it } from 'vitest';
import {
  FORMAS_PAGAMENTO,
  GATEWAYS_PAGAMENTO,
  isFormaPagamento,
  isGatewayPagamento,
  isStatusPagamento,
  pagamentoConciliado,
  pagamentoConfirmado,
  parseConciliacao,
  parsePagamento,
  podeTransicionarStatusPagamento,
  STATUS_PAGAMENTO,
  TRANSICOES_STATUS_PAGAMENTO,
  valorPagoPeloComprador,
} from '@leela/core';

const fakeTs = { seconds: 1_770_000_000, nanoseconds: 0 };

function docPagamento(): Record<string, unknown> {
  return {
    tenantId: 'castelo-producoes',
    eventoId: 'meia-floripa-2026',
    pedidoRef: 'ped-0001',
    status: 'confirmado',
    forma: 'cartao_credito',
    valorBase: 189.0,
    loteNome: 'Lote 2 — Regular',
    cupom: { codigo: 'CORRE10', descontoPct: 10 },
    desconto: 18.9,
    valorFinal: 170.1,
    // Price 3,49% a.m. REAL repassado ao comprador (mesma aritmética de
    // buildInstallmentOptions): 170,10 × 1,0349^12 = 256,73 → 12× de 21,39.
    cartao: {
      bandeira: 'Visa',
      ultimos4: '4821',
      parcelas: 12,
      valorParcela: 21.39,
      valorTotalComJuros: 256.73,
    },
    pagoEm: fakeTs,
    conciliacao: {
      idTransacao: 'asaas_tx_9f2c1',
      gateway: 'asaas',
      taxaPct: 8,
      taxaFixa: 2.0,
      taxaValor: 15.61,
      repasseOrganizador: 154.49,
      repassePrevistoEm: fakeTs,
    },
    criadoEm: fakeTs,
    atualizadoEm: fakeTs,
  };
}

describe('enums de Pagamento', () => {
  it('formas canônicas: cartão e PIX, SEM boleto (decisão 2026-07-05)', () => {
    expect(FORMAS_PAGAMENTO).toEqual(['cartao_credito', 'pix']);
    expect(isFormaPagamento('boleto')).toBe(false);
    expect(isFormaPagamento('credit_card')).toBe(false); // idioma do gateway, não do domínio
  });

  it('status espelha o ChargeStatus do gateway em PT', () => {
    expect(STATUS_PAGAMENTO).toEqual([
      'pendente',
      'confirmado',
      'falhou',
      'estornado',
      'cancelado',
    ]);
    expect(isStatusPagamento('refunded')).toBe(false);
  });

  it('gateway canônico: Asaas (D2 — 2026-07-10)', () => {
    expect(GATEWAYS_PAGAMENTO).toEqual(['asaas']);
    expect(isGatewayPagamento('asaas')).toBe(true);
    expect(isGatewayPagamento('stripe')).toBe(false);
  });
});

describe('parsePagamento (fail-fast — slide-in [pag])', () => {
  it('parseia doc completo (todos os campos do slide-in servidos)', () => {
    const pg = parsePagamento('pag-0001', docPagamento());
    expect(pg.id).toBe('pag-0001');
    expect(pg.pedidoRef).toBe('ped-0001');
    expect(pg.loteNome).toBe('Lote 2 — Regular');
    expect(pg.cupom).toEqual({ codigo: 'CORRE10', descontoPct: 10 });
    expect(pg.desconto).toBe(18.9);
    expect(pg.valorFinal).toBe(170.1);
    expect(pg.cartao?.bandeira).toBe('Visa');
    expect(pg.cartao?.ultimos4).toBe('4821');
    expect(pg.cartao?.parcelas).toBe(12);
    expect(pg.conciliacao?.idTransacao).toBe('asaas_tx_9f2c1');
    expect(pg.conciliacao?.gateway).toBe('asaas');
    expect(pg.conciliacao?.taxaValor).toBe(15.61);
    expect(pg.conciliacao?.repasseOrganizador).toBe(154.49);
  });

  it('parseia doc mínimo PIX pendente (opcionais honestos ausentes)', () => {
    const pg = parsePagamento('pag-min', {
      tenantId: 'castelo-producoes',
      eventoId: 'meia-floripa-2026',
      pedidoRef: 'ped-0002',
      status: 'pendente',
      forma: 'pix',
      valorBase: 99.0,
      desconto: 0,
      valorFinal: 99.0,
      criadoEm: fakeTs,
      atualizadoEm: fakeTs,
    });
    expect(pg.cartao).toBeUndefined();
    expect(pg.cupom).toBeUndefined();
    expect(pg.pagoEm).toBeUndefined();
    expect(pg.conciliacao).toBeUndefined();
  });

  it('lança sem tenantId (ADR-009) e sem pedidoRef (ADR-011)', () => {
    const semTenant = docPagamento();
    delete semTenant['tenantId'];
    expect(() => parsePagamento('x', semTenant)).toThrow(/tenantId/);

    const semPedido = docPagamento();
    delete semPedido['pedidoRef'];
    expect(() => parsePagamento('x', semPedido)).toThrow(/pedidoRef/);
  });

  it('lança com forma boleto (fora do domínio)', () => {
    const raw = docPagamento();
    raw['forma'] = 'boleto';
    expect(() => parsePagamento('x', raw)).toThrow(/sem boleto/);
  });

  it('lança com cartao presente em pagamento PIX (incoerência de união)', () => {
    const raw = docPagamento();
    raw['forma'] = 'pix';
    expect(() => parsePagamento('x', raw)).toThrow(/cartao/);
  });

  it('lança com ultimos4 fora do formato (4 dígitos, nunca o PAN)', () => {
    const raw = docPagamento();
    (raw['cartao'] as Record<string, unknown>)['ultimos4'] = '4821990011';
    expect(() => parsePagamento('x', raw)).toThrow(/ultimos4/);
  });

  it('lança com valores monetários negativos (base/desconto/final)', () => {
    for (const campo of ['valorBase', 'desconto', 'valorFinal']) {
      const raw = docPagamento();
      raw[campo] = -1;
      expect(() => parsePagamento('x', raw)).toThrow(new RegExp(campo));
    }
  });

  it('lança com cupom.descontoPct fora de 0–100', () => {
    const raw = docPagamento();
    raw['cupom'] = { codigo: 'CORRE10', descontoPct: 130 };
    expect(() => parsePagamento('x', raw)).toThrow(/descontoPct/);
  });
});

describe('invariantes monetárias cross-field (review r1 fix 2)', () => {
  it('(a) valorFinal = valorBase − desconto: doc coerente passa; incoerente lança', () => {
    const ok = parsePagamento('pag-a', docPagamento()); // 189,00 − 18,90 = 170,10
    expect(ok.valorFinal).toBe(170.1);

    const raw = docPagamento();
    raw['valorFinal'] = 165.0; // ≠ 189,00 − 18,90
    delete raw['cartao']; // isola a invariante (a)
    raw['forma'] = 'pix';
    delete raw['conciliacao']; // (d) dispararia junto — isolar
    expect(() => parsePagamento('x', raw)).toThrow(/valorFinal.*valorBase − desconto/);
  });

  it('(b) valorTotalComJuros nunca fica abaixo do valorFinal (juros repassados)', () => {
    const raw = docPagamento();
    const cartao = raw['cartao'] as Record<string, unknown>;
    cartao['valorTotalComJuros'] = 150.0; // < valorFinal 170,10
    cartao['valorParcela'] = 12.5; // 12 × 12,50 = 150 — isola a invariante (b)
    expect(() => parsePagamento('x', raw)).toThrow(/nunca reduzem o total/);
  });

  it('(c) parcelas × valorParcela ≈ valorTotalComJuros com meia-centavo/parcela', () => {
    // No LIMITE da tolerância (12 × 0,005 = 0,06): 12 × 21,40 = 256,80 vs 256,74 — PASSA
    const noLimite = docPagamento();
    (noLimite['cartao'] as Record<string, unknown>)['valorParcela'] = 21.4;
    (noLimite['cartao'] as Record<string, unknown>)['valorTotalComJuros'] = 256.74;
    expect(() => parsePagamento('x', noLimite)).not.toThrow();

    // FORA da tolerância: 12 × 20,00 = 240,00 vs 256,73 — LANÇA
    const fora = docPagamento();
    (fora['cartao'] as Record<string, unknown>)['valorParcela'] = 20.0;
    expect(() => parsePagamento('x', fora)).toThrow(/valorParcela.*valorTotalComJuros/);
  });

  it('(d) repasseOrganizador ≈ valorFinal − taxaValor (1 centavo de folga p/ gateway)', () => {
    // 170,10 − 15,61 = 154,49 (exato — doc completo) e 154,50 (1 centavo) passam
    expect(() => parsePagamento('pag-d', docPagamento())).not.toThrow();
    const umCentavo = docPagamento();
    (umCentavo['conciliacao'] as Record<string, unknown>)['repasseOrganizador'] = 154.5;
    expect(() => parsePagamento('x', umCentavo)).not.toThrow();

    // repasse forjado/corrompido lança
    const forjado = docPagamento();
    (forjado['conciliacao'] as Record<string, unknown>)['repasseOrganizador'] = 200.0;
    expect(() => parsePagamento('x', forjado)).toThrow(/repasseOrganizador/);

    // parseConciliacao SEM valorFinal (uso standalone) não tem como checar (d)
    expect(() =>
      parseConciliacao('x', {
        idTransacao: 'tx1',
        gateway: 'asaas',
        taxaValor: 15.61,
        repasseOrganizador: 200.0,
      })
    ).not.toThrow();
  });

  it('(e) rejeita valores com fração de sub-centavo (ex.: taxaValor 32.239999)', () => {
    const raw = docPagamento();
    (raw['conciliacao'] as Record<string, unknown>)['taxaValor'] = 32.239999;
    expect(() => parsePagamento('x', raw)).toThrow(/sub-centavo/);

    const base = docPagamento();
    base['valorBase'] = 189.001;
    expect(() => parsePagamento('x', base)).toThrow(/sub-centavo/);
  });
});

describe('coerência de estado (review r1 fix 6) e timestamps (fix 4)', () => {
  it('lança status pendente com pagoEm ou conciliacao presentes', () => {
    const comPagoEm = docPagamento();
    comPagoEm['status'] = 'pendente';
    delete comPagoEm['conciliacao'];
    expect(() => parsePagamento('x', comPagoEm)).toThrow(/pendente.*pagoEm/);

    const comConciliacao = docPagamento();
    comConciliacao['status'] = 'pendente';
    delete comConciliacao['pagoEm'];
    expect(() => parsePagamento('x', comConciliacao)).toThrow(/pendente.*conciliacao/);
  });

  it('lança sem criadoEm/atualizadoEm ou com timestamp malformado', () => {
    const semCriadoEm = docPagamento();
    delete semCriadoEm['criadoEm'];
    expect(() => parsePagamento('x', semCriadoEm)).toThrow(/criadoEm/);

    const malformado = docPagamento();
    malformado['atualizadoEm'] = '2026-07-11';
    expect(() => parsePagamento('x', malformado)).toThrow(/atualizadoEm/);
  });
});

// ---------------------------------------------------------------------------
// Matriz de coerência de estado COMPLETA (re-review A3/A5)
// ---------------------------------------------------------------------------

describe('matriz de coerência de estado (re-review A3/A5)', () => {
  it('confirmado SEM pagoEm → lança (confirmação carimba pagoEm no mesmo write)', () => {
    const raw = docPagamento();
    delete raw['pagoEm'];
    expect(() => parsePagamento('x', raw)).toThrow(/confirmado.*sem pagoEm/);
  });

  it('estornado exige pagoEm (já foi pago antes do estorno)', () => {
    const semPagoEm = docPagamento();
    semPagoEm['status'] = 'estornado';
    delete semPagoEm['pagoEm'];
    expect(() => parsePagamento('x', semPagoEm)).toThrow(/estornado.*sem pagoEm/);

    const coerente = docPagamento();
    coerente['status'] = 'estornado';
    expect(() => parsePagamento('x', coerente)).not.toThrow();
  });

  it('falhou/cancelado NÃO carregam pagoEm nem conciliacao (nunca liquidou)', () => {
    const falhouComPagoEm = docPagamento();
    falhouComPagoEm['status'] = 'falhou';
    delete falhouComPagoEm['conciliacao'];
    expect(() => parsePagamento('x', falhouComPagoEm)).toThrow(/falhou.*pagoEm/);

    const canceladoComConciliacao = docPagamento();
    canceladoComConciliacao['status'] = 'cancelado';
    delete canceladoComConciliacao['pagoEm'];
    expect(() => parsePagamento('x', canceladoComConciliacao)).toThrow(
      /cancelado.*conciliacao/
    );
  });

  it('confirmado no CARTÃO exige o bloco cartao (espelho do slide-in — A5)', () => {
    const raw = docPagamento();
    delete raw['cartao'];
    expect(() => parsePagamento('x', raw)).toThrow(/SEM o bloco "cartao"/);

    // PIX confirmado sem cartao é coerente (cartao só existe no cartão)
    const pix = docPagamento();
    pix['forma'] = 'pix';
    delete pix['cartao'];
    expect(() => parsePagamento('x', pix)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Cupom percentual × desconto (re-review A6)
// ---------------------------------------------------------------------------

describe('cupom percentual cruzado com desconto (re-review A6)', () => {
  it('lança quando desconto ≠ roundMoney(valorBase × descontoPct/100)', () => {
    const raw: Record<string, unknown> = {
      tenantId: 'castelo-producoes',
      eventoId: 'meia-floripa-2026',
      pedidoRef: 'ped-0002',
      status: 'pendente',
      forma: 'pix',
      valorBase: 189.0,
      cupom: { codigo: 'CORRE10', descontoPct: 10 },
      desconto: 15.0, // ≠ 18,90 (10% de 189,00)
      valorFinal: 174.0, // isola A6: (a) base − desconto segue válida
      criadoEm: fakeTs,
      atualizadoEm: fakeTs,
    };
    expect(() => parsePagamento('x', raw)).toThrow(/cupom percentual/);
  });

  it('cupom FIXO (sem descontoPct) não cruza — qualquer desconto coerente passa', () => {
    const raw: Record<string, unknown> = {
      tenantId: 'castelo-producoes',
      eventoId: 'meia-floripa-2026',
      pedidoRef: 'ped-0002',
      status: 'pendente',
      forma: 'pix',
      valorBase: 189.0,
      cupom: { codigo: 'CORRA50' },
      desconto: 50.0,
      valorFinal: 139.0,
      criadoEm: fakeTs,
      atualizadoEm: fakeTs,
    };
    expect(() => parsePagamento('x', raw)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Idempotência do webhook no tipo (re-review A9 — forward)
// ---------------------------------------------------------------------------

describe('webhookEventoId (re-review A9 — espelho do ledger de entregas)', () => {
  it('parseia quando presente (id do último evento aplicado)', () => {
    const raw = docPagamento();
    raw['webhookEventoId'] = 'evt-conf-1';
    expect(parsePagamento('x', raw).webhookEventoId).toBe('evt-conf-1');
  });

  it('ausente = opcional honesto (nenhum evento aplicado ainda)', () => {
    expect(parsePagamento('x', docPagamento()).webhookEventoId).toBeUndefined();
  });

  it('lança com shape inválido (vazio/não-string)', () => {
    const vazio = docPagamento();
    vazio['webhookEventoId'] = '';
    expect(() => parsePagamento('x', vazio)).toThrow(/webhookEventoId/);
    const numero = docPagamento();
    numero['webhookEventoId'] = 42;
    expect(() => parsePagamento('x', numero)).toThrow(/webhookEventoId/);
  });
});

// ---------------------------------------------------------------------------
// Matriz de transição de status (re-review A9)
// ---------------------------------------------------------------------------

describe('matriz de transição de StatusPagamento (re-review A9)', () => {
  it('pendente transiciona para confirmado/falhou/cancelado', () => {
    expect(podeTransicionarStatusPagamento('pendente', 'confirmado')).toBe(true);
    expect(podeTransicionarStatusPagamento('pendente', 'falhou')).toBe(true);
    expect(podeTransicionarStatusPagamento('pendente', 'cancelado')).toBe(true);
  });

  it('confirmado só avança para estornado (nunca retrocede a pendente)', () => {
    expect(podeTransicionarStatusPagamento('confirmado', 'estornado')).toBe(true);
    expect(podeTransicionarStatusPagamento('confirmado', 'pendente')).toBe(false);
    expect(podeTransicionarStatusPagamento('confirmado', 'falhou')).toBe(false);
  });

  it('falhou/cancelado/estornado são TERMINAIS', () => {
    expect(TRANSICOES_STATUS_PAGAMENTO.falhou).toEqual([]);
    expect(TRANSICOES_STATUS_PAGAMENTO.cancelado).toEqual([]);
    expect(TRANSICOES_STATUS_PAGAMENTO.estornado).toEqual([]);
    expect(podeTransicionarStatusPagamento('estornado', 'confirmado')).toBe(false);
    expect(podeTransicionarStatusPagamento('falhou', 'pendente')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Teto monetário (re-review A7)
// ---------------------------------------------------------------------------

describe('MAX_MONEY (re-review A7 — teto sano de R$ 1e9)', () => {
  it('lança com valorBase acima do teto (cent-exatidão ilusória)', () => {
    const raw = docPagamento();
    raw['valorBase'] = 2_000_000_000;
    expect(() => parsePagamento('x', raw)).toThrow(/MAX_MONEY/);
  });

  it('aceita exatamente o teto (1e9 é o último valor válido)', () => {
    const raw: Record<string, unknown> = {
      tenantId: 'castelo-producoes',
      eventoId: 'meia-floripa-2026',
      pedidoRef: 'ped-0002',
      status: 'pendente',
      forma: 'pix',
      valorBase: 1_000_000_000,
      desconto: 0,
      valorFinal: 1_000_000_000,
      criadoEm: fakeTs,
      atualizadoEm: fakeTs,
    };
    expect(() => parsePagamento('x', raw)).not.toThrow();
  });
});

describe('parseConciliacao (fail-fast)', () => {
  it('lança com gateway fora do enum (D2 — só Asaas)', () => {
    expect(() =>
      parseConciliacao('x', {
        idTransacao: 'tx1',
        gateway: 'pagarme',
        taxaValor: 1,
        repasseOrganizador: 9,
      })
    ).toThrow(/gateway/);
  });

  it('lança sem idTransacao ou sem repasseOrganizador', () => {
    expect(() =>
      parseConciliacao('x', { gateway: 'asaas', taxaValor: 1, repasseOrganizador: 9 })
    ).toThrow(/idTransacao/);
    expect(() =>
      parseConciliacao('x', { idTransacao: 'tx1', gateway: 'asaas', taxaValor: 1 })
    ).toThrow(/repasseOrganizador/);
  });

  it('aceita os DOIS modelos de taxa por tenant: percentual pura e percentual+fixo', () => {
    const pura = parseConciliacao('x', {
      idTransacao: 'tx1',
      gateway: 'asaas',
      taxaPct: 10,
      taxaValor: 17.01,
      repasseOrganizador: 153.09,
    });
    expect(pura.taxaPct).toBe(10);
    expect(pura.taxaFixa).toBeUndefined();

    const composta = parseConciliacao('x', {
      idTransacao: 'tx2',
      gateway: 'asaas',
      taxaPct: 8,
      taxaFixa: 2.0,
      taxaValor: 15.61,
      repasseOrganizador: 154.49,
    });
    expect(composta.taxaFixa).toBe(2.0);
  });

  it('lança com taxaPct fora de 0–100', () => {
    expect(() =>
      parseConciliacao('x', {
        idTransacao: 'tx1',
        gateway: 'asaas',
        taxaPct: 101,
        taxaValor: 1,
        repasseOrganizador: 9,
      })
    ).toThrow(/taxaPct/);
  });
});

describe('derivações puras de Pagamento', () => {
  it('pagamentoConfirmado: só status confirmado', () => {
    expect(pagamentoConfirmado({ status: 'confirmado' })).toBe(true);
    expect(pagamentoConfirmado({ status: 'pendente' })).toBe(false);
    expect(pagamentoConfirmado({ status: 'estornado' })).toBe(false);
  });

  it('pagamentoConciliado: presença do bloco de conciliação', () => {
    const pg = parsePagamento('pag-0001', docPagamento());
    expect(pagamentoConciliado(pg)).toBe(true);
    const semConciliacao = docPagamento();
    delete semConciliacao['conciliacao'];
    expect(pagamentoConciliado(parsePagamento('pag-2', semConciliacao))).toBe(false);
  });

  it('valorPagoPeloComprador: com juros no cartão parcelado; valorFinal no PIX', () => {
    const comCartao = parsePagamento('pag-0001', docPagamento());
    // Price 3,49% a.m. real: 170,10 × 1,0349^12 = 256,73 (juros repassados)
    expect(valorPagoPeloComprador(comCartao)).toBe(256.73);
    expect(valorPagoPeloComprador({ valorFinal: 99.0 })).toBe(99.0);
  });
});
