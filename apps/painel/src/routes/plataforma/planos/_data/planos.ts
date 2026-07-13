// =============================================================================
// Hooks de dados da gestão de planos de cobrança (CB-T3). Leitura do catálogo
// via gateway (planosCobrancaQuery → listPlanosCobranca; SÓ platform_admin, as
// Rules enforçam no servidor). Escrita do plano é DIRETA do client SDK
// (savePlanoCobranca — Rules exigem platform_admin em write); APLICAR é SEMPRE
// via Cloud Function `aplicarPlano` (estampa versionada nos commercialTerms,
// mecanismo S1602-T1; SEM vínculo vivo). Nenhuma regra de taxa reinventada aqui:
// a validação vem do core (savePlanoCobranca revalida com validarPlanoCobranca).
// =============================================================================

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  aplicarPlano,
  getLeelaDb,
  getLeelaFunctions,
  savePlanoCobranca,
  type AplicarPlanoResult,
} from '@leela/api-client';
import type { PlanoCobranca, PlanoCobrancaInput } from '@leela/core';
import { planosCobrancaQuery } from '../../../../lib/query/queries';
import type { AsyncState } from '../../_data/tenants';

/**
 * Catálogo de planos nomeados (`planosCobranca`). `null` no load; lista vazia =
 * catálogo ainda sem plano (EmptyState honesto na tela). `reloadKey` revalida
 * pós-save (o container incrementa um contador).
 */
export function usePlanosCobranca(reloadKey = 0): AsyncState<PlanoCobranca[]> {
  const query = useQuery(planosCobrancaQuery(reloadKey));
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}

export interface PlanoActionsState {
  running: boolean;
  error: Error | null;
}

/**
 * Ações de escrita dos planos (SÓ platform_admin — o servidor nega o resto).
 * `salvar` grava/edita o plano (client SDK, revalidado pelo core); `aplicar`
 * chama a Function `aplicarPlano` (estampa versionada). Cada uma devolve o
 * resultado (ou null/false em falha); o erro fica no estado para a UI mostrar
 * Toast/mensagem clara. As duas telas (form × aplicar) são mutuamente
 * exclusivas, então compartilham um único estado de operação.
 */
export function usePlanoActions() {
  const [state, setState] = useState<PlanoActionsState>({ running: false, error: null });

  const salvar = useCallback(
    async (planoId: string, input: PlanoCobrancaInput): Promise<boolean> => {
      setState({ running: true, error: null });
      try {
        await savePlanoCobranca(getLeelaDb(), planoId, input);
        setState({ running: false, error: null });
        return true;
      } catch (err) {
        setState({ running: false, error: err as Error });
        return false;
      }
    },
    [],
  );

  const aplicar = useCallback(
    async (tenantId: string, planoId: string): Promise<AplicarPlanoResult | null> => {
      setState({ running: true, error: null });
      try {
        const result = await aplicarPlano(getLeelaFunctions(), { tenantId, planoId });
        setState({ running: false, error: null });
        return result;
      } catch (err) {
        setState({ running: false, error: err as Error });
        return null;
      }
    },
    [],
  );

  return { ...state, salvar, aplicar };
}
