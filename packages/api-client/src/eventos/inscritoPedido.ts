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

/** Código estável do erro de vínculo inscrito↔pedido/pagamento corrompido. */
export const VINCULO_PEDIDO_CORROMPIDO = 'VINCULO_PEDIDO_CORROMPIDO' as const;

/**
 * Ref (`pedidoRef`/`pagamentoRef`) do inscrito NÃO resolve. Com as Rules
 * atuais um doc inexistente vira `permission-denied` (resource == null nunca
 * prova a guarda de tenant) — indistinguível, no fio, de uma negação real de
 * autorização. Mas neste caminho o chamador JÁ leu o inscrito (provou acesso
 * ao tenant); logo a causa é uma REF PENDURADA ou um vínculo cross-tenant
 * corrompido, não falta de permissão do usuário. Este erro TIPADO separa
 * "vínculo corrompido" de "não autorizado" para o chamador tratar (ex.:
 * telemetria de dado sujo vs. tela de acesso negado).
 */
export class VinculoPedidoCorrompidoError extends Error {
  readonly code = VINCULO_PEDIDO_CORROMPIDO;
  readonly inscritoId: string;
  readonly ref: string;
  readonly tipo: 'pedido' | 'pagamento';

  constructor(
    inscritoId: string,
    ref: string,
    tipo: 'pedido' | 'pagamento',
    cause?: unknown
  ) {
    super(
      `Inscrito ${inscritoId}: ${tipo}Ref "${ref}" não resolve (ref pendurada ` +
        `ou vínculo cross-tenant) — vínculo ADR-011 corrompido ` +
        `[${VINCULO_PEDIDO_CORROMPIDO}]`
    );
    this.name = 'VinculoPedidoCorrompidoError';
    this.inscritoId = inscritoId;
    this.ref = ref;
    this.tipo = tipo;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

/** Erro do SDK cujo `code` indica ref não-resolvível (inexistente/negada). */
function refNaoResolvida(err: unknown): boolean {
  const code = (err as { code?: unknown } | null | undefined)?.code;
  return code === 'permission-denied' || code === 'not-found';
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

  // Caminho quente por ref: ref pendurada (doc inexistente) ou vínculo
  // cross-tenant vira `permission-denied` no fio — traduzimos para erro TIPADO
  // de vínculo corrompido, distinto de negação de autorização (o chamador já
  // provou acesso lendo o inscrito). Caminho legado (query) não passa por aqui.
  let pedido: Pedido | null;
  if (inscrito.pedidoRef !== null) {
    const pedidoRef = inscrito.pedidoRef;
    try {
      pedido = await getPedido(db, pedidoRef);
    } catch (err) {
      if (refNaoResolvida(err)) {
        throw new VinculoPedidoCorrompidoError(inscrito.id, pedidoRef, 'pedido', err);
      }
      throw err;
    }
  } else {
    pedido = await getPedidoDoInscrito(db, { tenantId, eventoId, inscritoId: inscrito.id });
  }

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

  // Mesma tradução para o `pagamentoRef`: um ref financeiro pendurado é dado
  // corrompido, não falta de permissão.
  let pagamento: Pagamento | null = null;
  if (pedido.pagamentoRef !== null) {
    const pagamentoRef = pedido.pagamentoRef;
    try {
      pagamento = await getPagamento(db, pagamentoRef);
    } catch (err) {
      if (refNaoResolvida(err)) {
        throw new VinculoPedidoCorrompidoError(inscrito.id, pagamentoRef, 'pagamento', err);
      }
      throw err;
    }
  }

  return { pedido, pagamento };
}
