// =============================================================================
// Hook de dados dos rollups macro da plataforma (dashboard S1605-T3).
// Lê o doc agregado `platform/rollups` (computado por Cloud Function). NUNCA
// varre `tenants/*` no cliente (RN-409); só platform_admin lê (Rules).
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import type { PlatformRollups } from '@leela/core';
import { platformRollupsQuery } from '../../../lib/query/queries';
import type { AsyncState } from './tenants';

/**
 * Rollups macro (`platform/rollups`); null quando a Function ainda não rodou.
 * Migrado para TanStack Query (ADR-010) — reusa getPlatformRollups do
 * api-client via o gateway. Contrato {data,loading,error} preservado.
 */
export function usePlatformRollups(reloadKey = 0): AsyncState<PlatformRollups> {
  const query = useQuery(platformRollupsQuery(reloadKey));
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}
