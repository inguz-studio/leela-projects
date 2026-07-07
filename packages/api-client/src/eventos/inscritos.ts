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
  orderBy,
  query,
  startAfter,
  type Firestore,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { parseInscrito, type Inscrito } from '@leela/core';

/** Page size canônico da tabela densa de inscritos (§2.5 — ~18 linhas) */
export const INSCRITOS_PAGE_SIZE = 18;

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
