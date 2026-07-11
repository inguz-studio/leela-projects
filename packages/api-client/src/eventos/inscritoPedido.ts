// =============================================================================
// packages/api-client/src/eventos/inscritoPedido.ts
//
// Leitura composta do slide-in "Detalhe do inscrito" (LEELA-S203-T3 ·
// FABLE-A-T2): inscrito (já carregado na linha da tabela) → SEU pedido →
// SEU pagamento. Dados `[pag]` NUNCA são denormalizados no Inscrito
// (decisão ADR-011/A-T2): dinheiro vem do kernel por JOIN via `pedidoRef`.
//
// Custo: 2 point reads O(1) (pedido + pagamento) por abertura de slide-in —
// leitura pontual, sem query. Fallback para inscrito LEGADO (pedidoRef
// null): `getPedidoDoInscrito` (array-contains em inscritoRefs).
//
// SÓ leitura — escrita de pedido/pagamento é EXCLUSIVA de Function (Rules).
// =============================================================================

import type { Firestore } from 'firebase/firestore';
import {
  pedidoDoInscritoCoerente,
  type Inscrito,
  type Pagamento,
  type Pedido,
} from '@leela/core';
import { getPagamento, getPedido, getPedidoDoInscrito } from '../pedidos';

/** Fatia do Inscrito necessária ao join (a linha da tabela já a tem) */
export type InscritoParaJoin = Pick<
  Inscrito,
  'id' | 'atletaId' | 'pedidoRef' | 'ehResponsavel'
>;

/** Parâmetros do join inscrito → pedido → pagamento */
export interface GetPedidoEPagamentoDoInscritoParams {
  /** Tenant do claim do usuário (ADR-009 — exigido pelo fallback por query) */
  tenantId: string;
  /** Evento do inscrito (docId = slug) */
  eventoId: string;
  inscrito: InscritoParaJoin;
}

/**
 * Bloco `[pag]` do slide-in. `pedido: null` = inscrição sem pedido (legado
 * pré-ADR-011); `pagamento: null` = pedido ainda sem cobrança criada
 * (`pagamentoRef` null — pedido pendente). O cliente renderiza AUSÊNCIA
 * honesta, nunca valor inventado (S203 §dependência de backend).
 */
export interface PedidoEPagamentoDoInscrito {
  pedido: Pedido | null;
  pagamento: Pagamento | null;
}

/**
 * Carrega o pedido e o pagamento de um inscrito para o slide-in `[pag]`.
 *
 * Caminho quente: `inscrito.pedidoRef` → `getPedido` (point read O(1)).
 * Caminho legado (pedidoRef null): `getPedidoDoInscrito` (query
 * array-contains — a própria query garante a pertinência ao pedido).
 *
 * Guarda de coerência (ADR-011): no caminho por ref, o pedido retornado
 * precisa LISTAR o inscrito e o `ehResponsavel` precisa bater com
 * `pedido.responsavel` — link corrompido LANÇA (mostrar a compra errada é
 * pior que não mostrar; mesmo contrato fail-fast de getPedidoDoInscrito).
 *
 * Rules: leitura exige papel de gestão do tenant (owner/staff) em `pedidos`
 * e `pagamentos`; doc inexistente vira `permission-denied` (ver getPedido).
 */
export async function getPedidoEPagamentoDoInscrito(
  db: Firestore,
  params: GetPedidoEPagamentoDoInscritoParams
): Promise<PedidoEPagamentoDoInscrito> {
  const { tenantId, eventoId, inscrito } = params;

  const pedido = inscrito.pedidoRef
    ? await getPedido(db, inscrito.pedidoRef)
    : await getPedidoDoInscrito(db, { tenantId, eventoId, inscritoId: inscrito.id });

  if (pedido === null) {
    return { pedido: null, pagamento: null };
  }

  if (inscrito.pedidoRef !== null && !pedidoDoInscritoCoerente(inscrito, pedido)) {
    throw new Error(
      `Inscrito ${inscrito.id}: pedidoRef "${inscrito.pedidoRef}" aponta para ` +
        `pedido incoerente (inscritoRefs/ehResponsavel não batem) — ` +
        `vínculo ADR-011 corrompido`
    );
  }

  const pagamento = pedido.pagamentoRef
    ? await getPagamento(db, pedido.pagamentoRef)
    : null;

  return { pedido, pagamento };
}
