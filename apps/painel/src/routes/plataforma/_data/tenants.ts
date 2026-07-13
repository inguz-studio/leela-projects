// =============================================================================
// Hooks de LEITURA dos tenants (telas de plataforma). Consomem o gateway
// (lib/query) sobre @leela/api-client (listTenants/getTenant). Só platform_admin
// recebe dados (Rules enforçam no servidor; a UI ainda passa pelo PlatformGuard).
// A ESCRITA (provisionar/transitar) migrou para o gateway de mutations
// (useProvisionTenant/useTransitionTenant): read-your-writes por invalidação de
// chave, sem `reloadKey` (ADR-010 · CONS-3-T1).
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import type { Tenant } from '@leela/core';
import { tenantDetalheQuery, tenantsQuery } from '../../../lib/query/queries';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Lista todos os tenants da plataforma (filtro de status é client-side).
 * TanStack Query (ADR-010). A revalidação pós-mutação vem da invalidação da
 * família `['plataforma','tenants']` no gateway — sem contador de reload.
 * Contrato {data,loading,error} preservado.
 */
export function useTenants(): AsyncState<Tenant[]> {
  const query = useQuery(tenantsQuery());
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}

/** Um tenant pelo id (detalhe). TanStack Query (ADR-010). */
export function useTenant(tenantId: string): AsyncState<Tenant> {
  const query = useQuery({
    ...tenantDetalheQuery(tenantId),
    enabled: !!tenantId,
  });

  if (!tenantId || query.isPending) return { data: null, loading: true, error: null };
  if (query.error) return { data: null, loading: false, error: query.error };
  if (!query.data) {
    return { data: null, loading: false, error: new Error('Tenant não encontrado.') };
  }
  return { data: query.data, loading: false, error: null };
}
