// =============================================================================
// Hooks de leitura de desafios do clube (E05-L4). Consomem a leitura tipada do
// api-client (listDesafios — S105-T1/L2). Filtro fino (status/modelo/busca)
// roda no cliente (_lib/desafios). Agregados ∑ vêm do backend — a tela só lê.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import {
  atualizarDesafio,
  criarDesafio,
  getLeelaDb,
  type CriarDesafioInput,
  type CriarDesafioResult,
} from '@leela/api-client';
import type { Desafio } from '@leela/core';
import { desafioDetalheQuery, desafiosDoClubeQuery } from '../../../lib/query/queries';
import type { AsyncState } from './clubes';

/** Desafios de um clube, mais recentes primeiro (TanStack Query · ADR-010). */
export function useDesafios(clubeId: string | null): AsyncState<Desafio[]> {
  const query = useQuery({
    ...desafiosDoClubeQuery(clubeId ?? ''),
    enabled: !!clubeId,
  });

  if (!clubeId) return { data: null, loading: true, error: null };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}

/** Um desafio pelo id (modo edição do editor). Null-loading enquanto busca. */
export function useDesafio(
  clubeId: string | null,
  desafioId: string | null,
): AsyncState<Desafio> {
  const enabled = !!clubeId && !!desafioId;
  const query = useQuery({
    ...desafioDetalheQuery(clubeId ?? '', desafioId ?? ''),
    enabled,
  });

  if (!enabled) return { data: null, loading: false, error: null };
  if (query.isPending) return { data: null, loading: true, error: null };
  if (query.error) return { data: null, loading: false, error: query.error };
  if (!query.data) {
    return { data: null, loading: false, error: new Error('Desafio não encontrado.') };
  }
  return { data: query.data, loading: false, error: null };
}

/** Porta real de criação de desafio (write direto — Rules-guarded). */
export const criarDesafioPadrao = (
  clubeId: string,
  input: CriarDesafioInput,
): Promise<CriarDesafioResult> => criarDesafio(getLeelaDb(), clubeId, input);

/** Porta real de edição de desafio (write direto — agregados intocados). */
export const atualizarDesafioPadrao = (
  clubeId: string,
  desafioId: string,
  input: Omit<CriarDesafioInput, 'tenantId' | 'acoes'>,
): Promise<void> => atualizarDesafio(getLeelaDb(), clubeId, desafioId, input);
