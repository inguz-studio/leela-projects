// =============================================================================
// packages/api-client/src/platform/listasGlobais.ts
//
// Leitura ADMIN, cross-tenant, de TODOS os eventos e TODOS os clubs do
// sistema — as duas listas globais (ADMIN-VISAO onda 1 · S1614-T1 · história
// S1614). Coleção ROOT sem filtro de tenant: a Rule já permite `list()` do
// admin doc a doc (`eventos` — `firestore.rules:744`; `clubes` — `:2018`) —
// nenhuma Rule nova, nenhum collectionGroup (não existe Rule de CG no
// arquivo; ver a armadilha nomeada em 03-spec.md · LEELA-S1614 · "Fora de
// escopo").
//
// CONTAGEM HONESTA (o gate da onda 1 e da onda 4): esta leitura NUNCA
// devolve um "total". `proxCursor: null` é o único sinal de fim de lista;
// enquanto não for null, a UI (onda 4 · S1614-T2/T3) mostra "mostrando N"
// sem prometer um total que a query nunca computou — o mesmo padrão que
// `avisosDaFila` já assume na fila de estornos, mas aqui sem teto oculto:
// não há truncamento silencioso, só paginação que o chamador precisa pedir
// explicitamente para continuar.
//
// SEM orderBy por tenant/campo composto: implicitamente por `__name__`
// (mesma disciplina dos outros módulos desta onda) — nenhum índice novo.
// `status` é filtro OPCIONAL de igualdade sobre um único campo: continua no
// índice automático de campo único (sem `orderBy` cruzando outro campo, não
// há necessidade de composto — mesma lição que `listTenants` já documentou
// para o caso onde ISSO daria errado).
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
import { parseEvento, type Clube, type Evento, type StatusEvento } from '@leela/core';
import { eventoDegradado } from '../eventos/queries';

/** Página canônica das tabelas densas globais (§2.5). */
export const LISTA_GLOBAL_PAGE_SIZE = 20;

/** Teto do pageSize — mesma disciplina de CRM_CLIENTES_PAGE_SIZE_MAX. */
export const LISTA_GLOBAL_PAGE_SIZE_MAX = 100;

function clampPageSize(pageSize: number | undefined): number {
  return Math.min(
    Math.max(1, pageSize ?? LISTA_GLOBAL_PAGE_SIZE),
    LISTA_GLOBAL_PAGE_SIZE_MAX
  );
}

/** Cursor opaco de paginação — snapshot do último doc da página anterior. */
export type ListaGlobalCursor = QueryDocumentSnapshot;

export interface ListarEventosGlobalOptions {
  cursor?: ListaGlobalCursor;
  /** Default 20 (LISTA_GLOBAL_PAGE_SIZE); clamp em [1, 100]. */
  pageSize?: number;
  /**
   * Filtro opcional de status (S1614-T2 — "filtro por status ... com o
   * contador acompanhando"). Filtro por TENANT na lista global reusa
   * `listarEventosDoTenantPaginado` (tenantEventosClubs.ts) em vez de um
   * segundo parâmetro aqui — é a mesma leitura, não duas.
   */
  status?: StatusEvento;
}

export interface ListarClubesGlobalOptions {
  cursor?: ListaGlobalCursor;
  pageSize?: number;
}

export interface ListarEventosGlobalResult {
  itens: Evento[];
  /** null quando não há próxima página — NUNCA um total inventado. */
  proxCursor: ListaGlobalCursor | null;
}

export interface ListarClubesGlobalResult {
  itens: Clube[];
  proxCursor: ListaGlobalCursor | null;
}

/**
 * Lista TODOS os eventos do sistema, paginados por cursor, com coluna Tenant
 * incluída no próprio doc (`Evento.tenantId`) — a tela (S1614-T2) não
 * precisa de join. `platform_admin` cruza a Rule já hoje (`:744`).
 */
export async function listarEventosGlobalPaginado(
  db: Firestore,
  options: ListarEventosGlobalOptions = {}
): Promise<ListarEventosGlobalResult> {
  const pageSize = clampPageSize(options.pageSize);
  const constraints: QueryConstraint[] = [firestoreLimit(pageSize)];
  if (options.status) constraints.unshift(where('status', '==', options.status));
  if (options.cursor) constraints.push(startAfter(options.cursor));

  const snap = await getDocs(query(collection(db, 'eventos'), ...constraints));
  // ONDA1-FIX · D-2 — doutrina F1 (eventos/queries.ts:117-133): um único
  // evento com faixa/janela malformada em QUALQUER tenant não pode derrubar a
  // lista global inteira do painel master (o caso real que originou F1).
  // Diferença honesta para os readers por tenant: aqui NÃO há filtro de
  // tenant, então o `tenantId` do placeholder é best-effort do próprio doc
  // (identidade não garantida pela query) — vazio quando ilegível.
  const itens = snap.docs.map((d) => {
    try {
      return parseEvento(d.id, d.data());
    } catch (err) {
      console.error(
        `[listarEventosGlobalPaginado] evento "${d.id}" corrompido — placeholder degradado (F1)`,
        err
      );
      const raw = d.data();
      const tenantIdRaw = raw['tenantId'];
      return eventoDegradado(
        d.id,
        raw,
        typeof tenantIdRaw === 'string' ? tenantIdRaw : '',
        ''
      );
    }
  });
  const ultimo = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
  return {
    itens,
    proxCursor: snap.docs.length === pageSize && ultimo ? ultimo : null,
  };
}

/**
 * Lista TODOS os clubs do sistema, paginados por cursor. `platform_admin`
 * cruza a Rule já hoje (`:2018`).
 */
export async function listarClubesGlobalPaginado(
  db: Firestore,
  options: ListarClubesGlobalOptions = {}
): Promise<ListarClubesGlobalResult> {
  const pageSize = clampPageSize(options.pageSize);
  const constraints: QueryConstraint[] = [firestoreLimit(pageSize)];
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
