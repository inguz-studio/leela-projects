// =============================================================================
// Hooks de leitura das telas de clube (E05-L3). Consomem a camada de dados do
// E05-L1 (@leela/api-client) + o db do Firebase client.
//
// Contrato L1 consumido (PRONTO): getClube(db, slug), listClubesByTenant,
// listClubesByOwner, listMembros(db, clubeId, { status, papel }). Agregados ∑
// (qtdMembrosAtivos, qtdDesafiosAtivos) e status derivado (RN-102) vêm do
// backend — estas telas só leem.
// =============================================================================

import { useEffect, useState } from 'react';
import {
  atualizarClube,
  getClube,
  getLeelaDb,
  listClubesByTenant,
  listMembros,
  type AtualizarClubeInput,
} from '@leela/api-client';
import type { Clube, Membro } from '@leela/core';
import { useClubesSession } from './session';

/** Porta real de atualização de configurações do clube (write direto). */
export const atualizarClubePadrao = (
  slug: string,
  patch: AtualizarClubeInput,
): Promise<void> => atualizarClube(getLeelaDb(), slug, patch);

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/** Lista de clubes do tenant do profissional logado (hub — 2 zonas). */
export function useClubes(): AsyncState<Clube[]> {
  const session = useClubesSession();
  const [state, setState] = useState<AsyncState<Clube[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (session.status === 'loading') return;
    if (session.status === 'anonymous' || !session.tenantId) {
      setState({ data: null, loading: false, error: new Error('Sessão não autenticada.') });
      return;
    }
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    listClubesByTenant(getLeelaDb(), session.tenantId)
      .then((clubes) => ativo && setState({ data: clubes, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [session.status, session.tenantId]);

  return state;
}

/** Um clube pelo slug (leitura direta O(1) — docId = slug). */
export function useClube(slug: string): AsyncState<Clube> {
  const session = useClubesSession();
  const [state, setState] = useState<AsyncState<Clube>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (session.status === 'loading') return;
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    getClube(getLeelaDb(), slug)
      .then((clube) => {
        if (!ativo) return;
        if (!clube) {
          setState({ data: null, loading: false, error: new Error(`Clube "${slug}" não encontrado.`) });
          return;
        }
        setState({ data: clube, loading: false, error: null });
      })
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [slug, session.status]);

  return state;
}

/**
 * Membros de um clube. O filtro fino (status × papel × busca) roda no cliente
 * (ver _lib/membros); aqui buscamos a página densa ordenada por nome.
 *
 * `reload()` re-busca a página — usado após remover membro / transferir
 * propriedade (mutations que recontam agregados no servidor) para refletir o
 * novo estado sem recarregar a rota.
 */
export function useMembros(clubeId: string | null): AsyncState<Membro[]> & {
  reload: () => void;
} {
  const [state, setState] = useState<AsyncState<Membro[]>>({
    data: null,
    loading: true,
    error: null,
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!clubeId) return;
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    listMembros(getLeelaDb(), clubeId, { pageLimit: 200 })
      .then((membros) => ativo && setState({ data: membros, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [clubeId, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}
