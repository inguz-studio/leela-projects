// =============================================================================
// QueryClient do painel — camada de estado de servidor (ADR-010: TanStack Query
// sobre o Firebase SDK). Fundação da migração UX-DADOS (strangler-fig, Fowler):
// o seam de cache/revalidação nasce aqui, ANTES de tocar os consumidores.
//
// Defaults calibrados para a consistência que o painel precisa (Kleppmann,
// Consistency Ladder cap. 9 — o degrau mais baixo que o invariante permite):
//   · staleTime 30s  — BOUNDED STALENESS: revisitar uma tela dentro de 30s
//                       serve do cache SEM refetch (elimina o "carregar do
//                       zero" a cada navegação — objetivo do lote; L-001).
//   · gcTime 5min    — o cache sobrevive à navegação entre telas; voltar à
//                       Visão Geral reidrata na hora (read-your-writes local).
//   · refetchOnWindowFocus false — nada de refetch cego ao focar a janela;
//                       revalidação é intencional (bounded staleness, não
//                       linearizability — o painel não exige tempo-real aqui;
//                       realtime via onSnapshot fica p/ superfícies vivas).
//   · retry 1        — a rede Firestore falha; um retry cobre o transitório
//                       sem mascarar erro real (permission-denied não insiste).
// =============================================================================

import { QueryClient } from '@tanstack/react-query';

/** Janela de frescor: dentro dela, revisitar a tela NÃO refetcha (L-001). */
export const DEFAULT_STALE_TIME_MS = 30_000;
/** Retenção do cache após a última tela desmontar (sobrevive à navegação). */
export const DEFAULT_GC_TIME_MS = 5 * 60_000;

/** Fábrica do QueryClient — 1 instância viva por app (criada na raiz). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        gcTime: DEFAULT_GC_TIME_MS,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}
