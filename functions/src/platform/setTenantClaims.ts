// =============================================================================
// functions/src/platform/setTenantClaims.ts
//
// Cloud Function callable: seta custom claims (role + tenantId) via Admin SDK.
//
// Autorização: só platform_admin pode invocar (ou o próprio fluxo de
// provisionamento S1601-T1 via Admin SDK — que bypassa Rules).
//
// Propagação de token (RN-401):
//   Após setCustomUserClaims, o token ID existente do usuário NÃO é invalidado
//   imediatamente — Firebase não tem revogação instantânea de tokens ID.
//   A estratégia padrão é revogar todos os refresh tokens do usuário
//   (revokeRefreshTokens) e orientar o cliente a chamar
//   user.getIdTokenResult(forceRefresh: true) no próximo request.
//
// ADR-009: claims são a fonte única de papel; cliente nunca eleva o próprio papel.
//
// Fix re-review R3: role/tenantId são gravados por MERGE sobre as claims
// atuais do usuário — replace do objeto inteiro destruía claims não
// relacionadas no caminho feliz. `role` e `tenantId` seguem autoritativos:
// tenantId é REMOVIDO quando o papel não o carrega (athlete/platform_admin).
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import type { Role, AuthClaims } from '@leela/core';

// Conjunto de papéis válidos (espelha o tipo Role de @leela/core)
const VALID_ROLES = new Set<Role>([
  'platform_admin',
  'tenant_owner',
  'tenant_staff',
  'promoter',
  'athlete',
]);

// Papéis que exigem tenantId obrigatório
const ROLES_REQUIRING_TENANT: Set<Role> = new Set([
  'tenant_owner',
  'tenant_staff',
  'promoter',
]);

// Papéis que não carregam tenantId (cross-tenant ou global)
const ROLES_WITHOUT_TENANT: Set<Role> = new Set(['platform_admin', 'athlete']);

// ---------------------------------------------------------------------------
// Tipos de input/output
// ---------------------------------------------------------------------------

interface SetTenantClaimsInput {
  /** UID do usuário Firebase Auth a receber os claims */
  uid: string;
  /** Papel a ser atribuído (RN-401) */
  role: Role;
  /**
   * ID do tenant (obrigatório para tenant_owner, tenant_staff, promoter).
   * Deve ser omitido para platform_admin e athlete (cross-tenant/global).
   */
  tenantId?: string;
}

interface SetTenantClaimsOutput {
  success: true;
  uid: string;
  role: Role;
  tenantId?: string;
}

// ---------------------------------------------------------------------------
// Callable Function
// ---------------------------------------------------------------------------

/**
 * `setTenantClaims` — atribui role + tenantId ao usuário.
 *
 * Só invocável por `platform_admin` (verificado via custom claim do caller).
 * Força revogação dos refresh tokens para propagação imediata (best-effort).
 *
 * O cliente do usuário afetado deve chamar:
 *   await user.getIdTokenResult(true)   // forceRefresh
 * para receber o token com os novos claims antes do próximo request seguro.
 */
