// =============================================================================
// Camada de dados dos kits do evento (S205/S206). Leituras (`useKits`,
// `useItensKit`) via gateway (TanStack Query, ADR-010) + escrita do organizador
// (kits/itens são configuração, não estado financeiro). `usadoEm` é da Function
// (RN-215) e nunca é enviado pelo cliente. Read-your-writes por invalidação de
// chave: salvar/remover kit OU item revalida o Cadastro sem contador de reload.
// =============================================================================

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getLeelaDb,
  removerItemKit,
  removerKit,
  salvarItemKit,
  type SalvarItemKitInput,
  type SalvarKitInput,
} from '@leela/api-client';
import type { ItemKit, Kit } from '@leela/core';
import { itensKitDoEventoQuery, kitsDoEventoQuery } from '../../../lib/query/queries';
import { queryKeys } from '../../../lib/query/keys';
import { useSalvarKit } from '../../../lib/query/mutations';
import type { AsyncState } from './eventos';
import { useEventosSession } from './session';

/**
 * Kits do evento (do mais caro ao "Sem kit") — TanStack Query (ADR-010). A chave
 * é partilhada Cadastro ↔ Estoque (reidrata do cache ao alternar sub-abas);
 * `reloadKey` preserva o refetch pós-save do Cadastro sem tocar os callers.
 * Contrato {data,loading,error} preservado (strangler-fig, Fowler).
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

/**
 * Catálogo de itens do evento (top-level `itensKit`, filtrado por tenant) —
 * migrado de fetch cru (useEffect/useState) para TanStack Query (ADR-010): o
 * último straggler da seção. tenantId vem da sessão; enquanto ela carrega, segue
 * em loading (não finge vazio). Salvar/remover item invalida esta chave → o
 * Cadastro reflete sem contador de reload. Contrato {data,loading,error} mantido.
 */
export function useItensKit(eventoId: string | null): AsyncState<ItemKit[]> {
  const session = useEventosSession();
  const tenantId = session.tenantId;
  const query = useQuery({
    ...itensKitDoEventoQuery(tenantId ?? '', eventoId ?? ''),
    enabled: !!eventoId && session.status !== 'loading' && !!tenantId,
  });

  if (!eventoId || session.status === 'loading') return { data: null, loading: true, error: null };
  if (!tenantId) return { data: null, loading: false, error: new Error('Sessão sem tenant.') };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
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
  const queryClient = useQueryClient();
  // Escrita via camada de mutation (lib/query): salvarKit + invalidação da
  // família de kits do evento no onSuccess — o Cadastro reflete o kit salvo ao
  // voltar do editor sem contador de reload manual (read-your-writes, ADR-010).
  const salvarKitMutation = useSalvarKit(eventoId);

  // Item alterado → o catálogo (itensDoEvento) muda E o `usadoEm` dos kits pode
  // mudar (item vinculado/desvinculado) → invalida as DUAS famílias. Kit escrito
  // direto (remover) → só a família de kits. Read-your-writes (ADR-010).
  const invalidarItens = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.kits.itensDoEvento(eventoId) });
    void queryClient.invalidateQueries({ queryKey: ['kits', 'do-evento', eventoId] });
  }, [queryClient, eventoId]);

  const salvar = useCallback(
    (kitId: string, input: Omit<SalvarKitInput, 'tenantId'>) => {
      if (!tenantId) return Promise.reject(new Error('Sessão sem tenant.'));
      return salvarKitMutation
        .mutateAsync({ kitId, input: { ...input, tenantId } })
        .then(() => undefined);
    },
    [salvarKitMutation, tenantId],
  );

  const remover = useCallback(
    async (kitId: string) => {
      await removerKit(getLeelaDb(), eventoId, kitId);
      void queryClient.invalidateQueries({ queryKey: ['kits', 'do-evento', eventoId] });
    },
    [eventoId, queryClient],
  );

  const salvarItem = useCallback(
    async (itemId: string, input: Omit<SalvarItemKitInput, 'tenantId' | 'eventoId'>) => {
      if (!tenantId) throw new Error('Sessão sem tenant.');
      await salvarItemKit(getLeelaDb(), itemId, { ...input, tenantId, eventoId });
      invalidarItens();
    },
    [eventoId, tenantId, invalidarItens],
  );

  const removerItem = useCallback(
    async (itemId: string) => {
      await removerItemKit(getLeelaDb(), itemId);
      invalidarItens();
    },
    [invalidarItens],
  );

  return { tenantId, salvar, remover, salvarItem, removerItem };
}
