// =============================================================================
// Hooks de leitura de comunicados do clube (E05-L4 · S108-T2). Consomem
// listComunicados (S108-T1/L2). Filtro fino (status/canal/origem/busca) roda no
// cliente (_lib/comunicados). Carimbo de envio + alcance vêm da Function.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import {
  atualizarComunicado,
  criarComunicado,
  getLeelaDb,
  type AtualizarComunicadoInput,
  type CriarComunicadoInput,
} from '@leela/api-client';
import type { Comunicado } from '@leela/core';
import {
  comunicadoDetalheQuery,
  comunicadosDoClubeQuery,
} from '../../../lib/query/queries';
import type { AsyncState } from './clubes';

/** Comunicados de um clube, mais recentes primeiro (TanStack Query · ADR-010). */
export function useComunicados(clubeId: string | null): AsyncState<Comunicado[]> {
  const query = useQuery({
    ...comunicadosDoClubeQuery(clubeId ?? ''),
    enabled: !!clubeId,
  });

  if (!clubeId) return { data: null, loading: true, error: null };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}

/** Um comunicado pelo id (modo edição do editor). */
export function useComunicado(
  clubeId: string | null,
  comunicadoId: string | null,
): AsyncState<Comunicado> {
  const enabled = !!clubeId && !!comunicadoId;
  const query = useQuery({
    ...comunicadoDetalheQuery(clubeId ?? '', comunicadoId ?? ''),
    enabled,
  });

  if (!enabled) return { data: null, loading: false, error: null };
  if (query.isPending) return { data: null, loading: true, error: null };
  if (query.error) return { data: null, loading: false, error: query.error };
  if (!query.data) {
    return { data: null, loading: false, error: new Error('Comunicado não encontrado.') };
  }
  return { data: query.data, loading: false, error: null };
}

/** Porta real de composição de comunicado (write direto — Rules-guarded). */
export const criarComunicadoPadrao = (
  clubeId: string,
  input: CriarComunicadoInput,
): Promise<{ comunicadoId: string }> => criarComunicado(getLeelaDb(), clubeId, input);

/** Porta real de EDIÇÃO de comunicado (fix S2 — editar não duplica). */
export const atualizarComunicadoPadrao = (
  clubeId: string,
  comunicadoId: string,
  input: AtualizarComunicadoInput,
): Promise<void> => atualizarComunicado(getLeelaDb(), clubeId, comunicadoId, input);
