// =============================================================================
// packages/api-client/src/eventos/queries.ts
//
// Queries de leitura da coleção `eventos` (LEELA-S200-T1 · E03).
//
// ADR-009: toda query de coleção tenant-scoped FILTRA por tenantId — além de
// obrigatório para isolamento, é o que torna a query provável pelas Security
// Rules (read exige claim.tenantId == resource.data.tenantId).
// Escrita de evento passa por Cloud Function (`criarEvento` — S201-T2);
// agregados ∑ nunca são escritos pelo cliente.
// =============================================================================

import {
  collection,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  where,
  type Firestore,
} from 'firebase/firestore';
import { parseEvento, type Evento } from '@leela/core';

/** Parâmetros de listagem de eventos do organizador */
export interface ListarEventosDoOrganizadorParams {
  /** Tenant do claim do usuário (ADR-009 — obrigatório) */
  tenantId: string;
  /** UID do profissional organizador */
  organizadorId: string;
  /** Máximo de eventos retornados (default 50) */
  pageLimit?: number;
}

/**
 * Lista os eventos de um organizador, ordenados por data da prova (asc).
 *
 * Query: `eventos where tenantId == claim && organizadorId == uid orderBy data`.
 * Índice composto correspondente em `firestore.indexes.json`
 * (tenantId ASC, organizadorId ASC, data ASC).
 *
 * Security Rule garante: só docs do tenant do caller (ou platform_admin).
 */
export async function listarEventosDoOrganizador(
  db: Firestore,
  params: ListarEventosDoOrganizadorParams
): Promise<Evento[]> {
  const { tenantId, organizadorId, pageLimit = 50 } = params;

  const q = query(
    collection(db, 'eventos'),
    where('tenantId', '==', tenantId),
    where('organizadorId', '==', organizadorId),
    orderBy('data', 'asc'),
    firestoreLimit(pageLimit)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => parseEvento(d.id, d.data()));
}
