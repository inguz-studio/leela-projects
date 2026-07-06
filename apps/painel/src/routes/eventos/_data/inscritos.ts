// =============================================================================
// Hook de carga dos inscritos de um evento para a tabela densa (S203-T2) —
// migrado para TanStack Query (ADR-010 · lote UX-DADOS).
//
// O acúmulo por CURSOR (18/página, §2.5, mock 453) agora vive UMA vez no
// gateway (lib/query · todosInscritosQuery) — reuso-first, sem reimplementar a
// paginação provada aqui. A tela filtra/busca/pagina client-side sobre o
// conjunto acumulado, como antes.
//
// Ganho de cache: os 4 consumidores do mesmo evento (tabela de inscritos,
// balcão, estoque e distribuição de kits) partilham a MESMA entrada de cache
// (queryKeys.inscritos.todos(eventoId)) — alternar entre essas telas do evento
// não recarrega os 453 docs do zero (objetivo do lote; bounded staleness).
// Contrato de retorno preservado ({data, loading, error}) — consumidores
// intocados (strangler-fig, Fowler).
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import type { Inscrito } from '@leela/core';
import { todosInscritosQuery } from '../../../lib/query/queries';
import type { AsyncState } from './eventos';

/** Carrega TODOS os inscritos do evento (acúmulo por cursor no gateway, §2.5). */
export function useTodosInscritos(eventoId: string | null): AsyncState<Inscrito[]> {
  const query = useQuery({
    ...todosInscritosQuery(eventoId ?? ''),
    enabled: !!eventoId,
  });

  // Sem evento ainda → segue em loading (não finge vazio), como o hook antigo.
  if (!eventoId) return { data: null, loading: true, error: null };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}
