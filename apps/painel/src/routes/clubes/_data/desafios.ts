// =============================================================================
// Hooks de leitura de desafios do clube (E05-L4). Consomem a leitura tipada do
// api-client (listDesafios — S105-T1/L2). Filtro fino (status/modelo/busca)
// roda no cliente (_lib/desafios). Agregados ∑ vêm do backend — a tela só lê.
// =============================================================================

import { useEffect, useState } from 'react';
import {
  atualizarDesafio,
  criarDesafio,
  getDesafio,
  getLeelaDb,
  listDesafios,
  type CriarDesafioInput,
  type CriarDesafioResult,
} from '@leela/api-client';
import type { Desafio } from '@leela/core';
import type { AsyncState } from './clubes';

/** Desafios de um clube, mais recentes primeiro. */
export function useDesafios(clubeId: string | null): AsyncState<Desafio[]> {
  const [state, setState] = useState<AsyncState<Desafio[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!clubeId) return;
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    listDesafios(getLeelaDb(), clubeId)
      .then((desafios) => ativo && setState({ data: desafios, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [clubeId]);

  return state;
}

/** Um desafio pelo id (modo edição do editor). Null-loading enquanto busca. */
export function useDesafio(
  clubeId: string | null,
  desafioId: string | null,
): AsyncState<Desafio> {
  const [state, setState] = useState<AsyncState<Desafio>>({
    data: null,
    loading: Boolean(desafioId),
    error: null,
  });

  useEffect(() => {
    if (!clubeId || !desafioId) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    let ativo = true;
    setState({ data: null, loading: true, error: null });
    getDesafio(getLeelaDb(), clubeId, desafioId)
      .then((d) => {
        if (!ativo) return;
        if (!d) {
          setState({ data: null, loading: false, error: new Error('Desafio não encontrado.') });
          return;
        }
        setState({ data: d, loading: false, error: null });
      })
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));
    return () => {
      ativo = false;
    };
  }, [clubeId, desafioId]);

  return state;
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
