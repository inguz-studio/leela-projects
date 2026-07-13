// =============================================================================
// Hooks de LEITURA dos tenants (telas de plataforma). Consomem o gateway
// (lib/query) sobre @leela/api-client (listTenants/getTenant). Só platform_admin
// recebe dados (Rules enforçam no servidor; a UI ainda passa pelo PlatformGuard).
// A ESCRITA (provisionar/transitar) migrou para o gateway de mutations
// (useProvisionTenant/useTransitionTenant): read-your-writes por invalidação de
// chave, sem `reloadKey` (ADR-010 · CONS-3-T1).
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import type { Profissional, Tenant } from '@leela/core';
import { tenantComOwnerQuery, tenantsQuery } from '../../../lib/query/queries';

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

/** Estado do detalhe do tenant com o perfil do owner (CONS-4-T1). */
export interface TenantComOwnerState {
  tenant: Tenant | null;
  /** Perfil do dono — null quando o doc não existe (a UI cai no uid). */
  owner: Profissional | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Tenant pelo id + perfil do OWNER (join `profissionais/{ownerUid}` — CONS-4-T1).
 * TanStack Query (ADR-010): a transição invalida o prefixo `['plataforma',
 * 'tenant',id]`, que casa este join → status e nome do owner ficam consistentes.
 * `owner: null` é fallback honesto (a tela mostra o uid), não erro.
 */
export function useTenantComOwner(tenantId: string): TenantComOwnerState {
  const query = useQuery({
    ...tenantComOwnerQuery(tenantId),
    enabled: !!tenantId,
  });

  if (!tenantId || query.isPending) return { tenant: null, owner: null, loading: true, error: null };
  if (query.error) return { tenant: null, owner: null, loading: false, error: query.error };
  if (!query.data) {
    return { tenant: null, owner: null, loading: false, error: new Error('Tenant não encontrado.') };
  }
  return { tenant: query.data.tenant, owner: query.data.owner, loading: false, error: null };
}
