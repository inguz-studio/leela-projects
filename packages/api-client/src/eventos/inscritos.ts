// =============================================================================
// packages/api-client/src/eventos/inscritos.ts
//
// Query paginada da subcoleção `eventos/{eventoId}/inscritos`
// (LEELA-S203-T1 · E03). Paginação OBRIGATÓRIA por cursor — o mock canônico
// tem 453 inscritos (HANDOFF-05) e a tela lista ~18 linhas por página (§2.5).
//
// Leitura protegida pelas Rules via tenant do EVENTO PAI (get no doc pai),
// por isso a query não precisa (nem pode, em subcoleção) filtrar tenantId.
// Escrita de carimbos (kitEntregueEm/checkinEm/qrToken) só por Function.
// =============================================================================

import {
  collection,
  getDocs,
  limit as firestoreLimit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  type Firestore,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { parseInscrito, type Inscrito } from '@leela/core';

/** Page size canônico da tabela densa de inscritos (§2.5 — ~18 linhas) */
export const INSCRITOS_PAGE_SIZE = 18;

/**
 * Teto do listener realtime do balcão (S204). O mock canônico tem 453 inscritos
 * (HANDOFF-05); 1000 dá folga sem virar listener ilimitado. O balcão precisa do
 * POOL inteiro em memória para buscar por nome/dorsal (não pagina).
 */
export const INSCRITOS_BALCAO_CAP = 1000;

/**
 * Cursor opaco de paginação — snapshot do último doc da página anterior.
 * O chamador NÃO inspeciona; só repassa em `listarInscritos`.
 */
export type InscritosCursor = QueryDocumentSnapshot;

/** Resultado de uma página de inscritos */
export interface ListarInscritosResult {
  itens: Inscrito[];
  /** null quando não há próxima página */
  proxCursor: InscritosCursor | null;
}

/** Opções da listagem paginada */
export interface ListarInscritosOptions {
  cursor?: InscritosCursor;
  /** Default 18 (INSCRITOS_PAGE_SIZE) */
  pageSize?: number;
}

/**
 * Lista inscritos de um evento em páginas de cursor estável.
 *
 * Ordena por `atletaNome` (o Firestore desempata internamente por docId,
 * o que mantém o cursor estável mesmo com nomes repetidos).
 *
 * `proxCursor` volta `null` quando a página vem menor que `pageSize`
 * (fim da lista). 453 inscritos → 26 páginas (25×18 + 3).
 */
export async function listarInscritos(
  db: Firestore,
  eventoId: string,
  options: ListarInscritosOptions = {}
): Promise<ListarInscritosResult> {
  const { cursor, pageSize = INSCRITOS_PAGE_SIZE } = options;

  const constraints: QueryConstraint[] = [
    orderBy('atletaNome', 'asc'),
    firestoreLimit(pageSize),
  ];
  if (cursor) {
    constraints.splice(1, 0, startAfter(cursor));
  }

  const snap = await getDocs(
    query(collection(db, 'eventos', eventoId, 'inscritos'), ...constraints)
  );

  const itens = snap.docs.map((d) => parseInscrito(d.id, d.data()));
  const ultimo = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined;
  const proxCursor = snap.docs.length === pageSize && ultimo ? ultimo : null;

  return { itens, proxCursor };
}

/**
 * Lista os `limite` inscritos MAIS RECENTES do evento (por `criadoEm` DESC).
 *
 * Contrato SEPARADO de `listarInscritos` de propósito: aquela ordena por
 * `atletaNome` (cursor estável da tela de Inscritos), então um `limit` traz os
 * primeiros do ALFABETO — errado para "atividade recente". Aqui o `limit` cai
 * sobre os inscritos mais novos, que é o que o feed do Overview precisa.
 * Sem cursor: o teto é pequeno (~6 itens do card), não há paginação.
 *
 * `criadoEm` é o ÚNICO campo do `orderBy` → índice single-field automático do
 * Firestore cobre a query; nenhum índice composto é necessário. Reusa
 * `parseInscrito` (fonte única de parsing defensivo).
 */
export async function listarInscritosRecentes(
  db: Firestore,
  eventoId: string,
  limite = INSCRITOS_PAGE_SIZE
): Promise<Inscrito[]> {
  const snap = await getDocs(
    query(
      collection(db, 'eventos', eventoId, 'inscritos'),
      orderBy('criadoEm', 'desc'),
      firestoreLimit(limite)
    )
  );

  return snap.docs.map((d) => parseInscrito(d.id, d.data()));
}

/** Handlers do observador realtime (onSnapshot) — next a cada mudança, error 1x. */
export interface ObservarInscritosHandlers {
  next: (itens: Inscrito[]) => void;
  error?: (err: Error) => void;
}

/**
 * OBSERVA o POOL de inscritos do evento em TEMPO REAL (`inscritos`, ordenado por
 * `atletaNome`, teto `INSCRITOS_BALCAO_CAP`). Superfície VIVA do balcão (S204,
 * UX-DADOS): dois operadores no balcão veem o check-in/vínculo de chip um do
 * outro sem recarregar. Reusa `parseInscrito` (fonte única de parsing). Um
 * ÚNICO listener sobre a coleção ordenada — vivo só enquanto o balcão está
 * montado (o custo de listener é pago onde ele importa). Devolve o
 * `Unsubscribe` para o cleanup do caller.
 */
export function observarInscritos(
  db: Firestore,
  eventoId: string,
  handlers: ObservarInscritosHandlers
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, 'eventos', eventoId, 'inscritos'),
      orderBy('atletaNome', 'asc'),
      firestoreLimit(INSCRITOS_BALCAO_CAP)
    ),
    (snap) => handlers.next(snap.docs.map((d) => parseInscrito(d.id, d.data()))),
    (err) => handlers.error?.(err)
  );
}
