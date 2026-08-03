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
// ESCRITA (S030-T2 · RN-411/412): a ÚNICA escrita de cliente permitida aqui é
// o auto-cadastro do organizador criando o PRÓPRIO doc, com shape fechado pela
// Rule (`hasOnly`) — sem `tenantId`, sem `papeis`, `statusOnboarding` preso em
// `aguardando_convite`. Tudo o mais em `profissionais` segue write-only de
// platform_admin/Function.
// =============================================================================

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from 'firebase/firestore';
import {
  TERMO_LGPD_FINALIDADE,
  TERMO_LGPD_VERSAO,
  normalizarTelefone,
  type Profissional,
  type Tenant,
} from '@leela/core';
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

// ---------------------------------------------------------------------------
// Escrita — auto-cadastro do organizador (S030-T2 · RN-411/412)
// ---------------------------------------------------------------------------

/** Dados que o `/cadastrar` grava no doc do próprio profissional. */
export interface PerfilOrganizadorInput {
  nome: string;
  email: string;
  /** Cru da tela; normalizado para só dígitos antes de gravar. */
  telefone: string;
  organizacao: string;
}

/**
 * Cria `profissionais/{uid}` logo após o cadastro (RN-411/412).
 *
 * A conta nasce SEM tenant e SEM claim: o doc registra `statusOnboarding:
 * 'aguardando_convite'` e carimba o consentimento LGPD com VERSÃO, FINALIDADE
 * e INSTANTE DO SERVIDOR — data de cliente é relógio do usuário, e um aceite
 * datado pelo próprio titular não vale como prova.
 *
 * O `tenantId` NÃO entra aqui de propósito: o vínculo com o tenant é escrito
 * pelo resgate do convite (RN-414), server-side. A Rule recusa o campo.
 */
export async function criarPerfilOrganizador(
  db: Firestore,
  uid: string,
  input: PerfilOrganizadorInput
): Promise<void> {
  await setDoc(doc(db, 'profissionais', uid), {
    id: uid,
    nome: input.nome.trim(),
    email: input.email.trim(),
    telefone: normalizarTelefone(input.telefone),
    organizacao: input.organizacao.trim(),
    statusOnboarding: 'aguardando_convite',
    consentimentoLgpd: {
      versao: TERMO_LGPD_VERSAO,
      finalidade: TERMO_LGPD_FINALIDADE,
      aceitoEm: serverTimestamp(),
    },
    criadoEm: serverTimestamp(),
    atualizadoEm: serverTimestamp(),
  });
}
