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
//
// LEELA-S1601-T2 (auditoria mínima — quem/quando):
//   - o doc do tenant registra `atualizadoPor` (uid do admin) a cada transição;
//   - trilha imutável em `tenants/{id}/lifecycleAudit/{autoId}` (from → to,
//     quem, quando) gravada NA MESMA transação da mudança de status;
//   - suspensão apenas muda status — dados de domínio ficam intactos (a Rule
//     de S1600-T3 bloqueia escrita de cliente enquanto `suspenso`).
//   - Sentry: functions ainda não têm SDK de Sentry no workspace (pendência
//     registrada); erros saem por logger.error + HttpsError estruturado.
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
  const callerUid = context.auth.uid;

  const fromStatus = await db.runTransaction<TenantStatus>(async (tx) => {
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

    const now = admin.firestore.FieldValue.serverTimestamp();

    // Suspensão/reativação só muda status — nenhum doc de domínio é tocado
    // (dados preservados, RN-402). Auditoria mínima: quem/quando no doc.
    tx.update(ref, {
      status: input.to,
      atualizadoEm: now,
      atualizadoPor: callerUid,
    });

    // Trilha de auditoria imutável, na MESMA transação da mudança
    tx.set(ref.collection('lifecycleAudit').doc(), {
      from: currentStatus,
      to: input.to,
      por: callerUid,
      em: now,
    });

    return currentStatus;
  });

  logger.info('tenant_transition', {
    callerUid,
    tenantId: input.tenantId,
    from: fromStatus,
    to: input.to,
  });

  return { success: true, tenantId: input.tenantId, status: input.to };
});
