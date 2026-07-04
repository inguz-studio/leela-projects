// =============================================================================
// packages/api-client/src/clubs.ts
//
// Leitura tipada de `clubes` via Firestore client SDK (LEELA-E05 · S101-T1).
//
// ADR-009: toda query de coleção tenant-scoped filtra por tenantId.
// Escrita de agregados ∑ (qtdMembrosAtivos, qtdDesafiosAtivos) é EXCLUSIVA
// das Cloud Functions — nenhum write de agregado sai deste módulo.
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
import type { Clube } from '@leela/core';

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
