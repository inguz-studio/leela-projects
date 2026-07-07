// =============================================================================
// Hooks de leitura das telas de clube (E05-L3). Consomem a camada de dados do
// E05-L1 (@leela/api-client) + o db do Firebase client.
//
// Contrato L1 consumido (PRONTO): getClube(db, slug), listClubesByTenant,
// listClubesByOwner, listMembros(db, clubeId, { status, papel }). Agregados ∑
// (qtdMembrosAtivos, qtdDesafiosAtivos) e status derivado (RN-102) vêm do
// backend — estas telas só leem.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import {
  atualizarClube,
  criarClube,
  deletarClube,
  exportarDadosClube,
  getLeelaDb,
  getLeelaFunctions,
  type AtualizarClubeInput,
  type DeletarClubeResult,
  type ExportarDadosClubeResult,
} from '@leela/api-client';
import type { Clube, ClubeInput, Membro } from '@leela/core';
import {
  clubeDetalheQuery,
  clubesDoTenantQuery,
  membrosDoClubeQuery,
} from '../../../lib/query/queries';
import { useClubesSession } from './session';

/** Porta real de CRIAÇÃO de clube (fix #14 — rota /clubes/novo). */
export const criarClubePadrao = (input: ClubeInput): Promise<{ slug: string }> =>
  criarClube(getLeelaDb(), input);

/** Porta real de atualização de configurações do clube (write direto). */
export const atualizarClubePadrao = (
  slug: string,
  patch: AtualizarClubeInput,
): Promise<void> => atualizarClube(getLeelaDb(), slug, patch);

/** Porta de exclusão do clube (callable — CONTRATO, Function Fable S110-T2). */
export const deletarClubePadrao = (clubeId: string): Promise<DeletarClubeResult> =>
  deletarClube(getLeelaFunctions(), clubeId);

/** Porta de exportação LGPD (callable — CONTRATO, Function Fable S110-T2). */
export const exportarDadosPadrao = (
  clubeId: string,
): Promise<ExportarDadosClubeResult> => exportarDadosClube(getLeelaFunctions(), clubeId);

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

// -----------------------------------------------------------------------------
// Hooks de LEITURA migrados para TanStack Query (ADR-010 · lote FID-CLUBES-F0).
// Consomem o gateway (lib/query), que reusa a leitura provada do api-client.
// Contrato de retorno {data, loading, error[, reload]} preservado byte-a-byte —
// consumidores (HubRoute, ClubeLayout, MembrosPage…) intactos (strangler-fig,
// Fowler). Chaves partilhadas → navegar entre telas do clube reidrata do cache.
// -----------------------------------------------------------------------------

/** Lista de clubes do tenant do profissional logado (hub — 2 zonas). */
export function useClubes(): AsyncState<Clube[]> {
  const session = useClubesSession();
  const enabled = session.status === 'authenticated' && !!session.tenantId;
  const query = useQuery({
    ...clubesDoTenantQuery(session.tenantId ?? ''),
    enabled,
  });

  // Sessão resolvida sem tenant válido → erro honesto (não dispara a query).
  if (session.status !== 'loading' && !enabled) {
    return { data: null, loading: false, error: new Error('Sessão não autenticada.') };
  }
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}

/** Um clube pelo slug (leitura direta O(1) — docId = slug). */
export function useClube(slug: string): AsyncState<Clube> {
  const session = useClubesSession();
  const query = useQuery({
    ...clubeDetalheQuery(slug),
    enabled: session.status !== 'loading' && !!slug,
  });

  if (query.isPending) return { data: null, loading: true, error: null };
  if (query.error) return { data: null, loading: false, error: query.error };
  if (!query.data) {
    return { data: null, loading: false, error: new Error(`Clube "${slug}" não encontrado.`) };
  }
  return { data: query.data, loading: false, error: null };
}

/**
 * Membros de um clube. O filtro fino (status × papel × busca) roda no cliente
 * (ver _lib/membros); aqui buscamos a página densa ordenada por nome.
 *
 * `reload()` revalida a chave `membros.doClube` — preservado no contrato para os
 * callers atuais (MembrosPage). A partir do lote de mutações, remover/transferir
 * invalidam essa MESMA chave (read-your-writes declarativo, ADR-010).
 */
export function useMembros(clubeId: string | null): AsyncState<Membro[]> & {
  reload: () => void;
} {
  const query = useQuery({
    ...membrosDoClubeQuery(clubeId ?? ''),
    enabled: !!clubeId,
  });

  // Sem clube ainda → segue em loading (não finge vazio), como o hook antigo.
  if (!clubeId) {
    return { data: null, loading: true, error: null, reload: () => {} };
  }
  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error ?? null,
    reload: () => void query.refetch(),
  };
}
