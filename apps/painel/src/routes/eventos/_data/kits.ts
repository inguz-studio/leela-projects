// =============================================================================
// Camada de dados dos kits do evento (S205/S206). Leituras (`listarKits`,
// `listarItensKit`) + mutações diretas do cliente (kits/itens são configuração
// do organizador, não estado financeiro). `usadoEm` é da Function (RN-215) e
// nunca é enviado pelo cliente. `reload` refaz a leitura após um save.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getLeelaDb,
  listarItensKit,
  removerItemKit,
  removerKit,
  salvarItemKit,
  salvarKit,
  type SalvarItemKitInput,
  type SalvarKitInput,
} from '@leela/api-client';
import type { ItemKit, Kit } from '@leela/core';
import { kitsDoEventoQuery } from '../../../lib/query/queries';
import type { AsyncState } from './eventos';
import { useEventosSession } from './session';

/**
 * Kits do evento (do mais caro ao "Sem kit") — migrado para TanStack Query
 * (ADR-010): último straggler de fetch cru desta seção, consistente com
 * useEventos/useInscritos/useFinanceiro. A chave é partilhada Cadastro ↔ Estoque
 * (reidrata do cache ao alternar sub-abas); `reloadKey` preserva o refetch
 * pós-save do Cadastro sem tocar os callers. Contrato {data,loading,error}
 * preservado (strangler-fig, Fowler).
 */
export function useKits(eventoId: string | null, reloadKey = 0): AsyncState<Kit[]> {
  const query = useQuery({
    ...kitsDoEventoQuery(eventoId ?? '', reloadKey),
    enabled: !!eventoId,
  });
  // Sem evento ainda → segue em loading (não finge vazio), como o hook antigo.
  if (!eventoId) return { data: null, loading: true, error: null };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}

/** Catálogo de itens do evento (top-level `itensKit`, filtrado por tenant). */
export function useItensKit(eventoId: string | null, reloadKey = 0): AsyncState<ItemKit[]> {
  const session = useEventosSession();
  const [state, setState] = useState<AsyncState<ItemKit[]>>({ data: null, loading: true, error: null });
  useEffect(() => {
    if (!eventoId) return;
    if (session.status === 'loading') return;
    if (!session.tenantId) {
      setState({ data: null, loading: false, error: new Error('Sessão sem tenant.') });
      return;
    }
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    listarItensKit(getLeelaDb(), { tenantId: session.tenantId, eventoId })
      .then((itens) => ativo && setState({ data: itens, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [eventoId, session.status, session.tenantId, reloadKey]);
  return state;
}

export interface KitMutations {
  tenantId: string | null;
  salvar: (kitId: string, input: Omit<SalvarKitInput, 'tenantId'>) => Promise<void>;
  remover: (kitId: string) => Promise<void>;
  salvarItem: (itemId: string, input: Omit<SalvarItemKitInput, 'tenantId' | 'eventoId'>) => Promise<void>;
  removerItem: (itemId: string) => Promise<void>;
}

/** Callers de escrita de kits/itens, com tenantId + eventoId injetados. */
export function useKitMutations(eventoId: string): KitMutations {
  const session = useEventosSession();
  const tenantId = session.tenantId;

  const salvar = useCallback(
    (kitId: string, input: Omit<SalvarKitInput, 'tenantId'>) => {
      if (!tenantId) return Promise.reject(new Error('Sessão sem tenant.'));
      return salvarKit(getLeelaDb(), eventoId, kitId, { ...input, tenantId });
    },
    [eventoId, tenantId],
  );

  const remover = useCallback((kitId: string) => removerKit(getLeelaDb(), eventoId, kitId), [eventoId]);

  const salvarItem = useCallback(
    (itemId: string, input: Omit<SalvarItemKitInput, 'tenantId' | 'eventoId'>) => {
      if (!tenantId) return Promise.reject(new Error('Sessão sem tenant.'));
      return salvarItemKit(getLeelaDb(), itemId, { ...input, tenantId, eventoId });
    },
    [eventoId, tenantId],
  );

  const removerItem = useCallback((itemId: string) => removerItemKit(getLeelaDb(), itemId), []);

  return { tenantId, salvar, remover, salvarItem, removerItem };
}
