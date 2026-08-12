// =============================================================================
// packages/api-client/src/pedidos.ts
//
// Leitura tipada do kernel `pedidos/{pedidoId}` + `pagamentos/{pagamentoId}`
// (ADR-011 · LEELA-FABLE-A-T1). SÓ leitura: pedido/pagamento têm escrita
// EXCLUSIVA de Function (Rules: write false) — nenhuma mutation aqui.
//
// ADR-009: `pedidos` e `pagamentos` são coleções ROOT tenant-scoped por
// campo, então toda QUERY filtra por tenantId (obrigatório para isolamento
// e para a query ser provável pelas Rules — read exige claim.tenantId ==
// resource.data.tenantId). Leituras por id (getDoc) são provadas doc a doc.
//
// Índices compostos correspondentes em `firestore.indexes.json`:
//   pedidos (tenantId ASC, eventoId ASC, criadoEm DESC)  — listarPedidosDoEvento
//   pedidos (tenantId ASC, eventoId ASC, inscritoRefs CONTAINS) — getPedidoDoInscrito
// =============================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  where,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  parsePagamento,
  parsePedido,
  type Pagamento,
  type Pedido,
} from '@leela/core';

/**
 * Lê UM pedido pelo id — leitura direta O(1) (é assim que o detalhe da
 * compra chega ao slide-in via `inscrito.pedidoRef`, A-T2/S203-T3).
 *
 * Doc INEXISTENTE: com as Rules atuais o get LANÇA `permission-denied`
 * (resource == null nunca prova a guarda de tenant — e afrouxar a Rule com
 * `resource == null` viraria oráculo de existência de doc financeiro).
 * O retorno `null` só ocorre em contexto SEM Rules (Admin SDK / emulator
 * com rules desligadas). Cross-tenant também vira `permission-denied`.
 */
export async function getPedido(
  db: Firestore,
  pedidoId: string
): Promise<Pedido | null> {
  const snap = await getDoc(doc(db, 'pedidos', pedidoId));
  if (!snap.exists()) return null;
  return parsePedido(snap.id, snap.data());
}

/** Handlers do observador realtime de UM pedido — `next` a cada mudança. */
export interface ObservarPedidoHandlers {
  /**
   * O pedido a cada escrita do servidor. `null` = o doc não existe (só
   * acontece sem Rules; com Rules a inexistência chega por `error`).
   */
  next: (pedido: Pedido | null) => void;
  /**
   * A assinatura caiu (Rules, rede, ou um doc que `parsePedido` recusa).
   * Chamado no máximo uma vez por assinatura — depois dele o listener está
   * morto e o chamador precisa do próprio caminho de leitura.
   */
  error?: (err: Error) => void;
}

/**
 * OBSERVA UM pedido em TEMPO REAL (RN-560). É a resposta ao problema
 * que a RN-469 abriu e a RN-470 deixou em aberto: quem escreve o desfecho do
 * pagamento é o WEBHOOK, no servidor, num instante que ninguém na tela
 * controla — e até aqui a única forma de a tela saber era o comprador clicar
 * em "atualizar". A RN-470 foi revogada pelo dono em 11/08; esta função é o
 * canal que a revogação pede.
 *
 * POR QUE `onSnapshot` E NÃO POLLING. A leitura já é autorizada doc a doc pela
 * mesma Rule da RN-469 (`allow read` avalia igual no get e no listener), então
 * o listener não custa permissão nova. Ele custa UMA leitura por MUDANÇA real,
 * onde o polling custa uma por janela: um PIX de 30 minutos consultado a cada
 * 5 s são 360 leituras por checkout abandonado, contra 1 aqui. E a cadência do
 * polling seria um chute — o webhook não tem hora.
 *
 * FAIL-FAST DO PARSE, CONTIDO AQUI. `parsePedido` derruba a leitura de um doc
 * incoerente, e dentro de um callback de snapshot isso mataria a assinatura em
 * silêncio. O `try/catch` converte a recusa no canal de `error`, que é onde o
 * chamador já sabe olhar — o mesmo desfecho que ele teria com `getPedido`.
 *
 * Devolve o `Unsubscribe` para o cleanup do caller. O listener vive enquanto a
 * tela vive: é o comprador esperando o desfecho, e não uma superfície de
 * operação — quando a compra fecha, ele sai.
 */
