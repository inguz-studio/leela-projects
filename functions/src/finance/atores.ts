// =============================================================================
// functions/src/finance/atores.ts
//
// Autorização das Functions do REPASSE (LEELA-E09s-L2 · RN-353/354/357).
//
// A máquina do repasse tem DOIS atores (core `AtorRepasse`):
//   tenant_owner   — cadastra dados bancários, solicita e CANCELA repasse
//                    (decisão #11; tenant_staff NÃO — minimização LGPD do
//                    L1: staff não vê nem opera dado bancário/saque);
//   platform_admin — aprova/recusa/paga, edita retenção, lê dado completo
//                    (auditado — L2-T5).
//
// `assertTenantWriter` (criarEvento) NÃO serve aqui: ele aceita staff.
// Admin SDK bypassa Rules — cada Function reverifica papel AQUI.
// =============================================================================

import { https } from 'firebase-functions/v1';
import type { AuthClaims } from '@leela/core';

/** Caller de callable (mesmo shape do EventoCaller — uid + claims). */
export interface FinanceCaller {
  uid: string;
  claims: AuthClaims;
}

/**
 * Exige `tenant_owner` COM tenantId no claim — retorna o tenantId.
 * tenant_staff é NEGADO (dado bancário/saque é do dono — RN-354).
 */
export function assertTenantOwner(claims: AuthClaims): string {
  if (
    claims.role !== 'tenant_owner' ||
    typeof claims.tenantId !== 'string' ||
    claims.tenantId.length === 0
  ) {
    throw new https.HttpsError(
      'permission-denied',
      'Apenas o tenant_owner opera dados bancários e repasses (RN-354/357).'
    );
  }
  return claims.tenantId;
}

/** Exige `platform_admin` (transições, retenção, leitura auditada). */
export function assertPlatformAdmin(claims: AuthClaims): void {
  if (claims.role !== 'platform_admin') {
    throw new https.HttpsError(
      'permission-denied',
      'Apenas platform_admin executa esta operação (RN-353).'
    );
  }
}
