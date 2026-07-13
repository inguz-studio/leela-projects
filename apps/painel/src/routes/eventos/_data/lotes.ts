// =============================================================================
// Camada de dados dos lotes do evento (S300 · E04 · ADR-012). Leitura
// (`listarLotes`) via gateway TanStack Query + mutações diretas (o lote é
// configuração comercial do organizador, como kits). `vendidos` é ∑ de Function
// (RN-300) e nunca é enviado pelo cliente. Read-your-writes por invalidação da
// chave `lotes.doEvento` (ADR-010) — a tela reflete o save sem reload manual.
// =============================================================================

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { EscritaLoteInput, SalvarLoteInput } from '@leela/api-client';
import type { Lote } from '@leela/core';
import { lotesDoEventoQuery } from '../../../lib/query/queries';
import { useRemoverLote, useSalvarLote } from '../../../lib/query/mutations';
import type { AsyncState } from './eventos';
import { useEventosSession } from './session';

/**
 * Lotes de um evento (todas as modalidades) — a tela agrupa por modalidade e
 * deriva preço vigente/lote ativo pelo core. Contrato {data,loading,error}
 * preservado (strangler-fig, Fowler). Sem evento ainda → segue em loading.
 */
export function useLotes(eventoId: string | null): AsyncState<Lote[]> {
  const query = useQuery({
    ...lotesDoEventoQuery(eventoId ?? ''),
    enabled: !!eventoId,
  });
  if (!eventoId) return { data: null, loading: true, error: null };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}

/**
 * Payload da tela SEM tenantId (injetado da sessão): completo (lote sem
 * venda) ou SÓ-NOME (lote vendido — RN-200/300, review S300-T4 #1).
 */
export type LotePayloadSemTenant =
  | Omit<SalvarLoteInput, 'tenantId'>
  | { nome: string };

export interface LoteMutations {
  tenantId: string | null;
  /** Cria/edita um lote. `criar` inclui `criadoEm` só na criação. */
  salvar: (loteId: string, input: LotePayloadSemTenant, criar: boolean) => Promise<void>;
  remover: (loteId: string) => Promise<void>;
}

/** Callers de escrita de lote, com o tenantId da sessão injetado (ADR-009). */
export function useLoteMutations(eventoId: string): LoteMutations {
  const session = useEventosSession();
  const tenantId = session.tenantId;
  const salvarLoteMutation = useSalvarLote(eventoId);
  const removerLoteMutation = useRemoverLote(eventoId);

  const salvar = useCallback(
    (loteId: string, input: LotePayloadSemTenant, criar: boolean) => {
      if (!tenantId) return Promise.reject(new Error('Sessão sem tenant.'));
      const comTenant: EscritaLoteInput = { ...input, tenantId };
      return salvarLoteMutation
        .mutateAsync({ loteId, input: comTenant, criar })
        .then(() => undefined);
    },
    [salvarLoteMutation, tenantId],
  );

  const remover = useCallback(
    (loteId: string) => removerLoteMutation.mutateAsync(loteId).then(() => undefined),
    [removerLoteMutation],
  );

  return { tenantId, salvar, remover };
}
