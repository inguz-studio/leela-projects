// =============================================================================
// Camada de dados do Estoque por SKU (S210-T4 · E03 · FABLE-D) — TanStack Query
// (ADR-010). Lê a subcoleção REAL `eventos/{id}/aprovisionamento/{sku}` pelo
// gateway (`aprovisionamentoDoEventoQuery` → `listarAprovisionamento`): os ∑
// (qtdVendida/aEncomendar) e o `alerta` vêm DERIVADOS do doc pela Function
// `agregarEstoque` — a tela nunca varre inscritos nem recomputa agregado no
// cliente (RN-224). Lista vazia = evento sem SKU tamanhado (EmptyState honesto).
//
// A transição de estado (estimativa → encomendado → em_estoque, RN-226) é
// escrita EXCLUSIVA de Function: o container usa `useTransicaoAprovisionamento`
// (lib/query/mutations), que invalida esta chave no sucesso (read-your-writes).
// Contrato de retorno {data,loading,error} preservado (padrão da seção).
// =============================================================================

import { useQuery } from '@tanstack/react-query';
import type { Aprovisionamento } from '@leela/core';
import { aprovisionamentoDoEventoQuery } from '../../../lib/query/queries';
import type { AsyncState } from './eventos';

/** Aprovisionamento por SKU do evento (leitura dos ∑ do doc — RN-224). */
export function useAprovisionamento(eventoId: string | null): AsyncState<Aprovisionamento[]> {
  const query = useQuery({
    ...aprovisionamentoDoEventoQuery(eventoId ?? ''),
    enabled: !!eventoId,
  });

  // Sem evento ainda → segue em loading (não finge vazio), como os demais hooks.
  if (!eventoId) return { data: null, loading: true, error: null };
  return { data: query.data ?? null, loading: query.isPending, error: query.error ?? null };
}
