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
import { getLeelaDb, listarInscritos, type OverviewResult } from '@leela/api-client';
import type { Evento } from '@leela/core';
import {
  eventosDoOrganizadorQuery,
  overviewQuery,
} from '../../../lib/query/queries';
import { valorDaInscricao, type InscricaoRecenteInput } from '../_lib/recentRegistrations';
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

/**
 * Inscrições recentes cross-evento (S601-T2). Onda 1: funde a primeira página
 * de cada evento ativo (não encerrado) e deixa a ordenação por data desc para
 * a derivação pura. Uma query collection-group única (índice já declarado por
 * E02-L1: inscritos tenantId+criadoEm DESC) substitui isto quando existir o
 * helper de api-client + a Rule de CG — ver SUMMARY §handoff.
 *
 * Query dependente (Kleppmann, read-your-writes): só dispara quando os eventos
 * (fonte-mãe) já resolveram sem erro; a chave carrega os ids dos ativos, então
 * mudar o conjunto de eventos reidrata sem refetch cego dos inalterados.
 */
export function useInscricoesRecentes(
  eventos: Evento[] | null,
  eventosError: Error | null = null,
  porEvento = 10
): Refetchable<AsyncState<InscricaoRecenteInput[]>> {
  const ativos = (eventos ?? []).filter((e) => e.status !== 'encerrado');
  // Chave estável dos eventos ativos (evita refetch por refs novas).
  const chave = ativos.map((e) => e.id).join(',');
  // Só busca com a fonte-mãe resolvida, sem erro e com algum evento ativo.
  const enabled = !eventosError && eventos !== null && ativos.length > 0;

  const query = useQuery({
    queryKey: ['inscricoes-recentes-cross', chave, porEvento] as const,
    queryFn: async (): Promise<InscricaoRecenteInput[]> => {
      const db = getLeelaDb();
      const porEventoInscricoes = await Promise.all(
        ativos.map((evento) =>
          listarInscritos(db, evento.id, { pageSize: porEvento }).then((res) =>
            res.itens.map(
              (i): InscricaoRecenteInput => ({
                id: `${evento.id}:${i.id}`,
                atletaNome: i.atletaNome,
                modalidade: i.modalidade,
                status: i.status,
                criadoEm: i.criadoEm,
                eventoNome: evento.nome,
                // Coluna Valor (T6): preço do percurso casado com a modalidade
                // (RN-200 — o preço vive no percurso); sem match → null ("—").
                valor: valorDaInscricao(evento.percursos, i.modalidade),
              })
            )
          )
        )
      );
      return porEventoInscricoes.flat();
    },
    enabled,
  });
  const refetch = () => {
    void query.refetch();
  };

  // Erro da fonte-mãe (eventos) NÃO deixa este bloco em skeleton eterno (#39):
  // propaga como erro real em vez de travar em loading.
  if (eventosError) return { data: null, loading: false, error: eventosError, refetch };
  // eventos ainda carregando (ou recarregando via retry) → reflete loading.
  if (eventos === null) return { data: null, loading: true, error: null, refetch };
  // Sem eventos ativos → vazio honesto (lista vazia, não erro).
  if (ativos.length === 0) return { data: [], loading: false, error: null, refetch };

  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error ?? null,
    refetch,
  };
}
