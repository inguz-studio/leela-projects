// =============================================================================
// Hooks de leitura de desafios do clube (E05-L4). Consomem a leitura tipada do
// api-client (listDesafios — S105-T1/L2). Filtro fino (status/modelo/busca)
// roda no cliente (_lib/desafios). Agregados ∑ vêm do backend — a tela só lê.
// =============================================================================

import { useEffect, useState } from 'react';
import { getLeelaDb, listDesafios } from '@leela/api-client';
import type { Desafio } from '@leela/core';
import type { AsyncState } from './clubes';

/** Desafios de um clube, mais recentes primeiro. */
export function useDesafios(clubeId: string | null): AsyncState<Desafio[]> {
  const [state, setState] = useState<AsyncState<Desafio[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!clubeId) return;
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    listDesafios(getLeelaDb(), clubeId)
      .then((desafios) => ativo && setState({ data: desafios, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [clubeId]);

  return state;
}
