// =============================================================================
// Dados da tela de Engajamento — leitura, com recorte por club.
//
// UMA QUERY POR CLUB, NÃO UM FAN-OUT NUMA QUERY SÓ. `useQueries` dispara a
// MESMA chave que a página de Membros e a de Desafios daquele club já usam
// (`queryKeys.membros.doClube` / `queryKeys.desafios.doClube`). O ganho não é
// estético: abrir Engajamento depois de visitar um club reidrata do cache, e
// visitar o club depois de Engajamento também — sem refetch cego e sem flash de
// skeleton (o mesmo argumento que fez a Visão Geral compartilhar a chave do hub
// de eventos). Um fan-out dentro de uma queryFn única teria chave própria e
// duplicaria leituras que o painel já pagou.
//
// CUSTO, DECLARADO: com "Todos os clubs" a tela lê membros e desafios de cada
// club do tenant. É a mesma ordem de grandeza do fan-out que a Análise de
// vendas já faz sobre eventos (`demografiaDoOrganizadorQuery`), e o tenant real
// tem clubes na casa das unidades. Se isso mudar, o caminho certo é um agregado
// de comunidade por Function — que é justamente uma das lacunas registradas no
// handoff, não um conserto de tela.
// =============================================================================

import { useQueries, useQuery } from '@tanstack/react-query';
import type { Clube, Desafio, Evento, Membro } from '@leela/core';
import {
  clubesDoTenantQuery,
  desafiosDoClubeQuery,
  eventosDoOrganizadorQuery,
  membrosDoClubeQuery,
} from '../../../../lib/query/queries';
import { useTenantSession } from '../../../../lib/session/tenantSession';
import type { DesafioComClube } from '../_lib/engajamento';

/** Valor do filtro que significa "sem recorte". */
export const TODOS_OS_CLUBS = '__todos__';

export interface EstadoAsync<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/** Clubes do tenant — a mesma chave do hub de clubs. */
export function useClubesDoTenant(): EstadoAsync<Clube[]> {
  const session = useTenantSession();
  const enabled = session.status === 'authenticated' && !!session.tenantId;
  const query = useQuery({ ...clubesDoTenantQuery(session.tenantId ?? ''), enabled });

  if (session.status !== 'loading' && !enabled) {
    return { data: null, loading: false, error: new Error('Sessão não autenticada.') };
  }
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}

/** Os clubes dentro do recorte atual do filtro. @pure */
export function clubesNoRecorte(
  clubes: readonly Clube[] | null,
  selecionado: string
): Clube[] {
  if (!clubes) return [];
  if (selecionado === TODOS_OS_CLUBS) return [...clubes];
  return clubes.filter((c) => c.id === selecionado);
}

export interface DadosDoEngajamento {
  membros: Membro[];
  desafios: DesafioComClube[];
}

/**
 * Membros + desafios dos clubes no recorte. `loading` só é verdadeiro enquanto
 * ALGUMA leitura ainda não tem dado (`isPending`), nunca em revalidação de
 * fundo — skeleton que reacende a cada foco é ruído, não informação.
 *
 * O erro é o PRIMEIRO que aparecer: uma falha parcial (um club de dez) ainda
 * produziria números que parecem completos e não são, e um número silenciosamente
 * incompleto é pior que uma tela que diz que falhou.
 */
export function useDadosDoEngajamento(
  clubes: readonly Clube[]
): EstadoAsync<DadosDoEngajamento> {
  const membrosQueries = useQueries({
    queries: clubes.map((c) => ({ ...membrosDoClubeQuery(c.id) })),
  });
  const desafiosQueries = useQueries({
    queries: clubes.map((c) => ({ ...desafiosDoClubeQuery(c.id) })),
  });

  const todas = [...membrosQueries, ...desafiosQueries];
  const erro = todas.find((q) => q.error)?.error ?? null;
  if (erro) return { data: null, loading: false, error: erro as Error };

  if (todas.some((q) => q.isPending)) return { data: null, loading: true, error: null };

  const membros = membrosQueries.flatMap((q) => (q.data as Membro[] | undefined) ?? []);
  const desafios = desafiosQueries.flatMap((q, i) =>
    ((q.data as Desafio[] | undefined) ?? []).map((desafio) => ({
      clubeId: clubes[i]?.id ?? '',
      desafio,
    }))
  );

  return { data: { membros, desafios }, loading: false, error: null };
}

/** Estado assíncrono que a tela pode pedir para recarregar (banda Eventos). */
export interface EstadoAsyncRecarregavel<T> extends EstadoAsync<T> {
  refetch: () => void;
}

/**
 * Eventos do organizador — a fonte do bloco "Ocupação dos últimos 5 eventos"
 * (banda Eventos do estudo · D-1008-R15). A chave é a MESMA da Visão Geral e
 * do hub de eventos (`queryKeys.eventos.doOrganizador`): quem passou por
 * qualquer uma das três telas reidrata do cache — nenhuma leitura nova entra
 * por causa desta banda, o mesmo argumento das queries por club acima.
 *
 * O erro fica CONTIDO no bloco (o card de ocupação tem estado de erro e
 * retry próprios): eventos que falham não podem derrubar a análise da
 * comunidade, que vem de outra fonte.
 */
export function useEventosDoOrganizador(): EstadoAsyncRecarregavel<Evento[]> {
  const session = useTenantSession();
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

  if (session.status !== 'loading' && !enabled) {
    return { data: null, loading: false, error: new Error('Sessão não autenticada.'), refetch };
  }
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null, refetch };
}
