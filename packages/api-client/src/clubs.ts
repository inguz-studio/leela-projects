// =============================================================================
// packages/api-client/src/clubs.ts
//
// Leitura tipada de `clubes` (S101-T1) e `clubes/{id}/membros` (S103-T1)
// via Firestore client SDK — LEELA-E05.
//
// ADR-009: toda query de coleção tenant-scoped filtra por tenantId; a
// subcoleção `membros` herda o escopo do clube pai (Rules resolvem o tenant
// via get() do pai — a query não precisa repetir o filtro).
// Escrita de agregados ∑ (qtdMembrosAtivos, qtdDesafiosAtivos) e de
// `membros.status` (RN-102) é EXCLUSIVA das Cloud Functions — nenhum write
// desses campos sai deste módulo.
// =============================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as firestoreLimit,
  orderBy,
  query,
  where,
  type Firestore,
  type QueryConstraint,
} from 'firebase/firestore';
import type { Clube, Membro, PapelMembro, StatusMembro } from '@leela/core';

// ---------------------------------------------------------------------------
// Leitura — clubes
// ---------------------------------------------------------------------------

/**
 * Lê um clube pelo slug (docId = slug).
 * Security Rules: membro do tenant, platform_admin ou clube público/indexável.
 */
export async function getClube(
  db: Firestore,
  slug: string
): Promise<Clube | null> {
  const snap = await getDoc(doc(db, 'clubes', slug));
  if (!snap.exists()) return null;
  return { ...(snap.data() as Omit<Clube, 'id'>), id: snap.id };
}

/**
 * Lista os clubes do tenant (hub de clubes — zona "próprios" + "parceiros").
 * ADR-009: filtro obrigatório por tenantId.
 */
export async function listClubesByTenant(
  db: Firestore,
  tenantId: string,
  options: { pageLimit?: number } = {}
): Promise<Clube[]> {
  const { pageLimit = 50 } = options;
  const constraints: QueryConstraint[] = [
    where('tenantId', '==', tenantId),
    orderBy('criadoEm', 'desc'),
    firestoreLimit(pageLimit),
  ];
  const snap = await getDocs(query(collection(db, 'clubes'), ...constraints));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Clube, 'id'>), id: d.id }));
}

/**
 * Lista os clubes de um owner dentro do tenant (zona "clubes próprios", RN-100).
 */
export async function listClubesByOwner(
  db: Firestore,
  tenantId: string,
  ownerId: string,
  options: { pageLimit?: number } = {}
): Promise<Clube[]> {
  const { pageLimit = 50 } = options;
  const constraints: QueryConstraint[] = [
    where('tenantId', '==', tenantId),
    where('ownerId', '==', ownerId),
    firestoreLimit(pageLimit),
  ];
  const snap = await getDocs(query(collection(db, 'clubes'), ...constraints));
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Clube, 'id'>), id: d.id }));
}

// ---------------------------------------------------------------------------
// Leitura — membros (subcoleção `clubes/{clubeId}/membros` · S103-T1)
// ---------------------------------------------------------------------------

export interface ListMembrosOptions {
  /** Filtro por status derivado (RN-102). Combinável com `papel` (interseção). */
  status?: StatusMembro;
  /** Filtro por papel no clube (RN-103). Combinável com `status` (interseção). */
  papel?: PapelMembro;
  pageLimit?: number;
}

/**
 * Lista membros do clube, ordenados por nome (lista densa do painel, S103-T2).
 * Filtros status × papel são EQUALITY combináveis — interseção, nunca união.
 * Índices compostos declarados em firestore.indexes.json.
 * Security Rules: leitura só para membros do tenant dono do clube pai.
 */
export async function listMembros(
  db: Firestore,
  clubeId: string,
  options: ListMembrosOptions = {}
): Promise<Membro[]> {
  const { status, papel, pageLimit = 50 } = options;
  const constraints: QueryConstraint[] = [];
  if (status) constraints.push(where('status', '==', status));
  if (papel) constraints.push(where('papel', '==', papel));
  constraints.push(orderBy('atletaNome', 'asc'), firestoreLimit(pageLimit));

  const snap = await getDocs(
    query(collection(db, 'clubes', clubeId, 'membros'), ...constraints)
  );
  return snap.docs.map((d) => ({ ...(d.data() as Omit<Membro, 'id'>), id: d.id }));
}
