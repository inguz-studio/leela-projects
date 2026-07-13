// =============================================================================
// Hooks de leitura + portas de escrita das Campanhas do evento (S401-T2/T3 ·
// E06-L3) — TanStack Query (ADR-010). Consomem o gateway (`lib/query`), que
// reusa os readers/wrappers provados do @leela/api-client. O agrupamento por
// estado e os filtros rodam no cliente (`_lib/campanhas`); o carimbo de envio
// (status='enviado' + alcance) é EXCLUSIVO da Function `enviarCampanha`.
//
// Contrato {data,loading,error} preservado como os demais hooks de evento
// (strangler-fig); `enabled` só dispara com eventoId real.
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import {
  atualizarCampanha,
  criarCampanha,
  enviarCampanha,
  estimarAlcanceCampanha,
  excluirCampanha,
  getLeelaDb,
  getLeelaFunctions,
  type AtualizarCampanhaInput,
  type CriarCampanhaInput,
  type EnviarCampanhaInput,
  type EnviarCampanhaResult,
  type EstimarAlcanceCampanhaInput,
  type EstimarAlcanceCampanhaResult,
} from '@leela/api-client';
import type { Campanha } from '@leela/core';
import {
  campanhaDetalheQuery,
  campanhasDoEventoQuery,
} from '../../../lib/query/queries';
import type { AsyncState } from './eventos';

/** Campanhas de um evento, mais recentes primeiro (TanStack Query · ADR-010). */
export function useCampanhas(eventoId: string | null): AsyncState<Campanha[]> {
  const query = useQuery({
    ...campanhasDoEventoQuery(eventoId ?? ''),
    enabled: !!eventoId,
  });

  if (!eventoId) return { data: null, loading: true, error: null };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}

/** Uma campanha pelo id (modo edição do editor). */
export function useCampanha(
  eventoId: string | null,
  campanhaId: string | null,
): AsyncState<Campanha> {
  const enabled = !!eventoId && !!campanhaId;
  const query = useQuery({
    ...campanhaDetalheQuery(eventoId ?? '', campanhaId ?? ''),
    enabled,
  });

  if (!enabled) return { data: null, loading: false, error: null };
  if (query.isPending) return { data: null, loading: true, error: null };
  if (query.error) return { data: null, loading: false, error: query.error };
  if (!query.data) {
    return { data: null, loading: false, error: new Error('Campanha não encontrada.') };
  }
  return { data: query.data, loading: false, error: null };
}

// ---------------------------------------------------------------------------
// Portas de escrita (write direto rascunho/agendado — Rules-guarded; envio e
// estimativa via Cloud Function). A invalidação das chaves de leitura vive no
// container (read-your-writes).
// ---------------------------------------------------------------------------

/** Cria/agenda uma campanha (rascunho/agendado — 'enviado' é da Function). */
export const criarCampanhaPadrao = (
  eventoId: string,
  input: CriarCampanhaInput,
): Promise<{ campanhaId: string }> => criarCampanha(getLeelaDb(), eventoId, input);

/** Atualiza uma campanha existente (editar não duplica). */
export const atualizarCampanhaPadrao = (
  eventoId: string,
  campanhaId: string,
  input: AtualizarCampanhaInput,
): Promise<void> => atualizarCampanha(getLeelaDb(), eventoId, campanhaId, input);

/** Exclui uma campanha NÃO enviada (Rules negam delete de 'enviado'). */
export const excluirCampanhaPadrao = (
  eventoId: string,
  campanhaId: string,
): Promise<void> => excluirCampanha(getLeelaDb(), eventoId, campanhaId);

/** Estima o alcance de um segmento (callable — count() no servidor). */
export const estimarAlcancePorta = (
  input: EstimarAlcanceCampanhaInput,
): Promise<EstimarAlcanceCampanhaResult> =>
  estimarAlcanceCampanha(getLeelaFunctions(), input);

/** Dispara uma campanha (callable idempotente — cota RN-133 no servidor). */
export const enviarCampanhaPorta = (
  input: EnviarCampanhaInput,
): Promise<EnviarCampanhaResult> => enviarCampanha(getLeelaFunctions(), input);
