// =============================================================================
// functions/src/overview/getOverview.ts
//
// Callable de leitura do dashboard do profissional (LEELA-S600-T2 · E02).
//
// Contrato (decisão pendente nº 3 do brief — contrato único, 1 round-trip):
//   getOverview() -> { ...OverviewKPIs, alerts: OverviewAlert[], atualizadoEm }
//
// Escopo: SEMPRE o uid autenticado — o caller não escolhe profId (nenhum
// parâmetro de input é aceito para escopo). Papéis: tenant_owner/tenant_staff
// (profissionais do painel); athlete/promoter/anonimo → permission-denied.
//
// Fallback: se `dashboard/current` estiver ausente ou stale
// (> DASHBOARD_STALE_MS), recomputa on-demand a partir dos ∑ de origem —
// isso também mantém alertas sensíveis a tempo (pendências > 24h) frescos
// mesmo sem novos writes de eventos/clubes.
//
// O cliente NUNCA soma nem infere KPI — só consome este retorno.
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import type { AuthClaims, OverviewAlert, OverviewKPIs } from '@leela/core';
import {
  DASHBOARD_STALE_MS,
  recomputeProfessionalDashboard,
  type DashboardCurrent,
} from './aggregateProfessionalDashboard';

// ---------------------------------------------------------------------------
// Contrato de saída
// ---------------------------------------------------------------------------

/** Retorno do callable — KPIs + alertas + carimbo (millis UTC). */
export interface GetOverviewResult extends OverviewKPIs {
  alerts: OverviewAlert[];
  /** Millis UTC da última computação (serializável pelo callable) */
  atualizadoEm: number;
}

// Papéis de profissional do painel (claims — ADR-009/RN-401)
const ROLES_PROFISSIONAL = new Set(['tenant_owner', 'tenant_staff']);

// ---------------------------------------------------------------------------
// Núcleo testável (Emulator via Admin SDK — padrão triggers/callables v1)
// ---------------------------------------------------------------------------

function toResult(current: DashboardCurrent): GetOverviewResult {
  const { computadoEm, ...resto } = current;
  return { ...resto, atualizadoEm: computadoEm };
}

/**
 * Lê `dashboard/current`; recomputa quando ausente ou stale.
 * Sempre escopado ao `profId` recebido (o callable passa o uid do token).
 */
export async function getOverviewCore(
  db: admin.firestore.Firestore,
  profId: string,
  agora: Date = new Date()
): Promise<GetOverviewResult> {
  const snap = await db
    .collection('profissionais')
    .doc(profId)
    .collection('dashboard')
    .doc('current')
    .get();

  if (snap.exists) {
    const computadoEm = snap.get('computadoEm') as unknown;
    if (
      typeof computadoEm === 'number' &&
      agora.getTime() - computadoEm < DASHBOARD_STALE_MS
    ) {
      const { atualizadoEm: _serverTs, ...data } = snap.data() as DashboardCurrent & {
        atualizadoEm?: unknown;
      };
      return toResult(data as DashboardCurrent);
    }
  }

  return toResult(await recomputeProfessionalDashboard(db, profId, agora));
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

export const getOverview = https.onCall(async (_data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }

  const claims = context.auth.token as unknown as AuthClaims;
  if (!ROLES_PROFISSIONAL.has(claims.role)) {
    throw new https.HttpsError(
      'permission-denied',
      'Apenas profissionais do tenant (owner/staff) têm dashboard.'
    );
  }

  const profId = context.auth.uid;
  const result = await getOverviewCore(admin.firestore(), profId);

  // Observabilidade sem dado sensível (nenhum nome/valor de inscrito)
  logger.info('get_overview', {
    profId,
    eventosEmRisco: result.eventoEmRisco ? 1 : 0,
    alerts: result.alerts.length,
  });

  return result;
});
