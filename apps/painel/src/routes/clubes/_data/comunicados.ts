// =============================================================================
// Hooks de leitura de comunicados do clube (E05-L4 · S108-T2). Consomem
// listComunicados (S108-T1/L2). Filtro fino (status/canal/origem/busca) roda no
// cliente (_lib/comunicados). Carimbo de envio + alcance vêm da Function.
// =============================================================================

import { useEffect, useState } from 'react';
import { getLeelaDb, listComunicados } from '@leela/api-client';
import type { Comunicado } from '@leela/core';
import type { AsyncState } from './clubes';

/** Comunicados de um clube, mais recentes primeiro. */
export function useComunicados(clubeId: string | null): AsyncState<Comunicado[]> {
  const [state, setState] = useState<AsyncState<Comunicado[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!clubeId) return;
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    listComunicados(getLeelaDb(), clubeId)
      .then((cs) => ativo && setState({ data: cs, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [clubeId]);

  return state;
}
