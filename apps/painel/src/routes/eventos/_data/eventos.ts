// =============================================================================
// Hooks de leitura das telas de evento (E03-L3) — migrados para TanStack Query
// (ADR-010 · lote UX-DADOS). Consomem o gateway (lib/query), que reusa a camada
// de dados do E03-L1 (@leela/api-client). Contrato de retorno preservado
// ({data, loading, error[, motivo]}) — consumidores (HubRoute, EventoLayout,
// balcão, kits) ficam intocados (strangler-fig, Fowler).
//
// `useEventos` partilha a MESMA chave da Visão Geral (queryKeys.eventos.
// doOrganizador) — navegar Visão Geral ↔ Hub reidrata do cache, sem refetch
// cego / flash de skeleton (L-001, bounded staleness — Kleppmann).
//
// Detalhe por slug: a lista do hub é POR ORGANIZADOR (agregado por uid —
// decisão E02-L1-SUMMARY §5); quando o slug não está na lista, `useEvento`
// faz fallback (query dependente) em `getEvento` para DISTINGUIR "não existe"
// de "existe mas é de outro organizador do tenant" — staff não cai em 404 seco
// (fix review Onda1 #16); e um evento SEU além do pageLimit da lista reabre.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import type { Evento, Inscrito } from '@leela/core';
import {
  eventoDetalheQuery,
  eventosDoOrganizadorQuery,
  inscritosRecentesQuery,
} from '../../../lib/query/queries';
import { useTenantSession } from '../../../lib/session/tenantSession';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/** Lista de eventos do organizador logado (hub). Chave partilhada c/ Visão Geral. */
export function useEventos(): AsyncState<Evento[]> {
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

  // Sessão resolvida sem produtor válido → erro honesto (não dispara a query).
  if (session.status !== 'loading' && !enabled) {
    return { data: null, loading: false, error: new Error('Sessão não autenticada.') };
  }
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
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

/**
 * Um evento pelo slug. Primeiro da lista do organizador (caminho quente);
 * fora dela, fallback `getEvento` (query DEPENDENTE — só dispara quando a lista
 * já resolveu sem o slug) para distinguir escopo de inexistência (review #16)
 * e reabrir eventos próprios além do pageLimit (mitiga #33).
 */
export function useEvento(slug: string): EventoDetalheState {
  const session = useTenantSession();
  const { data: eventos, loading, error } = useEventos();

  const daLista = eventos?.find((e) => e.slug === slug) ?? null;
  const precisaFallback = !loading && !error && !daLista;
  const uid = session.uid;
  const tenantId = session.tenantId;
  const fallbackEnabled = precisaFallback && !!uid && !!tenantId;

  // Fallback tenant-wide (chave própria por slug — nunca serve stale de outro).
  const fb = useQuery({ ...eventoDetalheQuery(slug), enabled: fallbackEnabled });

  if (loading) return { data: null, loading: true, error: null, motivo: null };
  if (error) return { data: null, loading: false, error, motivo: null };
  if (daLista) return { data: daLista, loading: false, error: null, motivo: null };

  // A partir daqui precisaFallback é true (não está na lista, sem loading/erro).
  // Sessão ainda sem uid/tenant → segue resolvendo.
  if (!fallbackEnabled || fb.isPending) {
    return { data: null, loading: true, error: null, motivo: null };
  }

  const naoEncontrado: EventoDetalheState = {
    data: null,
    loading: false,
    error: new Error(`Evento "${slug}" não encontrado.`),
    motivo: 'nao_encontrado',
  };

  // permission-denied (cross-tenant) e afins — não distingue: inexistente.
  if (fb.error) return naoEncontrado;

  const evento = fb.data ?? null;
  if (evento && evento.tenantId === tenantId && evento.organizadorId === uid) {
    // Evento MEU fora da 1ª página da lista (pageLimit) — abre normal.
    return { data: evento, loading: false, error: null, motivo: null };
  }
  if (evento && evento.tenantId === tenantId) {
    return { ...naoEncontrado, motivo: 'fora_do_escopo' };
  }
  return naoEncontrado;
}

/** Últimos inscritos (atividade recente do Overview do evento). */
export function useInscritosRecentes(
  eventoId: string | null,
  limite = 5,
): AsyncState<Inscrito[]> {
  const query = useQuery({
    ...inscritosRecentesQuery(eventoId ?? '', limite),
    enabled: !!eventoId,
  });

  if (!eventoId) return { data: null, loading: true, error: null };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}
