// =============================================================================
// Hooks de dados dos termos comerciais do tenant (editor S1602-T2).
// Leitura via getCommercialTerms; escrita via saveCommercialTerms (batch
// atômico current + snapshot v{n}). Só platform_admin escreve (RN-404 — as
// Rules enforçam no servidor; a UI ainda respeita o papel via readOnly).
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  getLeelaDb,
  getCommercialTerms,
  saveCommercialTerms,
} from '@leela/api-client';
import type { CommercialTerms, CommercialTermsInput } from '@leela/core';
import type { AsyncState } from './tenants';

/** Termos vigentes do tenant (`commercialTerms/current`); null se ainda não há. */
export function useCommercialTerms(tenantId: string, reloadKey = 0): AsyncState<CommercialTerms> {
  const [state, setState] = useState<AsyncState<CommercialTerms>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!tenantId) return;
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    getCommercialTerms(getLeelaDb(), tenantId)
      .then((terms) => ativo && setState({ data: terms, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [tenantId, reloadKey]);

  return state;
}

export interface SaveTermsState {
  saving: boolean;
  error: Error | null;
}

/**
 * Ação de salvar termos comerciais (SÓ platform_admin — RN-404). Devolve a
 * versão gravada (bump anterior + 1) ou null em falha; erro fica no estado.
 */
export function useSaveCommercialTerms(tenantId: string, adminUid: string) {
  const [state, setState] = useState<SaveTermsState>({ saving: false, error: null });

  const save = useCallback(
    async (input: CommercialTermsInput): Promise<number | null> => {
      setState({ saving: true, error: null });
      try {
        const versao = await saveCommercialTerms(getLeelaDb(), tenantId, input, adminUid);
        setState({ saving: false, error: null });
        return versao;
      } catch (err) {
        setState({ saving: false, error: err as Error });
        return null;
      }
    },
    [tenantId, adminUid],
  );

  return { ...state, save };
}
