// =============================================================================
// Hook de LEITURA dos termos comerciais do tenant (editor S1602-T2). Leitura via
// getCommercialTerms pelo gateway. A ESCRITA migrou para o gateway de mutations
// (useSaveCommercialTerms): read-your-writes por invalidação da família
// `['plataforma','termos',id]`, sem `reloadKey` (ADR-010 · CONS-3-T1). Só
// platform_admin escreve (RN-404 — Rules no servidor; a UI respeita via readOnly).
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import type { CommercialTerms } from '@leela/core';
import { commercialTermsQuery } from '../../../lib/query/queries';
import type { AsyncState } from './tenants';

/**
 * Termos vigentes do tenant (`commercialTerms/current`); null se ainda não há
 * (não é erro — o editor abre com defaults). TanStack Query (ADR-010): reusa
 * getCommercialTerms via gateway. A revalidação pós-save vem da invalidação de
 * chave no gateway de mutations. Contrato {data,loading,error} preservado.
 */
export function useCommercialTerms(tenantId: string): AsyncState<CommercialTerms> {
  const query = useQuery({
    ...commercialTermsQuery(tenantId),
    enabled: !!tenantId,
  });

  if (!tenantId) return { data: null, loading: true, error: null };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}