export const setTenantClaims = https.onCall(
  async (data: unknown, context) => {
    // ── 1. Autenticação do caller ─────────────────────────────────────────
    if (!context.auth) {
      throw new https.HttpsError(
        'unauthenticated',
        'Requer autenticação.'
      );
    }

    const callerClaims = context.auth.token as unknown as AuthClaims;

    // Só platform_admin pode setar claims (RN-401)
    if (callerClaims.role !== 'platform_admin') {
      throw new https.HttpsError(
        'permission-denied',
        'Apenas platform_admin pode atribuir papéis.'
      );
    }

    // ── 2. Validação de input ─────────────────────────────────────────────
    const input = data as SetTenantClaimsInput;

    if (!input || typeof input.uid !== 'string' || !input.uid.trim()) {
      throw new https.HttpsError('invalid-argument', 'uid é obrigatório.');
    }

    if (!input.role || !VALID_ROLES.has(input.role)) {
      throw new https.HttpsError(
        'invalid-argument',
        `role inválido. Valores aceitos: ${[...VALID_ROLES].join(', ')}.`
      );
    }

    if (ROLES_REQUIRING_TENANT.has(input.role)) {
      if (!input.tenantId || typeof input.tenantId !== 'string' || !input.tenantId.trim()) {
        throw new https.HttpsError(
          'invalid-argument',
          `tenantId é obrigatório para o papel '${input.role}'.`
        );
      }
    }

    if (ROLES_WITHOUT_TENANT.has(input.role) && input.tenantId) {
      throw new https.HttpsError(
        'invalid-argument',
        `tenantId não deve ser fornecido para o papel '${input.role}'.`
      );
    }

    // ── 3. Verificar que o usuário-alvo existe ────────────────────────────
    let targetUser: admin.auth.UserRecord;
    try {
      targetUser = await admin.auth().getUser(input.uid);
    } catch {
      throw new https.HttpsError(
        'not-found',
        `Usuário '${input.uid}' não encontrado no Firebase Auth.`
      );
    }

    // ── 4. Construir e gravar claims (MERGE — fix re-review R3) ──────────
    const newClaims = mergeTenantClaims(
      targetUser.customClaims,
      input.role,
      input.tenantId
    );

    await admin.auth().setCustomUserClaims(input.uid, newClaims);

    // ── 5. Revogar refresh tokens (propagação forçada) ───────────────────
    // Após a revogação, o cliente é forçado a obter novo token no próximo
    // refresh. O token ID existente dura até expirar (~1 hora), mas novos
    // tokens carregarão os claims atualizados.
    await admin.auth().revokeRefreshTokens(input.uid);

    logger.info('set_tenant_claims', {
      callerUid: context.auth.uid,
      targetUid: input.uid,
      role: input.role,
      tenantId: input.tenantId,
    });

    const result: SetTenantClaimsOutput = {
      success: true,
      uid: input.uid,
      role: input.role,
      ...(input.tenantId ? { tenantId: input.tenantId } : {}),
    };

    return result;
  }
);

// ---------------------------------------------------------------------------
// Helper de Admin SDK (uso interno pelas Functions — ex.: provisionTenant S1601)
// Não exposto como callable; chamado diretamente de outros módulos server-side.
// ---------------------------------------------------------------------------

/**
 * Merge das claims (fix re-review R3): `role` e `tenantId` são autoritativos,
 * claims NÃO relacionadas são preservadas — o replace do objeto inteiro
 * destruía qualquer claim extra no caminho feliz (assimetria com o rollback
 * do provisionTenant, que preserva). tenantId é REMOVIDO quando o papel não
 * o carrega — o merge nunca deixa tenantId stale de um papel anterior.
 *
 * Puro e exportado para teste unitário direto.
 */
export function mergeTenantClaims(
  current: object | null | undefined,
  role: Role,
  tenantId?: string
): AuthClaims {
  const merged: Record<string, unknown> = { ...(current ?? {}), role };
  if (tenantId) {
    merged['tenantId'] = tenantId;
  } else {
    delete merged['tenantId'];
  }
  return merged as unknown as AuthClaims;
}

/**
 * Seta claims diretamente via Admin SDK sem verificação de caller.
 * USE APENAS dentro de Cloud Functions privilegiadas (Admin SDK context).
 * NÃO exponha ao cliente.
 */
export async function setTenantClaimsAdmin(
  uid: string,
  role: Role,
  tenantId?: string
): Promise<void> {
  const user = await admin.auth().getUser(uid);
  const claims = mergeTenantClaims(user.customClaims, role, tenantId);

  await admin.auth().setCustomUserClaims(uid, claims);
  await admin.auth().revokeRefreshTokens(uid);

  logger.info('set_tenant_claims_admin', { uid, role, tenantId });
}
