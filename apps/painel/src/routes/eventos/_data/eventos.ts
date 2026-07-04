// =============================================================================
// Hooks de leitura das telas de evento (E03-L3). Consomem a camada de dados
// do E03-L1 (@leela/api-client) + o db do Firebase client.
//
// ⚠ CONTRATO p/ L1: não existe `getEvento(db, slug)` em api-client. O layout
// do evento (S202-T1) precisa de UM evento por slug, então derivamos da lista
// do organizador (filtro por slug). Recomenda-se L1 expor `getEvento` para
// leitura direta O(1) — ver SUMMARY §Bloqueios.
// =============================================================================

import { useEffect, useState } from 'react';
import {
  getLeelaDb,
  listarEventosDoOrganizador,
  listarInscritos,
} from '@leela/api-client';
import type { Evento, Inscrito } from '@leela/core';
import { useEventosSession } from './session';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/** Lista de eventos do organizador logado (hub). */
export function useEventos(): AsyncState<Evento[]> {
  const session = useEventosSession();
  const [state, setState] = useState<AsyncState<Evento[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (session.status === 'loading') return;
    if (session.status === 'anonymous' || !session.uid || !session.tenantId) {
      setState({ data: null, loading: false, error: new Error('Sessão não autenticada.') });
      return;
    }
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    listarEventosDoOrganizador(getLeelaDb(), {
      tenantId: session.tenantId,
      organizadorId: session.uid,
    })
      .then((eventos) => ativo && setState({ data: eventos, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [session.status, session.uid, session.tenantId]);

  return state;
}

/** Um evento pelo slug (derivado da lista do organizador — ver contrato L1). */
export function useEvento(slug: string): AsyncState<Evento> {
  const { data: eventos, loading, error } = useEventos();
  if (loading) return { data: null, loading: true, error: null };
  if (error) return { data: null, loading: false, error };
  const evento = eventos?.find((e) => e.slug === slug) ?? null;
  if (!evento) {
    return { data: null, loading: false, error: new Error(`Evento "${slug}" não encontrado.`) };
  }
  return { data: evento, loading: false, error: null };
}

/** Últimos inscritos (atividade recente do Overview). */
export function useInscritosRecentes(
  eventoId: string | null,
  limite = 5,
): AsyncState<Inscrito[]> {
  const [state, setState] = useState<AsyncState<Inscrito[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!eventoId) return;
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    listarInscritos(getLeelaDb(), eventoId, { pageSize: limite })
      .then((res) => ativo && setState({ data: res.itens, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [eventoId, limite]);

  return state;
}
