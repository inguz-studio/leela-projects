// =============================================================================
// Hooks de dados da Visão Geral (E02-L2/L3) — migrados para TanStack Query
// (ADR-010 · lote UX-DADOS). O fetch-on-mount cru (useEffect + useState) saiu;
// entra `useQuery` sobre o gateway (lib/query). O contrato de RETORNO dos hooks
// é preservado byte-a-byte ({data, loading, error, refetch}) para que os
// consumidores (OverviewPage) fiquem intocados — strangler-fig (Fowler): o
// seam de dados muda por dentro, a superfície não.
//
// Ganho de cache (L-001): `useEventosProdutor` usa a MESMA chave do Hub de
// Eventos (queryKeys.eventos.doOrganizador) — navegar Visão Geral ↔ Eventos
// reidrata do cache, sem refetch cego / flash de skeleton (bounded staleness,
// Kleppmann). `loading` mapeia `isPending` (sem dado ainda), NÃO `isFetching`:
// revalidação em background não reacende o skeleton.
//
// Contrato único de KPIs+alertas: `getOverview()` (1 round-trip). Eventos
// ativos + countdown vêm da listagem do organizador; inscrições recentes são a
// fusão cross-evento das primeiras páginas de cada evento ativo.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import { type OverviewResult } from '@leela/api-client';
import type { Evento } from '@leela/core';
import {
  eventosDoOrganizadorQuery,
  overviewQuery,
} from '../../../lib/query/queries';
import type { OverviewSession } from './session';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/** Estado assíncrono + recarga manual (retry honesto sobre erro — FIX-E02 #03). */
export type Refetchable<S> = S & { refetch: () => void };

/** Tipo de erro do callable getOverview — a UI mostra a mensagem adequada. */
export type OverviewErrorKind = 'unauthenticated' | 'permission-denied' | 'unknown';

export interface OverviewState extends AsyncState<OverviewResult> {
  errorKind: OverviewErrorKind | null;
}

function classificarErro(error: unknown): OverviewErrorKind {
  const code = (error as { code?: string })?.code ?? '';
  if (code.includes('unauthenticated')) return 'unauthenticated';
  if (code.includes('permission-denied')) return 'permission-denied';
  return 'unknown';
}

/**
 * KPIs + alertas consolidados via `getOverview` (contrato único).
 * Só dispara com sessão autenticada; trata unauthenticated/permission-denied.
 */
export function useOverview(session: OverviewSession): Refetchable<OverviewState> {
  const enabled = session.status === 'authenticated';
  const query = useQuery({ ...overviewQuery(), enabled });
  const refetch = () => {
    void query.refetch();
  };

  // Sessão anônima é um estado de UI, não uma falha de rede: erro honesto sem
  // disparar a query (que continua desabilitada).
  if (session.status === 'anonymous') {
    return {
      data: null,
      loading: false,
      error: new Error('Sessão não autenticada.'),
      errorKind: 'unauthenticated',
      refetch,
    };
  }

  const error = query.error ?? null;
  return {
    // isPending cobre "sessão ainda carregando" (query desabilitada) E o
    // primeiro load autenticado — ambos sem dado, ambos loading honesto.
    data: query.data ?? null,
    loading: query.isPending,
    error,
    errorKind: error ? classificarErro(error) : null,
    refetch,
  };
}

/** Lista de eventos do produtor logado (fonte de S601-T1 e do countdown S602-T1). */
export function useEventosProdutor(session: OverviewSession): Refetchable<AsyncState<Evento[]>> {
  const enabled =
    session.status === 'authenticated' && !!session.uid && !!session.tenantId;
  const query = useQuery({
    ...eventosDoOrganizadorQuery({
      tenantId: session.tenantId ?? '',
      organizadorId: session.uid ?? '',
    }),
    enabled,
  });
  const refetch = () => {
    void query.refetch();
  };

  // Sessão resolvida mas sem produtor válido (anônima / sem claim) → erro.
  if (session.status !== 'loading' && !enabled) {
    return { data: null, loading: false, error: new Error('Sessão não autenticada.'), refetch };
  }

  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error ?? null,
    refetch,
  };
}

