// =============================================================================
// Hooks de dados dos termos comerciais do tenant (editor S1602-T2).
// Leitura via getCommercialTerms; escrita via saveCommercialTerms (batch
// atômico current + snapshot v{n}). Só platform_admin escreve (RN-404 — as
// Rules enforçam no servidor; a UI ainda respeita o papel via readOnly).
// =============================================================================

import { useCallback, useState } from 'react';
import {
  getLeelaDb,
  saveCommercialTerms,
} from '@leela/api-client';
import { useQuery } from '@tanstack/react-query';
import type { CommercialTerms, CommercialTermsInput } from '@leela/core';
import { commercialTermsQuery } from '../../../lib/query/queries';
import type { AsyncState } from './tenants';

/**
 * Termos vigentes do tenant (`commercialTerms/current`); null se ainda não há
 * (não é erro — o editor abre com defaults). Migrado para TanStack Query
 * (ADR-010): reusa getCommercialTerms via gateway; `reloadKey` na chave preserva
 * o refetch pós-save do container. Contrato {data,loading,error} preservado.
 */
export function useCommercialTerms(tenantId: string, reloadKey = 0): AsyncState<CommercialTerms> {
  const query = useQuery({
    ...commercialTermsQuery(tenantId, reloadKey),
    enabled: !!tenantId,
  });

  if (!tenantId) return { data: null, loading: true, error: null };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
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
