// =============================================================================
// packages/api-client/src/platform/tenantEventosClubs.ts
//
// Leitura ADMIN, por tenant, de `eventos` e `clubes` — ficha do tenant no
// painel master (ADMIN-VISAO onda 1 · S1612-T2 · histórias S1612).
//
// Por que NÃO é `listarEventosDoTenant` (já existe em
// `packages/api-client/src/eventos/queries.ts`) nem `listClubesByTenant` (já
// existe em `packages/api-client/src/clubs.ts`): as duas já leem por tenant,
// mas nenhuma pagina por cursor — devolvem uma página única de até
// `pageLimit` docs sem sinalizar se há mais. A primeira já serve o fan-out
// da fila de estornos (teto conhecido e ASSUMIDO ali); reaproveitar o MESMO
// contrato aqui faria a ficha do tenant mentir "mostrando X de Y" quando Y
// na verdade é "≥ X, não sei quantos" — o oposto de contagem honesta. Este
// módulo nasce cursor-first, mesmo contrato de `{itens, proxCursor}` de
// `listarInscritos`/`listarCrmClientes`.
//
// SEM orderBy explícito, de propósito (mesma disciplina de
// `listarEventosDoTenant`): a query fica no índice de campo único de
// `tenantId`, que já existe — nenhum índice composto novo. O Firestore
// ordena implicitamente por `__name__` (docId) quando nenhum orderBy é
// dado, e essa ordem é ESTÁVEL o bastante para `startAfter(snapshot)`
// paginar sem repetir nem pular itens entre chamadas.
//
// ADR-009: toda query filtra por tenantId. Security Rules: `eventos`
// (`firestore.rules:744`) e `clubes` (`:2018`) já cruzam a fronteira para
// platform_admin — nenhuma Rule nova (02-inventario-gap-map.md §Parte 4).
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
import { parseEvento, type Clube, type Evento } from '@leela/core';

/** Página canônica das tabelas densas da ficha do tenant (§2.5). */
export const TENANT_DRILLDOWN_PAGE_SIZE = 20;

/** Teto do pageSize — mesma disciplina de CRM_CLIENTES_PAGE_SIZE_MAX. */
export const TENANT_DRILLDOWN_PAGE_SIZE_MAX = 100;

function clampPageSize(pageSize: number | undefined): number {
  return Math.min(
    Math.max(1, pageSize ?? TENANT_DRILLDOWN_PAGE_SIZE),
    TENANT_DRILLDOWN_PAGE_SIZE_MAX
  );
}

/** Cursor opaco de paginação — snapshot do último doc da página anterior. */
export type TenantDrilldownCursor = QueryDocumentSnapshot;

export interface TenantDrilldownOptions {
  cursor?: TenantDrilldownCursor;
  /** Default 20 (TENANT_DRILLDOWN_PAGE_SIZE); clamp em [1, 100]. */
  pageSize?: number;
}

export interface ListarEventosDoTenantPaginadoResult {
  itens: Evento[];
  /** null quando não há próxima página — NUNCA um total inventado. */
  proxCursor: TenantDrilldownCursor | null;
}

export interface ListarClubesDoTenantPaginadoResult {
  itens: Clube[];
  proxCursor: TenantDrilldownCursor | null;
}

/**
 * Lista os eventos de UM tenant, paginados por cursor (aba Eventos da ficha
 * — S1612-T3, tela; esta função é só a leitura). `platform_admin` cruza a
 * Rule já hoje (`firestore.rules:744`).
 */
export async function listarEventosDoTenantPaginado(
  db: Firestore,
  tenantId: string,
  options: TenantDrilldownOptions = {}
): Promise<ListarEventosDoTenantPaginadoResult> {
  const pageSize = clampPageSize(options.pageSize);
  const constraints: QueryConstraint[] = [
    where('tenantId', '==', tenantId),
    firestoreLimit(pageSize),
  ];
  if (options.cursor) constraints.push(startAfter(options.cursor));

  const snap = await getDocs(query(collection(db, 'eventos'), ...constraints));
  const itens = snap.docs.map((d) => parseEvento(d.id, d.data()));
  const ultimo = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
  return {
    itens,
    proxCursor: snap.docs.length === pageSize && ultimo ? ultimo : null,
  };
}

/**
 * Lista os clubs de UM tenant, paginados por cursor (aba Clubs da ficha —
 * S1612-T4). `platform_admin` cruza a Rule já hoje (`firestore.rules:2018`).
 *
 * Sem parser dedicado no core para Clube (mesmo padrão de `getClube`/
 * `listClubesByTenant` em `clubs.ts`): spread tipado do doc.
 */
export async function listarClubesDoTenantPaginado(
  db: Firestore,
  tenantId: string,
  options: TenantDrilldownOptions = {}
): Promise<ListarClubesDoTenantPaginadoResult> {
  const pageSize = clampPageSize(options.pageSize);
  const constraints: QueryConstraint[] = [
    where('tenantId', '==', tenantId),
    firestoreLimit(pageSize),
  ];
  if (options.cursor) constraints.push(startAfter(options.cursor));

  const snap = await getDocs(query(collection(db, 'clubes'), ...constraints));
  const itens = snap.docs.map(
    (d) => ({ ...(d.data() as Omit<Clube, 'id'>), id: d.id }) as Clube
  );
  const ultimo = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
  return {
    itens,
    proxCursor: snap.docs.length === pageSize && ultimo ? ultimo : null,
  };
}
