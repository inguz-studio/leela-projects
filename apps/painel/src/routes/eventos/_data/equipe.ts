// =============================================================================
// Leitura da EQUIPE do evento (S304-T3 · E04-L5) — TanStack Query (ADR-010).
// Consome o gateway (`equipeDoEventoQuery`), que reusa `listarEquipe` do
// api-client (ordena por nome; `parseMembroEquipe` fail-fast por doc). As
// mutações (trocar papel / convidar / remover) vivem em `lib/query/mutations`
// e invalidam a MESMA chave → read-your-writes. Contrato {data,loading,error}
// preservado como os demais hooks de evento (strangler-fig).
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import type { MembroEquipe } from '@leela/core';
import { equipeDoEventoQuery } from '../../../lib/query/queries';
import type { AsyncState } from './eventos';

/** Membros do evento (convidados + ativos + removidos — a tela filtra). */
export function useEquipe(eventoId: string | null): AsyncState<MembroEquipe[]> {
  const query = useQuery({
    ...equipeDoEventoQuery(eventoId ?? ''),
    enabled: !!eventoId,
  });
  if (!eventoId) return { data: null, loading: true, error: null };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}
