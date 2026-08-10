// =============================================================================
// packages/api-client/src/platform/tenantVendas.ts
//
// Leitura ADMIN, por tenant, de `pedidos` e `pagamentos` — aba Vendas da
// ficha do tenant no painel master (ADMIN-VISAO onda 1 · S1613-T1 ·
// história S1613).
//
// RN-537 (a visão master lê o carimbo, nunca recalcula dinheiro): esta
// camada é leitura PURA — devolve `Pagamento` com `conciliacao` tal como
// gravada na confirmação (RN-179). Nenhuma soma, nenhuma reconstrução de
// taxa ou de líquido acontece aqui; isso é trabalho da TELA (S1613-T2, onda
// 2, mode-aware — RN-182), fora do escopo desta onda.
//
// SEM orderBy explícito (mesma disciplina de `tenantEventosClubs.ts` e do
// precedente `listarEventosDoTenant`): `where(tenantId==) + limit`, sem
// índice composto novo — a ordenação implícita por `__name__` já é estável
// para `startAfter(snapshot)`. `packages/api-client/src/pedidos.ts` já tem
// um índice composto próprio (`tenantId, eventoId, criadoEm desc`) para a
// listagem POR EVENTO; esta leitura é POR TENANT inteiro (sem eventoId), e
// forçar `orderBy('criadoEm')` aqui exigiria um índice composto novo que
// esta lane não pode declarar (`firestore.indexes.json` fora do território
// — só backend puro sem deploy).
//
// ADR-009: toda query filtra por tenantId. Security Rules: `pagamentos`
// (`firestore.rules:2530`) e `pedidos` (`:2671`) já cruzam a fronteira para
// platform_admin — nenhuma Rule nova.
// =============================================================================

import {
  collection,
  getDocs,
  limit as firestoreLimit,
  query,
  startAfter,
  where,
  type Firestore,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { parsePagamento, parsePedido, type Pagamento, type Pedido } from '@leela/core';

/** Página canônica da tabela densa de Vendas (§2.5). */
export const TENANT_VENDAS_PAGE_SIZE = 20;

/** Teto do pageSize — mesma disciplina de CRM_CLIENTES_PAGE_SIZE_MAX. */
export const TENANT_VENDAS_PAGE_SIZE_MAX = 100;

function clampPageSize(pageSize: number | undefined): number {
  return Math.min(
    Math.max(1, pageSize ?? TENANT_VENDAS_PAGE_SIZE),
    TENANT_VENDAS_PAGE_SIZE_MAX
  );
}

/** Cursor opaco de paginação — snapshot do último doc da página anterior. */
export type TenantVendasCursor = QueryDocumentSnapshot;

export interface TenantVendasOptions {
  cursor?: TenantVendasCursor;
  /** Default 20 (TENANT_VENDAS_PAGE_SIZE); clamp em [1, 100]. */
  pageSize?: number;
}

export interface ListarPedidosDoTenantPaginadoResult {
  itens: Pedido[];
  proxCursor: TenantVendasCursor | null;
}

export interface ListarPagamentosDoTenantPaginadoResult {
  itens: Pagamento[];
  proxCursor: TenantVendasCursor | null;
}

/**
 * Lista os pedidos de UM tenant inteiro (todos os eventos), paginados por
 * cursor. `platform_admin` cruza a Rule já hoje (`firestore.rules:2671`).
 */
export async function listarPedidosDoTenantPaginado(
  db: Firestore,
  tenantId: string,
  options: TenantVendasOptions = {}
): Promise<ListarPedidosDoTenantPaginadoResult> {
  const pageSize = clampPageSize(options.pageSize);
  const constraints: QueryConstraint[] = [
    where('tenantId', '==', tenantId),
    firestoreLimit(pageSize),
  ];
  if (options.cursor) constraints.push(startAfter(options.cursor));

  const snap = await getDocs(query(collection(db, 'pedidos'), ...constraints));
  const itens = snap.docs.map((d) => parsePedido(d.id, d.data()));
  const ultimo = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
  return {
    itens,
    proxCursor: snap.docs.length === pageSize && ultimo ? ultimo : null,
  };
}

/**
 * Lista os pagamentos de UM tenant inteiro, paginados por cursor — a
 * economia carimbada (`conciliacao`) vem exatamente como gravada (RN-537).
 * `platform_admin` cruza a Rule já hoje (`firestore.rules:2530`).
 */
export async function listarPagamentosDoTenantPaginado(
  db: Firestore,
  tenantId: string,
  options: TenantVendasOptions = {}
): Promise<ListarPagamentosDoTenantPaginadoResult> {
  const pageSize = clampPageSize(options.pageSize);
  const constraints: QueryConstraint[] = [
    where('tenantId', '==', tenantId),
    firestoreLimit(pageSize),
  ];
  if (options.cursor) constraints.push(startAfter(options.cursor));

  const snap = await getDocs(query(collection(db, 'pagamentos'), ...constraints));
  const itens = snap.docs.map((d) => parsePagamento(d.id, d.data()));
  const ultimo = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
  return {
    itens,
    proxCursor: snap.docs.length === pageSize && ultimo ? ultimo : null,
  };
}
