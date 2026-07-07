// =============================================================================
// functions/src/platform/rollups.ts
//
// Agregação macro cross-tenant → `platform/rollups` (LEELA-S1605-T2 · RN-409).
//
// FULL RECOMPUTE a partir da fonte: varre `tenants/*`, lê o termo vigente de
// cada tenant (TermsProvider — S1602-T3) e recalcula gmvTotal,
// receitaLeelaTotal, tenantsAtivos e a saúde por tenant. Recomputar do zero
// torna a operação naturalmente IDEMPOTENTE: rodar N vezes sobre a mesma
// fonte produz o mesmo doc (sem acumulação incremental que drifta).
//
// RN-406: a receita Leela de CADA tenant usa o platformFeePct do TERMO DO
// TENANT (computeTaxa) — dois tenants com taxas distintas contribuem cada um
// com a sua. Tenant ainda sem termos (ex.: pending não provisionado) entra
// com receitaLeela 0 e platformFeePct null — SEM fallback para default
// (mascarar ausência de termo reinstalaria a constante que RN-406 proíbe).
//
// RN-409: o doc é escrito SÓ por esta Function (Admin SDK bypassa Rules;
// a Rule de `platform/**` nega toda escrita de cliente e restringe leitura
// ao platform_admin). O callable é admin-only.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  computeTaxa,
  createTermsProvider,
  deriveTenantHealth,
  roundMoney,
  TermsNotFoundError,
} from '@leela/core';
import type {
  AuthClaims,
  CommercialTerms,
  TenantRollup,
  TenantStatus,
} from '@leela/core';

/** Resultado da recomputação (sem o Timestamp do servidor). */
export interface RecomputeResult {
  gmvTotal: number;
  receitaLeelaTotal: number;
  tenantsAtivos: number;
  /** Nº de tenants agregados (todas as linhas de saúde) */
  tenantsTotal: number;
}

/**
 * Recomputa `platform/rollups` do zero a partir de `tenants/*` + termos.
 * Exportada para testes de integração (Emulator, Admin SDK).
 */
export async function recomputePlatformRollupsCore(
  db: admin.firestore.Firestore
): Promise<RecomputeResult> {
  // Provider sem cache: recompute lê SEMPRE o termo fresco da fonte
  const terms = createTermsProvider(
    async (tenantId: string): Promise<CommercialTerms | null> => {
      const snap = await db
        .doc(`tenants/${tenantId}/commercialTerms/current`)
        .get();
      return snap.exists ? (snap.data() as CommercialTerms) : null;
    },
    { ttlMs: 0 }
  );

  const tenantsSnap = await db.collection('tenants').get();

  let gmvTotal = 0;
  let receitaLeelaTotal = 0;
  let tenantsAtivos = 0;
  const tenants: Record<string, TenantRollup> = {};

  for (const doc of tenantsSnap.docs) {
    const status = (doc.get('status') as TenantStatus) ?? 'pending';
    const gmv = (doc.get('gmvAcumulado') as number) ?? 0;
    const eventosAtivos = (doc.get('eventosAtivos') as number) ?? 0;

    // Termo do PRÓPRIO tenant (RN-406) — sem termo, sem receita imputada
    let platformFeePct: number | null = null;
    let receitaLeela = 0;
    try {
      platformFeePct = await terms.getPlatformFeePct(doc.id);
      receitaLeela = computeTaxa(gmv, platformFeePct);
    } catch (err) {
      if (!(err instanceof TermsNotFoundError)) throw err;
    }

    if (status === 'ativo') tenantsAtivos += 1;
    gmvTotal += gmv;
    receitaLeelaTotal += receitaLeela;

    tenants[doc.id] = {
      tenantId: doc.id,
      nome: (doc.get('nome') as string) ?? doc.id,
      status,
      gmv,
      receitaLeela,
      platformFeePct,
      eventosAtivos,
      health: deriveTenantHealth(status, eventosAtivos),
    };
  }

  gmvTotal = roundMoney(gmvTotal);
  receitaLeelaTotal = roundMoney(receitaLeelaTotal);

  // set() integral (não merge): o doc É a recomputação — idempotente
  await db.doc('platform/rollups').set({
    gmvTotal,
    receitaLeelaTotal,
    tenantsAtivos,
    tenants,
    atualizadoEm: FieldValue.serverTimestamp(),
  });

  return {
    gmvTotal,
    receitaLeelaTotal,
    tenantsAtivos,
    tenantsTotal: tenantsSnap.size,
  };
}

/**
 * `recomputePlatformRollups` — callable do back-office macro (S1605-T3).
 * Autorização: SÓ platform_admin (RN-409). A escrita em si é Admin SDK.
 */
export const recomputePlatformRollups = https.onCall(
  async (_data: unknown, context) => {
    if (!context.auth) {
      throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
    }

    const callerClaims = context.auth.token as unknown as AuthClaims;
    if (callerClaims.role !== 'platform_admin') {
      throw new https.HttpsError(
        'permission-denied',
        'Apenas platform_admin recomputa os rollups da plataforma.'
      );
    }

    const result = await recomputePlatformRollupsCore(admin.firestore());

    logger.info('platform_rollups_recompute', {
      callerUid: context.auth.uid,
      ...result,
    });

    return { success: true, ...result };
  }
);
