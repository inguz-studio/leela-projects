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
//
// RN-538 (ADMIN-VISAO · onda 1 · S1613-T3): até aqui o único escritor era
// `recomputePlatformRollups`, um `https.onCall` PURO — sem `pubsub.schedule`
// algum apontando para ele (achado 1 do handoff da spec,
// `.nirvana/handoffs/leela-admin-visao-20260809.md`). `/plataforma/macro`
// mostrava o retrato do último clique sem dizer que era isso. A idade já é
// parte do contrato de leitura (o doc sempre carregou `atualizadoEm` —
// `PlatformRollups.atualizadoEm`, lido por `getPlatformRollups`); o que
// faltava era a ATUALIZAÇÃO deixar de depender de lembrança. `agendarRecompute
// PlatformRollups` (ADR-015 — wrapper v1 fino + núcleo já testável) cobre
// essa metade; a invocação manual (`recomputePlatformRollups`) é PRESERVADA
// intacta — o botão de recompute manual da onda 2 (S1613-T4) continua vivo.
// Cadência de 1h: `platform/rollups` alimenta um dashboard que o dono olha
// para decidir preço, não uma superfície em tempo real, e o recompute é
// FULL (varre `tenants/*`) — hora em hora é fresco o bastante sem virar
// varredura contínua por um agregado que ninguém lê a cada minuto (Hightower
// check: menor cadência que resolve, não a mais alta que cabe no orçamento).
// Escalonamento: roda no minuto 15 para não colidir com o bloco 03:00-03:20
// dos crons noturnos (RN-102/coletaDiaria/encerramento) nem com os de 5/15min
// — nenhuma dependência de ordem com eles, cadência independente.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https, pubsub } from 'firebase-functions/v1';
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

// ---------------------------------------------------------------------------
// Agendamento (RN-538 · S1613-T3 · ADR-015: wrapper v1 fino + núcleo já
// testável direto, sem depender do scheduler — o Emulator --only
// firestore,auth não sobe pubsub).
// ---------------------------------------------------------------------------

export const agendarRecomputePlatformRollups = pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const result = await recomputePlatformRollupsCore(admin.firestore());
    logger.info('platform_rollups_recompute_agendado', { ...result });
    return null;
  });
