// =============================================================================
// Fixtures das abas da FICHA DO TENANT no painel master (ADMIN-VISAO ondas 2 e
// 3). RTL e testes puros — sem Firebase.
//
// Timestamp portátil do core (toDate + toMillis), no mesmo molde de
// `plataforma/repasses/_test/fixtures.ts`.
// =============================================================================

import type { Pagamento, Pedido, Timestamp } from '@leela/core';
import type { VendaDoTenant } from '../_data/vendas';

export function ts(iso: string): Timestamp {
  const d = new Date(iso);
  return {
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime(),
  };
}

/**
 * Cobrança CONFIRMADA com carimbo de conciliação — o caso normal do modo
 * `incorporada`: face 200, serviço 20, líquido 180.
 */
export function mkPagamento(overrides: Partial<Pagamento> = {}): Pagamento {
  return {
    id: 'pag-uid1-key1',
    tenantId: 'castelo-producoes',
    eventoId: 'meia-maratona-floripa-2026',
    pedidoRef: 'ped-uid1-key1',
    status: 'confirmado',
    forma: 'pix',
    valorBase: 200,
    desconto: 0,
    valorFinal: 200,
    conciliacao: {
      idTransacao: 'tx-1',
      gateway: 'asaas',
      taxaValor: 20,
      repasseOrganizador: 180,
    },
    criadoEm: ts('2026-04-10T12:00:00Z'),
    atualizadoEm: ts('2026-04-10T12:05:00Z'),
    ...overrides,
  };
}

export function mkPedido(overrides: Partial<Pedido> = {}): Pedido {
  return {
    id: 'ped-uid1-key1',
    tenantId: 'castelo-producoes',
    eventoId: 'meia-maratona-floripa-2026',
    responsavel: {
      atletaId: 'atleta-1',
      nome: 'Marina Castelo',
      email: 'marina@exemplo.com',
    },
    inscritoRefs: ['ped-uid1-key1-i1'],
    itens: [
      { inscritoRef: 'ped-uid1-key1-i1', valorBase: 200, desconto: 0, valorFinal: 200 },
    ],
    pagamentoRef: 'pag-uid1-key1',
    valorTotal: 200,
    status: 'pago',
    codigoPedido: 'K7M2Q',
    criadoEm: ts('2026-04-10T12:00:00Z'),
    atualizadoEm: ts('2026-04-10T12:05:00Z'),
    ...overrides,
  };
}

/** Uma linha da aba Vendas (cobrança + pedido). */
export function mkVenda(
  pagamento: Partial<Pagamento> = {},
  pedido: Partial<Pedido> | null = {}
): VendaDoTenant {
  return {
    pagamento: mkPagamento(pagamento),
    pedido: pedido === null ? null : mkPedido(pedido),
  };
}
