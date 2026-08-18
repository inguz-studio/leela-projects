// =============================================================================
// Gateway de REALTIME (onSnapshot) — o lado das SUPERFÍCIES VIVAS. Par do
// `queries.ts` (bounded staleness) para as telas que o brief UX-DADOS marcou
// como AO VIVO: o painel financeiro (S207) e o balcão de entrega (S204).
//
// Consistência (Kleppmann, cap. 9): a maioria das telas vive bem com
// cache-then-revalidate (queries.ts); estas DUAS não — o financeiro deve
// refletir cada recomputo do gatilho na hora, e o balcão deve mostrar o
// check-in/vínculo de chip de OUTRO operador sem recarregar. Aqui o listener é
// a fonte de frescor: cada snapshot faz `setQueryData` na MESMA chave que a
// versão bounded usa (Overview↔Financeiro; tabela densa↔balcão partilham cache)
// — então navegar de volta reidrata já fresco, sem refetch cego.
//
// Reuso-first: NÃO reabre o Firestore aqui. Consome os observadores provados do
// @leela/api-client (observarFinanceiroEvento / observarInscritos), que reusam
// o MESMO parsing do get one-shot. O listener vive só enquanto a tela está
// montada (cleanup no unmount) — o custo de listener é pago onde ele importa.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getLeelaDb,
  observarFinanceiroEvento,
  observarInscritos,
  type FinanceiroEvento,
} from '@leela/api-client';
import type { Inscrito } from '@leela/core';
import { queryKeys } from './keys';

/** Contrato de retorno partilhado com os hooks bounded ({data, loading, error}). */
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Estado vivo que a tela pode pedir para RELIGAR. Em superfície realtime
 * "recarregar" não é refetch — é derrubar o listener e assinar de novo, que é
 * o que o `refetch` faz aqui (INSCRITOS-READ-FIX).
 */
export interface AsyncStateRecarregavel<T> extends AsyncState<T> {
  refetch: () => void;
}

/**
 * OBSERVA o agregado financeiro do evento AO VIVO (S207). Cada snapshot escreve
 * na chave `financeiro.current(eventoId)` — a MESMA que o Overview lê (bounded),
 * então voltar ao Overview reidrata já fresco. `null` = agregado ainda não
 * computado (ausência honesta, §2.12). Contrato {data,loading,error} idêntico ao
 * `useFinanceiro` bounded — troca in-place na FinanceiroPage (strangler-fig).
 */
export function useFinanceiroRealtime(
  eventoId: string | null,
): AsyncState<FinanceiroEvento | null> {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AsyncState<FinanceiroEvento | null>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!eventoId) return;
    setState({ data: null, loading: true, error: null });
    const unsubscribe = observarFinanceiroEvento(getLeelaDb(), eventoId, {
      next: (financeiro) => {
        // Escreve na chave partilhada → Overview reidrata fresco na navegação.
        queryClient.setQueryData(queryKeys.financeiro.current(eventoId), financeiro);
        setState({ data: financeiro, loading: false, error: null });
      },
      error: (error) => setState({ data: null, loading: false, error }),
    });
    return unsubscribe;
  }, [eventoId, queryClient]);

  if (!eventoId) return { data: null, loading: true, error: null };
  return state;
}

/**
 * OBSERVA o POOL de inscritos do evento AO VIVO (S204 — balcão). Cada snapshot
 * escreve na chave `inscritos.todos(eventoId)` — a MESMA da tabela densa
 * (bounded), então sair do balcão para a tabela reidrata já fresco. O balcão
 * busca por nome/dorsal client-side sobre o pool. Um vínculo de chip / check-in
 * (Function) chega pelo listener sem invalidação manual — read-your-writes AO
 * VIVO. Contrato {data,loading,error} idêntico ao `useTodosInscritos` bounded,
 * mais o `refetch` que RELIGA o listener para o "Tentar novamente" do balcão.
 */
export function useInscritosRealtime(
  eventoId: string | null
): AsyncStateRecarregavel<Inscrito[]> {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AsyncState<Inscrito[]>>({
    data: null,
    loading: true,
    error: null,
  });
  // Contador de assinatura: mudar o valor derruba o listener no cleanup do
  // efeito e assina de novo. É o único jeito honesto de "tentar de novo" numa
  // superfície viva — não existe refetch de onSnapshot.
  const [assinatura, setAssinatura] = useState(0);
  const refetch = useCallback(() => setAssinatura((n) => n + 1), []);

  useEffect(() => {
    if (!eventoId) return;
    setState({ data: null, loading: true, error: null });
    const unsubscribe = observarInscritos(getLeelaDb(), eventoId, {
      next: (itens) => {
        queryClient.setQueryData(queryKeys.inscritos.todos(eventoId), itens);
        setState({ data: itens, loading: false, error: null });
      },
      error: (error) => setState({ data: null, loading: false, error }),
    });
    return unsubscribe;
  }, [eventoId, queryClient, assinatura]);

  if (!eventoId) return { data: null, loading: true, error: null, refetch };
  return { ...state, refetch };
}
