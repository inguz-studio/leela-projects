// =============================================================================
// Hooks de leitura da aba Comunicação do evento (E06-L3) — TanStack Query
// (ADR-010). Consomem o gateway (lib/query), que reusa os readers provados do
// @leela/api-client (FABLE-G-T1): o agregado ∑ (`getResumoComunicacoes`) para
// os CONTADORES e a timeline (`listarComunicacoesDoEvento`) para a lista.
//
// Doutrina FABLE-G: a aba NUNCA conta logs no cliente — os números vêm do ∑
// mantido pela Function; a timeline é uma leitura BOUNDED (recentes, com teto).
// Contrato de retorno preservado ({data, loading, error}) como os demais hooks
// de evento (strangler-fig). `enabled` só dispara com eventoId real.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { COMUNICACOES_TIMELINE_LIMITE } from '@leela/api-client';
import type { LogComunicacao, ResumoComunicacoes } from '@leela/core';
import {
  comunicacoesDoEventoQuery,
  resumoComunicacoesQuery,
} from '../../../lib/query/queries';
import type { AsyncState } from './eventos';

/** Agregado ∑ de comunicações do evento — contadores da aba (point read O(1)). */
export function useResumoComunicacoes(
  eventoId: string | null,
): AsyncState<ResumoComunicacoes | null> {
  const query = useQuery({
    ...resumoComunicacoesQuery(eventoId ?? ''),
    enabled: !!eventoId,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error ?? null,
  };
}

/** Timeline do log de comunicação do evento — recentes primeiro (teto FABLE-G). */
export function useComunicacoesDoEvento(
  eventoId: string | null,
  limite: number = COMUNICACOES_TIMELINE_LIMITE,
): AsyncState<LogComunicacao[]> {
  const query = useQuery({
    ...comunicacoesDoEventoQuery(eventoId ?? '', limite),
    enabled: !!eventoId,
  });

  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error ?? null,
  };
}
