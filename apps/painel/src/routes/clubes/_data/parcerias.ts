// =============================================================================
// Hooks/portas de parcerias do clube (E05-L4 · S107). Leitura via listParcerias
// (S107-T1/L2); transição de status (aceitar/recusar/pausar) por write direto
// guardado pelas Rules. Agregados ∑ e campos espelhados vêm da Function.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import {
  criarPatrocinador,
  getLeelaDb,
  transicionarParceria,
  type CriarPatrocinadorInput,
} from '@leela/api-client';
import type { Parceria, StatusParceria } from '@leela/core';
import { parceriasDoClubeQuery } from '../../../lib/query/queries';
import type { AsyncState } from './clubes';

/**
 * Parcerias de um clube (union evento_afiliado | patrocinador) — TanStack Query
 * (ADR-010). `reload()` revalida a chave `parcerias.doClube`; preservado no
 * contrato para o caller atual (ParceriasPage). As mutações de parceria
 * invalidam essa MESMA chave (read-your-writes declarativo).
 */
export function useParcerias(
  clubeId: string | null,
): AsyncState<Parceria[]> & { reload: () => void } {
  const query = useQuery({
    ...parceriasDoClubeQuery(clubeId ?? ''),
    enabled: !!clubeId,
  });

  if (!clubeId) {
    return { data: null, loading: true, error: null, reload: () => {} };
  }
  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error ?? null,
    reload: () => void query.refetch(),
  };
}

/** Porta real de transição de status da parceria. */
export const transicionarParceriaPadrao = (
  clubeId: string,
  parceriaId: string,
  status: StatusParceria,
): Promise<void> => transicionarParceria(getLeelaDb(), clubeId, parceriaId, status);

/** Porta real de cadastro de patrocinador (write direto — Rules-guarded). */
export const criarPatrocinadorPadrao = (
  clubeId: string,
  input: CriarPatrocinadorInput,
): Promise<{ parceriaId: string }> => criarPatrocinador(getLeelaDb(), clubeId, input);
