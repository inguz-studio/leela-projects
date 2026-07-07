// =============================================================================
// Hooks de dados dos tenants (telas de plataforma). Consomem a camada de
// api-client (listTenants/getTenant + callables provisionTenant/transitionTenant)
// sobre o db/functions do Firebase client. Só platform_admin recebe dados
// (Rules enforçam no servidor; a UI ainda passa pelo PlatformGuard).
// =============================================================================

import { useCallback, useState } from 'react';
import {
  getLeelaFunctions,
  provisionTenant,
  transitionTenant,
  type ProvisionResult,
  type TransitionResult,
} from '@leela/api-client';
import { useQuery } from '@tanstack/react-query';
import type { ProvisionInput, Tenant, TenantStatus } from '@leela/core';
import { tenantDetalheQuery, tenantsQuery } from '../../../lib/query/queries';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Lista todos os tenants da plataforma (filtro de status é client-side).
 * Migrado para TanStack Query (ADR-010). `reloadKey` entra na chave (ponte
 * pragmática do strangler-fig): o container o incrementa pós-mutação e a lista
 * revalida SEM tocar a tela. Contrato {data,loading,error} preservado.
 */
export function useTenants(reloadKey = 0): AsyncState<Tenant[]> {
  const query = useQuery(tenantsQuery(reloadKey));
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}

/** Um tenant pelo id (detalhe). Migrado para TanStack Query (ADR-010). */
export function useTenant(tenantId: string, reloadKey = 0): AsyncState<Tenant> {
  const query = useQuery({
    ...tenantDetalheQuery(tenantId, reloadKey),
    enabled: !!tenantId,
  });

  if (!tenantId || query.isPending) return { data: null, loading: true, error: null };
  if (query.error) return { data: null, loading: false, error: query.error };
  if (!query.data) {
    return { data: null, loading: false, error: new Error('Tenant não encontrado.') };
  }
  return { data: query.data, loading: false, error: null };
}

export interface MutationState {
  running: boolean;
  error: Error | null;
}

/**
 * Ações de escrita de tenant via Cloud Function (ADR-005): provisionar/aprovar
 * e transitar status. Nunca escreve status direto no cliente. Devolve o estado
 * da operação para a UI mostrar spinner/erro (mensagem clara em
 * failed-precondition — ex.: e-mail com papel conflitante).
 */
export function useTenantActions() {
  const [state, setState] = useState<MutationState>({ running: false, error: null });

  const provision = useCallback(async (input: ProvisionInput): Promise<ProvisionResult | null> => {
    setState({ running: true, error: null });
    try {
      const result = await provisionTenant(getLeelaFunctions(), input);
      setState({ running: false, error: null });
      return result;
    } catch (err) {
      setState({ running: false, error: err as Error });
      return null;
    }
  }, []);

  const transition = useCallback(
    async (tenantId: string, to: TenantStatus): Promise<TransitionResult | null> => {
      setState({ running: true, error: null });
      try {
        const result = await transitionTenant(getLeelaFunctions(), { tenantId, to });
        setState({ running: false, error: null });
        return result;
      } catch (err) {
        setState({ running: false, error: err as Error });
        return null;
      }
    },
    []
  );

  return { ...state, provision, transition };
}
