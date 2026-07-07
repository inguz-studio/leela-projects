// =============================================================================
// Hook de leitura do agregado financeiro do evento (S207-T1 · lê S207-T2),
// migrado para TanStack Query (ADR-010 · lote UX-DADOS) — o último straggler de
// fetch cru vira useQuery, consistente com useEventos/useInscritos. Consome o
// gateway (lib/query), que reusa `getFinanceiroEvento` do @leela/api-client.
// NUNCA recalcula receita — só LÊ `financeiro/current` (null quando o gatilho
// ainda não computou). Contrato de retorno preservado ({data, loading, error}):
// consumidores (Overview S202, Financeiro S207) ficam intocados (strangler-fig).
// A chave é partilhada Overview ↔ Financeiro → reidrata do cache sem refetch.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import type { FinanceiroEvento } from '@leela/api-client';
import { financeiroCurrentQuery } from '../../../lib/query/queries';
import type { AsyncState } from './eventos';

export function useFinanceiro(eventoId: string | null): AsyncState<FinanceiroEvento | null> {
  const query = useQuery({
    ...financeiroCurrentQuery(eventoId ?? ''),
    enabled: !!eventoId,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error ?? null,
  };
}
