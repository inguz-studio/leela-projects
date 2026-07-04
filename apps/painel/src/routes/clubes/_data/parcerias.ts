// =============================================================================
// Hooks/portas de parcerias do clube (E05-L4 · S107). Leitura via listParcerias
// (S107-T1/L2); transição de status (aceitar/recusar/pausar) por write direto
// guardado pelas Rules. Agregados ∑ e campos espelhados vêm da Function.
// =============================================================================

import { useEffect, useState } from 'react';
import {
  getLeelaDb,
  listParcerias,
  transicionarParceria,
} from '@leela/api-client';
import type { Parceria, StatusParceria } from '@leela/core';
import type { AsyncState } from './clubes';

/** Parcerias de um clube (union evento_afiliado | patrocinador). */
export function useParcerias(
  clubeId: string | null,
): AsyncState<Parceria[]> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<Parceria[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!clubeId) return;
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    listParcerias(getLeelaDb(), clubeId)
      .then((ps) => ativo && setState({ data: ps, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [clubeId, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}

/** Porta real de transição de status da parceria. */
export const transicionarParceriaPadrao = (
  clubeId: string,
  parceriaId: string,
  status: StatusParceria,
): Promise<void> => transicionarParceria(getLeelaDb(), clubeId, parceriaId, status);
