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
import type { PedidoEPagamentoDoInscrito } from '@leela/api-client';
import {
  pedidoEPagamentoDoInscritoQuery,
  todosInscritosQuery,
} from '../../../lib/query/queries';
import type { AsyncState, AsyncStateRecarregavel } from './eventos';

/**
 * Carrega TODOS os inscritos do evento (acúmulo por cursor no gateway, §2.5).
 *
 * Devolve `refetch` porque o bloco de erro da tela passou a oferecer "Tentar
 * novamente" (INSCRITOS-READ-FIX): a falha de leitura mais provável aqui é
 * transitória (rede/permissão em renovação), e mandar o organizador recarregar
 * a página inteira para 336 linhas é a saída que a tela devia dar sozinha.
 */
export function useTodosInscritos(
  eventoId: string | null
): AsyncStateRecarregavel<Inscrito[]> {
  const query = useQuery({
    ...todosInscritosQuery(eventoId ?? ''),
    enabled: !!eventoId,
  });
  const refetch = (): void => {
    void query.refetch();
  };

  // Sem evento ainda → segue em loading (não finge vazio), como o hook antigo.
  if (!eventoId) return { data: null, loading: true, error: null, refetch };
  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error ?? null,
    refetch,
  };
}

/**
 * Bloco `[pag]` do slide-in (S203-T3): pedido + pagamento do inscrito em foco.
 * Só dispara quando há inscrito selecionado (`enabled`) — o join custa 2 point
 * reads por abertura, então não pré-carregamos as 453 linhas. tenantId sai do
 * próprio inscrito (projeção tenant-scoped, ADR-009). Enquanto fechado
 * (inscrito null) devolve idle: sem data, sem loading (o painel nem monta).
 */
export function usePedidoEPagamentoDoInscrito(
  eventoId: string | null,
  inscrito: Inscrito | null,
): AsyncState<PedidoEPagamentoDoInscrito> {
  const habilitado = !!eventoId && !!inscrito;
  const query = useQuery({
    ...pedidoEPagamentoDoInscritoQuery({
      tenantId: inscrito?.tenantId ?? '',
      eventoId: eventoId ?? '',
      inscrito: inscrito ?? {
        id: '',
        atletaId: '',
        pedidoRef: null,
        ehResponsavel: false,
      },
    }),
    enabled: habilitado,
  });

  if (!habilitado) return { data: null, loading: false, error: null };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}
