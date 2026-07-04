// =============================================================================
// packages/api-client/src/overview.ts
//
// Wrapper tipado do callable `getOverview` (LEELA-S600-T2 · E02).
//
// O cliente NUNCA soma nem infere KPI (nenhuma query de varredura sai daqui):
// todo número do painel vem do agregado `profissionais/{uid}/dashboard/current`
// mantido por Cloud Function — este módulo só transporta o retorno.
//
// Campos `null` significam "indisponível" (ex.: taxaConversaoPct até E12,
// trends sem janela anterior) — a UI renderiza "—", nunca inventa número.
// =============================================================================

import { httpsCallable } from 'firebase/functions';
import type { OverviewAlert, OverviewKPIs } from '@leela/core';
import { getLeelaFunctions } from './firebase';

/**
 * Retorno de `getOverview` — contrato único (KPIs + alertas, 1 round-trip).
 * Espelha `GetOverviewResult` de functions/src/overview/getOverview.ts.
 */
export interface OverviewResult extends OverviewKPIs {
  alerts: OverviewAlert[];
  /** Millis UTC da última computação do agregado */
  atualizadoEm: number;
}

/**
 * Busca os KPIs consolidados + alertas do profissional autenticado.
 * Escopo é SEMPRE o uid do token — não há parâmetro de profId.
 * Erros do callable: `unauthenticated` (sem sessão) e `permission-denied`
 * (papel sem dashboard) — a UI trata com estado de erro + "Tentar novamente".
 */
export async function getOverview(): Promise<OverviewResult> {
  const callable = httpsCallable<Record<string, never>, OverviewResult>(
    getLeelaFunctions(),
    'getOverview'
  );
  const { data } = await callable({});
  return data;
}
