// =============================================================================
// Hooks de dados dos tenants (telas de plataforma). Consomem a camada de
// api-client (listTenants/getTenant + callables provisionTenant/transitionTenant)
// sobre o db/functions do Firebase client. Só platform_admin recebe dados
// (Rules enforçam no servidor; a UI ainda passa pelo PlatformGuard).
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  getLeelaDb,
  getLeelaFunctions,
  getTenant,
  listTenants,
  provisionTenant,
  transitionTenant,
  type ProvisionResult,
  type TransitionResult,
} from '@leela/api-client';
import type { ProvisionInput, Tenant, TenantStatus } from '@leela/core';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/** Lista todos os tenants da plataforma (filtro de status é client-side). */
export function useTenants(reloadKey = 0): AsyncState<Tenant[]> {
  const [state, setState] = useState<AsyncState<Tenant[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    listTenants(getLeelaDb())
      .then((tenants) => ativo && setState({ data: tenants, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [reloadKey]);

  return state;
}

/** Um tenant pelo id (detalhe). */
export function useTenant(tenantId: string, reloadKey = 0): AsyncState<Tenant> {
  const [state, setState] = useState<AsyncState<Tenant>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!tenantId) return;
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    getTenant(getLeelaDb(), tenantId)
      .then((tenant) => {
        if (!ativo) return;
        if (!tenant) {
          setState({ data: null, loading: false, error: new Error('Tenant não encontrado.') });
          return;
        }
        setState({ data: tenant, loading: false, error: null });
      })
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [tenantId, reloadKey]);

  return state;
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
