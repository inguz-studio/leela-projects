// =============================================================================
// packages/api-client/src/platform/tenants.ts
//
// Leitura e escrita de Tenants via Firestore client SDK.
// Escrita direta restrita a platform_admin — Rules enforçam no servidor.
// Writes de status/provisionamento passam por Cloud Function (Admin SDK).
//
// ADR-009: toda query filtra por tenantId; platform_admin vê todos via admin.
// =============================================================================

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit as firestoreLimit,
  type Firestore,
  type QueryConstraint,
} from 'firebase/firestore';
import type { Tenant, TenantStatus } from '@leela/core';

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

/**
 * Lê um tenant pelo ID.
 * Security Rule garante: membro do tenant ou platform_admin.
 */
export async function getTenant(
  db: Firestore,
  tenantId: string
): Promise<Tenant | null> {
  const snap = await getDoc(doc(db, 'tenants', tenantId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Tenant;
}

/**
 * Lista tenants (só platform_admin consegue listar todos via Rules).
 * Filtro opcional por status para a tela de lista de tenants (S1601-T3).
 */
export async function listTenants(
  db: Firestore,
  options: { status?: TenantStatus; pageLimit?: number } = {}
): Promise<Tenant[]> {
  const { status, pageLimit = 100 } = options;
  const col = collection(db, 'tenants');

  const constraints: QueryConstraint[] = [
    orderBy('criadoEm', 'desc'),
    firestoreLimit(pageLimit),
  ];

  if (status) {
    constraints.unshift(where('status', '==', status));
  }

  const snap = await getDocs(query(col, ...constraints));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Tenant);
}

/**
 * Lê o tenant ao qual o usuário autenticado pertence.
 * Usa o tenantId do custom claim — cliente passa o claim vindo de getClaims().
 */
export async function getMyTenant(
  db: Firestore,
  tenantId: string
): Promise<Tenant | null> {
  return getTenant(db, tenantId);
}
