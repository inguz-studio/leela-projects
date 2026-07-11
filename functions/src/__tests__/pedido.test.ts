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
  parsePedido,
  pedidoContemInscrito,
  pedidoDeGrupo,
  pedidoPago,
  STATUS_PEDIDO,
} from '@leela/core';

const fakeTs = { seconds: 1_770_000_000, nanoseconds: 0 };

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
    pagamentoRef: 'pag-0001',
    valorTotal: 567.0,
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
    expect(pedido.pagamentoRef).toBe('pag-0001');
    expect(pedido.valorTotal).toBe(567.0);
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
      'pagamentoRef',
      'formaPagamento',
      'parcelas',
    ]);
  });
});
