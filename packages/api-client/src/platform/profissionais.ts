// =============================================================================
// packages/api-client/src/platform/profissionais.ts
//
// Leitura de `profissionais/{profId}` + join tenant → owner (CONS-4-T1).
//
// A tela de detalhe do tenant (S1601/L2) mostrava o `ownerUid` cru porque o
// modelo do tenant só carrega o uid do dono. O nome real vive em
// `profissionais/{ownerUid}` — e as Rules JÁ permitem essa leitura para
// exatamente os mesmos leitores do tenant (platform_admin; membro do tenant
// via `resource.data.tenantId`). Por isso a forma mínima é um READER com
// join, não denormalização: o padrão 🔁 (espelho por Function + backfill)
// fica reservado para dados que cruzam fronteira de tenant (ex.: parceria);
// aqui não há fronteira nem amplificação de leitura (1 getDoc extra por
// tela de detalhe).
//
// Nenhuma escrita neste módulo — `profissionais` é write-only de
// platform_admin/Function (Rules).
// =============================================================================

import { doc, getDoc, type Firestore } from 'firebase/firestore';
import type { Profissional, Tenant } from '@leela/core';
import { getTenant } from './tenants';

// ---------------------------------------------------------------------------
// Leitura
// ---------------------------------------------------------------------------

/**
 * Lê um profissional pelo uid.
 * Security Rule garante: o próprio, membro do tenant dele ou platform_admin.
 */
export async function getProfissional(
  db: Firestore,
  profId: string
): Promise<Profissional | null> {
  const snap = await getDoc(doc(db, 'profissionais', profId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Profissional;
}

/** Resultado do join tenant → owner (owner null-safe). */
export interface TenantComOwner {
  tenant: Tenant;
  /** Perfil do dono — null quando `profissionais/{ownerUid}` não existe */
  owner: Profissional | null;
}

/**
 * Join de 1 salto: tenant + perfil do owner (`profissionais/{ownerUid}`).
 * `owner: null` quando o doc do profissional não existe (tenant legado /
 * provisionamento incompleto) — a UI cai no fallback (uid) sem quebrar.
 */
export async function getTenantComOwner(
  db: Firestore,
  tenantId: string
): Promise<TenantComOwner | null> {
  const tenant = await getTenant(db, tenantId);
  if (!tenant) return null;

  const owner = tenant.ownerUid
    ? await getProfissional(db, tenant.ownerUid)
    : null;

  return { tenant, owner };
}
