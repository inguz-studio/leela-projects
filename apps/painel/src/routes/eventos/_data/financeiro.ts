// =============================================================================
// Hook de leitura do agregado financeiro do evento (S207-T1 · lê S207-T2).
// Nunca recalcula receita — só lê `financeiro/current` (null quando o gatilho
// ainda não computou).
// =============================================================================

import { useEffect, useState } from 'react';
import { getFinanceiroEvento, getLeelaDb, type FinanceiroEvento } from '@leela/api-client';
import type { AsyncState } from './eventos';

export function useFinanceiro(eventoId: string | null): AsyncState<FinanceiroEvento | null> {
  const [state, setState] = useState<AsyncState<FinanceiroEvento | null>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!eventoId) return;
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    getFinanceiroEvento(getLeelaDb(), eventoId)
      .then((fin) => ativo && setState({ data: fin, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [eventoId]);

  return state;
}
