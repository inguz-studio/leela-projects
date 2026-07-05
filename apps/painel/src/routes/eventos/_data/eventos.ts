// =============================================================================
// Hooks de leitura das telas de evento (E03-L3). Consomem a camada de dados
// do E03-L1 (@leela/api-client) + o db do Firebase client.
//
// Detalhe por slug: a lista do hub é POR ORGANIZADOR (agregado por uid —
// decisão E02-L1-SUMMARY §5); quando o slug não está na lista, `useEvento`
// faz fallback em `getEvento` (leitura tenant-wide permitida pelas Rules)
// para DISTINGUIR "não existe" de "existe mas é de outro organizador do
// tenant" — staff não cai mais em 404 seco (fix review Onda1 #16); e um
// evento SEU além do pageLimit da lista volta a abrir (mitiga o #33).
// =============================================================================

import { useEffect, useState } from 'react';
import {
  getEvento,
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

/** Por que o detalhe do evento não pode ser exibido (review #16). */
export type MotivoEventoIndisponivel = 'nao_encontrado' | 'fora_do_escopo';

export interface EventoDetalheState extends AsyncState<Evento> {
  /**
   * Preenchido quando `data` é null sem erro de rede:
   *   - 'fora_do_escopo' — o evento EXISTE no tenant, mas pertence a outro
   *     organizador (o painel é por uid — decisão E02-L1-SUMMARY §5);
   *   - 'nao_encontrado' — o doc não existe (ou é de outro tenant; as Rules
   *     negam a leitura e o fallback trata como inexistente).
   */
  motivo: MotivoEventoIndisponivel | null;
}

interface FallbackEvento {
  slug: string;
  evento: Evento | null;
  motivo: MotivoEventoIndisponivel | null;
}

/**
 * Um evento pelo slug. Primeiro da lista do organizador (caminho quente);
 * fora dela, fallback `getEvento` para distinguir escopo de inexistência
 * (review #16) e reabrir eventos próprios além do pageLimit (mitiga #33).
 */
export function useEvento(slug: string): EventoDetalheState {
  const session = useEventosSession();
  const { data: eventos, loading, error } = useEventos();
  const [fallback, setFallback] = useState<FallbackEvento | null>(null);

  const daLista = eventos?.find((e) => e.slug === slug) ?? null;
  const precisaFallback = !loading && !error && !daLista;
  const uid = session.uid;
  const tenantId = session.tenantId;

  useEffect(() => {
    if (!precisaFallback || !uid || !tenantId) return;
    let ativo = true;
    getEvento(getLeelaDb(), slug)
      .then((evento) => {
        if (!ativo) return;
        if (evento && evento.tenantId === tenantId && evento.organizadorId === uid) {
          // Evento MEU fora da 1ª página da lista (pageLimit) — abre normal.
          setFallback({ slug, evento, motivo: null });
        } else if (evento && evento.tenantId === tenantId) {
          setFallback({ slug, evento: null, motivo: 'fora_do_escopo' });
        } else {
          setFallback({ slug, evento: null, motivo: 'nao_encontrado' });
        }
      })
      .catch(() => {
        // permission-denied (cross-tenant) e afins — não distingue: inexistente
        if (ativo) setFallback({ slug, evento: null, motivo: 'nao_encontrado' });
      });
    return () => {
      ativo = false;
    };
  }, [precisaFallback, slug, uid, tenantId]);

  if (loading) return { data: null, loading: true, error: null, motivo: null };
  if (error) return { data: null, loading: false, error, motivo: null };
  if (daLista) return { data: daLista, loading: false, error: null, motivo: null };
  if (fallback && fallback.slug === slug) {
    if (fallback.evento) {
      return { data: fallback.evento, loading: false, error: null, motivo: null };
    }
    return {
      data: null,
      loading: false,
      error: new Error(`Evento "${slug}" não encontrado.`),
      motivo: fallback.motivo,
    };
  }
  // Fallback em voo (ou aguardando sessão) — ainda resolvendo
  return { data: null, loading: true, error: null, motivo: null };
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
