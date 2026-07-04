// =============================================================================
// packages/api-client/src/platform/mutations.ts
//
// Wrappers tipados das Cloud Functions de plataforma (LEELA-E16 · L2).
//
// ADR-005: escrita sensível de tenant NUNCA é gravada direto pelo cliente —
// a UI do super-admin invoca estas callables; validação e autorização REAIS
// (só platform_admin) acontecem no servidor. Estes wrappers só tipam o
// contrato (espelham functions/src/platform/*).
//
// Erros propagados como FirebaseError (`error.code` = 'functions/…'):
//   - 'functions/permission-denied'  → caller não é platform_admin
//   - 'functions/failed-precondition' → conflito de papel/estado (a UI mostra
//      mensagem clara; ex.: e-mail com papel conflitante, transição inválida)
//   - 'functions/already-exists'      → slug já ativo com outro owner
//   - 'functions/invalid-argument'    → input inválido
// =============================================================================

import { httpsCallable, type Functions } from 'firebase/functions';
import type { ProvisionInput, TenantStatus } from '@leela/core';

// ---------------------------------------------------------------------------
// provisionTenant (S1601-T1 no servidor · consumido por S1601-T4)
// ---------------------------------------------------------------------------

/** Resultado de `provisionTenant` (espelha functions/src/platform/provisionTenant.ts). */
export interface ProvisionResult {
  tenantId: string;
  ownerUid: string;
  /** true quando o pedido já estava integralmente provisionado (retry). */
  replay: boolean;
}

/**
 * Provisiona/aprova um tenant de ponta a ponta via Cloud Function
 * `provisionTenant` (atômico — RN-403). Só platform_admin (enforçado no
 * servidor). Idempotente por slug: reenviar o mesmo pedido devolve replay=true.
 */
export async function provisionTenant(
  functions: Functions,
  input: ProvisionInput
): Promise<ProvisionResult> {
  const call = httpsCallable<ProvisionInput, ProvisionResult>(
    functions,
    'provisionTenant'
  );
  return (await call(input)).data;
}

// ---------------------------------------------------------------------------
// transitionTenant (S1601-T2 no servidor · consumido por S1601-T4)
// ---------------------------------------------------------------------------

export interface TransitionTenantInput {
  tenantId: string;
  /** Status de destino (RN-402: pending→ativo, ativo→suspenso, suspenso→ativo). */
  to: TenantStatus;
}

export interface TransitionResult {
  success: boolean;
  tenantId: string;
  status: TenantStatus;
}

/**
 * Transita o status do tenant via Cloud Function `transitionTenant`.
 * O servidor valida a transição (canTransition — RN-402) e registra a trilha
 * de auditoria na mesma transação. O cliente NUNCA grava status diretamente.
 */
export async function transitionTenant(
  functions: Functions,
  input: TransitionTenantInput
): Promise<TransitionResult> {
  const call = httpsCallable<TransitionTenantInput, TransitionResult>(
    functions,
    'transitionTenant'
  );
  return (await call(input)).data;
}
