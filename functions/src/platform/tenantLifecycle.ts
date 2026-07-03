// =============================================================================
// functions/src/platform/tenantLifecycle.ts
//
// Cloud Function callable: transição de status do tenant (RN-402).
//
// Wire do `canTransition` (F7 — review S1600): a matriz de transições
// pending → ativo → suspenso → ativo vive em @leela/core e é validada AQUI,
// no write path do servidor — o cliente nunca escreve status diretamente
// (a rule de `tenants` só permite escrita ao platform_admin e trava o enum).
//
// Autorização: só platform_admin transita (RN-402/RN-401).
// Escopo mínimo do F7; a story completa de lifecycle é LEELA-S1601-T2
// (auditoria rica, Sentry, efeitos colaterais).
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import { canTransition } from '@leela/core';
import type { AuthClaims, TenantStatus } from '@leela/core';

const VALID_STATUSES: ReadonlySet<TenantStatus> = new Set([
  'pending',
  'ativo',
  'suspenso',
]);

interface TransitionTenantInput {
  /** ID do tenant a transitar */
  tenantId: string;
  /** Status de destino (RN-402) */
  to: TenantStatus;
}

/**
 * `transitionTenant` — aplica transição de status validada por canTransition.
 *
 * Lê o status ATUAL do doc, valida a transição (RN-402) e aplica
 * `status` + `atualizadoEm` numa transação (sem lost-update entre
 * leitura e escrita concorrentes).
 */
export const transitionTenant = https.onCall(async (data: unknown, context) => {
  // ── 1. Autorização: só platform_admin ─────────────────────────────────
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }

  const callerClaims = context.auth.token as unknown as AuthClaims;
  if (callerClaims.role !== 'platform_admin') {
    throw new https.HttpsError(
      'permission-denied',
      'Apenas platform_admin transita status de tenant.'
    );
  }

  // ── 2. Validação de input ─────────────────────────────────────────────
  const input = data as TransitionTenantInput;

  if (!input || typeof input.tenantId !== 'string' || !input.tenantId.trim()) {
    throw new https.HttpsError('invalid-argument', 'tenantId é obrigatório.');
  }

  if (!input.to || !VALID_STATUSES.has(input.to)) {
    throw new https.HttpsError(
      'invalid-argument',
      `Status de destino inválido. Valores aceitos: ${[...VALID_STATUSES].join(', ')}.`
    );
  }

  // ── 3. Ler status atual + validar transição + aplicar (transação) ─────
  const db = admin.firestore();
  const ref = db.collection('tenants').doc(input.tenantId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);

    if (!snap.exists) {
      throw new https.HttpsError(
        'not-found',
        `Tenant '${input.tenantId}' não encontrado.`
      );
    }

    const currentStatus = snap.get('status') as TenantStatus;

    if (!canTransition(currentStatus, input.to)) {
      throw new https.HttpsError(
        'failed-precondition',
        `Transição inválida: '${currentStatus}' → '${input.to}' (RN-402).`
      );
    }

    tx.update(ref, {
      status: input.to,
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  logger.info('tenant_transition', {
    callerUid: context.auth.uid,
    tenantId: input.tenantId,
    to: input.to,
  });

  return { success: true, tenantId: input.tenantId, status: input.to };
});