export function observarPedido(
  db: Firestore,
  pedidoId: string,
  handlers: ObservarPedidoHandlers
): Unsubscribe {
  return onSnapshot(
    doc(db, 'pedidos', pedidoId),
    (snap) => {
      if (!snap.exists()) {
        handlers.next(null);
        return;
      }
      try {
        handlers.next(parsePedido(snap.id, snap.data()));
      } catch (err) {
        handlers.error?.(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (err) => handlers.error?.(err)
  );
}

/** Parâmetros de listagem de pedidos de um evento */
export interface ListarPedidosDoEventoParams {
  /** Tenant do claim do usuário (ADR-009 — obrigatório) */
  tenantId: string;
  /** Evento da venda (docId = slug) */
  eventoId: string;
  /** Máximo de pedidos retornados (default 50) */
  pageLimit?: number;
}

/**
 * Lista os pedidos de um evento, mais recentes primeiro (`criadoEm` DESC).
 * Query: `pedidos where tenantId == claim && eventoId == X orderBy criadoEm desc`.
 */
export async function listarPedidosDoEvento(
  db: Firestore,
  params: ListarPedidosDoEventoParams
): Promise<Pedido[]> {
  const { tenantId, eventoId, pageLimit = 50 } = params;

  const q = query(
    collection(db, 'pedidos'),
    where('tenantId', '==', tenantId),
    where('eventoId', '==', eventoId),
    orderBy('criadoEm', 'desc'),
    firestoreLimit(pageLimit)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => parsePedido(d.id, d.data()));
}

/** Parâmetros da busca do pedido de um inscrito */
export interface GetPedidoDoInscritoParams {
  /** Tenant do claim do usuário (ADR-009 — obrigatório) */
  tenantId: string;
  /** Evento do inscrito (docId = slug) */
  eventoId: string;
  /** Id do doc em eventos/{eventoId}/inscritos */
  inscritoId: string;
}

/**
 * Encontra O pedido a que um inscrito pertence (`inscritoRefs` array-contains).
 *
 * Invariante ADR-011: 1 inscrito pertence a EXATAMENTE 1 pedido. A query
 * pede 2 docs de propósito — se vierem 2, o dado está corrompido e a função
 * LANÇA (fail-fast: mostrar a compra errada é pior que não mostrar).
 * Retorna null quando o inscrito ainda não tem pedido (legado pré-ADR-011).
 *
 * Nota: quando `inscrito.pedidoRef` existir (A-T2), prefira `getPedido`
 * direto — esta query é o caminho SEM a projeção enriquecida.
 */
export async function getPedidoDoInscrito(
  db: Firestore,
  params: GetPedidoDoInscritoParams
): Promise<Pedido | null> {
  const { tenantId, eventoId, inscritoId } = params;

  const q = query(
    collection(db, 'pedidos'),
    where('tenantId', '==', tenantId),
    where('eventoId', '==', eventoId),
    where('inscritoRefs', 'array-contains', inscritoId),
    firestoreLimit(2)
  );

  const snap = await getDocs(q);
  if (snap.docs.length === 0) return null;
  if (snap.docs.length > 1) {
    throw new Error(
      `Inscrito ${inscritoId}: pertence a ${snap.docs.length}+ pedidos — invariante ADR-011 violada`
    );
  }
  const unico = snap.docs[0];
  if (!unico) return null;
  return parsePedido(unico.id, unico.data());
}

/**
 * Lê UM pagamento pelo id (via `pedido.pagamentoRef`) — dados `[pag]` do
 * slide-in (forma, cupom/desconto, cartão, conciliação).
 *
 * Doc INEXISTENTE: com as Rules atuais o get LANÇA `permission-denied`
 * (resource == null não prova a guarda de tenant; ver nota em `getPedido`).
 * Pedido ainda sem cobrança tem `pagamentoRef: null` — o chamador nem
 * chega a esta função; o `null` daqui só ocorre em contexto sem Rules.
 */
export async function getPagamento(
  db: Firestore,
  pagamentoId: string
): Promise<Pagamento | null> {
  const snap = await getDoc(doc(db, 'pagamentos', pagamentoId));
  if (!snap.exists()) return null;
  return parsePagamento(snap.id, snap.data());
}
