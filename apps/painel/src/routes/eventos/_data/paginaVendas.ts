// =============================================================================
// Camada de dados da PÁGINA DE VENDAS do evento (S300-T3 · E04). Leitura
// (`usePaginaVendas`) via gateway TanStack Query + escrita de conteúdo (seções/
// SEO) direta e publicação por Function (seam). Read-your-writes por invalidação
// da chave `paginaVendas.doEvento` (ADR-010) — o editor reflete o save sem
// reload manual. `publicada`/`publicadaEm` são escrita EXCLUSIVA de Function; o
// cliente só edita conteúdo.
// =============================================================================

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  SalvarConteudoPaginaVendasInput,
  PublicarPaginaVendasResult,
} from '@leela/api-client';
import type { PaginaVendas } from '@leela/core';
import { paginaVendasDoEventoQuery } from '../../../lib/query/queries';
import {
  useDespublicarPaginaVendas,
  usePublicarPaginaVendas,
  useSalvarConteudoPaginaVendas,
} from '../../../lib/query/mutations';
import type { AsyncState } from './eventos';
import { useEventosSession } from './session';

/**
 * Página de vendas de um evento. `null` (doc ainda não criado) NÃO é erro — o
 * editor parte das seções padrão do kernel. Contrato {data,loading,error}
 * preservado (strangler-fig). Sem evento ainda → segue em loading.
 */
export function usePaginaVendas(eventoId: string | null): AsyncState<PaginaVendas | null> {
  const query = useQuery({
    ...paginaVendasDoEventoQuery(eventoId ?? ''),
    enabled: !!eventoId,
  });
  if (!eventoId) return { data: null, loading: true, error: null };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}

export interface PaginaVendasMutations {
  tenantId: string | null;
  /** Salva conteúdo (seções + SEO). `criar` materializa o doc como rascunho. */
  salvarConteudo: (
    input: Omit<SalvarConteudoPaginaVendasInput, 'tenantId'>,
    criar: boolean,
  ) => Promise<void>;
  publicar: () => Promise<PublicarPaginaVendasResult>;
  despublicar: () => Promise<PublicarPaginaVendasResult>;
}

/** Callers de escrita da página, com o tenantId da sessão injetado (ADR-009). */
export function usePaginaVendasMutations(eventoId: string): PaginaVendasMutations {
  const session = useEventosSession();
  const tenantId = session.tenantId;
  const salvarMutation = useSalvarConteudoPaginaVendas(eventoId);
  const publicarMutation = usePublicarPaginaVendas(eventoId);
  const despublicarMutation = useDespublicarPaginaVendas(eventoId);

  const salvarConteudo = useCallback(
    (input: Omit<SalvarConteudoPaginaVendasInput, 'tenantId'>, criar: boolean) => {
      if (!tenantId) return Promise.reject(new Error('Sessão sem tenant.'));
      return salvarMutation
        .mutateAsync({ input: { ...input, tenantId }, criar })
        .then(() => undefined);
    },
    [salvarMutation, tenantId],
  );

  const publicar = useCallback(() => publicarMutation.mutateAsync(), [publicarMutation]);
  const despublicar = useCallback(
    () => despublicarMutation.mutateAsync(),
    [despublicarMutation],
  );

  return { tenantId, salvarConteudo, publicar, despublicar };
}
