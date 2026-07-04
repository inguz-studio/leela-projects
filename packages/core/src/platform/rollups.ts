// =============================================================================
// packages/core/src/platform/rollups.ts
//
// Rollups macro da plataforma (LEELA-S1605-T1 · RN-409).
//
// Doc canônico: `platform/rollups` — agregação cross-tenant computada por
// Cloud Function (Admin SDK). O dashboard macro (S1605-T3) LÊ este doc;
// nunca varre coleções no cliente.
//
// RN-409: só platform_admin lê; só Function escreve (a Rule de `platform/**`
// nega toda escrita de cliente). A recomputação (S1605-T2) é FULL RECOMPUTE
// a partir da fonte (`tenants/*` + termos) — naturalmente idempotente:
// rodar duas vezes produz o mesmo doc.
//
// RN-406: `receitaLeela` de cada tenant usa o platformFeePct DO TERMO DO
// TENANT (via TermsProvider — S1602-T3), nunca constante global.
// =============================================================================

import type { Timestamp } from '../index';
import type { TenantStatus } from './tenant';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Saúde operacional do tenant no painel macro (§2.5 — card por tenant). */
export type TenantHealth = 'saudavel' | 'atencao' | 'critico';

/** Linha do rollup por tenant — insumo do dashboard macro (S1605-T3). */
export interface TenantRollup {
  tenantId: string;
  nome: string;
  status: TenantStatus;
  /** GMV acumulado do tenant (R$) — espelho de `tenants/{id}.gmvAcumulado` */
  gmv: number;
  /**
   * Receita Leela do tenant (R$): taxa do TERMO do tenant sobre o GMV
   * (RN-406 — cada tenant com a SUA taxa; nunca constante).
   * 0 quando o tenant ainda não tem termos (ex.: pending não provisionado).
   */
  receitaLeela: number;
  /** Taxa vigente do termo (%) — null se o tenant ainda não tem termos. */
  platformFeePct: number | null;
  eventosAtivos: number;
  health: TenantHealth;
}

/** Doc `platform/rollups` — KPIs macro + saúde por tenant (RN-409). */
export interface PlatformRollups {
  /** GMV total da plataforma (Σ gmv dos tenants) */
  gmvTotal: number;
  /** Receita Leela total (Σ receitaLeela por tenant — cada um com sua taxa) */
  receitaLeelaTotal: number;
  /** Nº de tenants com status 'ativo' */
  tenantsAtivos: number;
  /** Saúde por tenant, indexada por tenantId */
  tenants: Record<string, TenantRollup>;
  atualizadoEm: Timestamp;
}

/** Caminho canônico do doc de rollups. */
export const PLATFORM_ROLLUPS_DOC_PATH = 'platform/rollups';

// ---------------------------------------------------------------------------
// Derivação pura de saúde (V1 — heurística documentada)
// ---------------------------------------------------------------------------

/**
 * Saúde do tenant (heurística V1 — refinável quando E12 trouxer visitas):
 *   - suspenso            → 'critico'  (bloqueado para vendas/publicações)
 *   - pending             → 'atencao'  (aguardando aprovação)
 *   - ativo sem eventos   → 'atencao'  (conta operável mas parada)
 *   - ativo com eventos   → 'saudavel'
 */
export function deriveTenantHealth(
  status: TenantStatus,
  eventosAtivos: number
): TenantHealth {
  if (status === 'suspenso') return 'critico';
  if (status === 'pending') return 'atencao';
  return eventosAtivos > 0 ? 'saudavel' : 'atencao';
}
