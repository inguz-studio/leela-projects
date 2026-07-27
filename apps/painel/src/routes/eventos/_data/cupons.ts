// =============================================================================
// Camada de dados dos cupons do evento (S300-T5 · E04). Leitura (`listarCupons`)
// via gateway TanStack Query + mutações diretas (o cupom é configuração
// comercial do organizador, como lotes/kits). `usos` (≡ usosFeitos) é ∑ de
// Function (checkout, E12) e nunca é enviado pelo cliente. Read-your-writes por
// invalidação da chave `cupons.doEvento` (ADR-010) — a seção reflete o save sem
// reload manual. `tenantId` vem da sessão (ADR-009).
// =============================================================================

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SalvarCupomInput } from '@leela/api-client';
import type { Cupom } from '@leela/core';
import { cuponsDoEventoQuery } from '../../../lib/query/queries';
import { useRemoverCupom, useSalvarCupom } from '../../../lib/query/mutations';
import type { AsyncState } from './eventos';
import { useTenantSession } from '../../../lib/session/tenantSession';

/**
 * Cupons de um evento — a seção deriva vigência/estado pelo core (cupomVigente),
 * nunca recalcula desconto (isso é do checkout, E12). Contrato {data,loading,
 * error} preservado. Sem evento ainda → segue em loading.
 */
export function useCupons(eventoId: string | null): AsyncState<Cupom[]> {
  const query = useQuery({
    ...cuponsDoEventoQuery(eventoId ?? ''),
    enabled: !!eventoId,
  });
  if (!eventoId) return { data: null, loading: true, error: null };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}

/** Payload da seção SEM tenantId (injetado da sessão). */
export type CupomPayloadSemTenant = Omit<SalvarCupomInput, 'tenantId'>;

export interface CupomMutations {
  tenantId: string | null;
  /** Cria/edita um cupom. `criar` inclui `criadoEm` só na criação. */
  salvar: (cupomId: string, input: CupomPayloadSemTenant, criar: boolean) => Promise<void>;
  remover: (cupomId: string) => Promise<void>;
}

/** Callers de escrita de cupom, com o tenantId da sessão injetado (ADR-009). */
export function useCupomMutations(eventoId: string): CupomMutations {
  const session = useTenantSession();
  const tenantId = session.tenantId;
  const salvarCupomMutation = useSalvarCupom(eventoId);
  const removerCupomMutation = useRemoverCupom(eventoId);

  const salvar = useCallback(
    (cupomId: string, input: CupomPayloadSemTenant, criar: boolean) => {
      if (!tenantId) return Promise.reject(new Error('Sessão sem tenant.'));
      const comTenant: SalvarCupomInput = { ...input, tenantId };
      return salvarCupomMutation
        .mutateAsync({ cupomId, input: comTenant, criar })
        .then(() => undefined);
    },
    [salvarCupomMutation, tenantId],
  );

  const remover = useCallback(
    (cupomId: string) => removerCupomMutation.mutateAsync(cupomId).then(() => undefined),
    [removerCupomMutation],
  );

  return { tenantId, salvar, remover };
}
