// =============================================================================
// Hook de carga dos inscritos de um evento para a tabela densa (S203-T2).
//
// A camada de dados (`listarInscritos`) é paginada por CURSOR 18/página
// (§2.5, mock 453). A tela precisa filtrar/buscar sobre TODOS os inscritos e
// exibir "mostrando X de Y" coerente — então percorremos os cursores uma vez,
// acumulamos em memória (453 docs = leitura de balcão, aceitável) e paginamos
// + filtramos client-side. A busca "Marina" varre o conjunto inteiro, não só
// a página atual (aceite do brief).
// =============================================================================

import { useEffect, useState } from 'react';
import {
  getLeelaDb,
  listarInscritos,
  INSCRITOS_PAGE_SIZE,
  type InscritosCursor,
} from '@leela/api-client';
import type { Inscrito } from '@leela/core';
import type { AsyncState } from './eventos';

/** Teto de segurança contra loop infinito (453 → 26 páginas; 200 é folga). */
const MAX_PAGINAS = 200;

/** Carrega TODOS os inscritos do evento percorrendo os cursores (§2.5). */
export function useTodosInscritos(eventoId: string | null): AsyncState<Inscrito[]> {
  const [state, setState] = useState<AsyncState<Inscrito[]>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!eventoId) return;
    let ativo = true;
    setState({ data: null, loading: true, error: null });

    (async () => {
      const db = getLeelaDb();
      const acc: Inscrito[] = [];
      let cursor: InscritosCursor | undefined;
      for (let i = 0; i < MAX_PAGINAS; i += 1) {
        const options = cursor
          ? { cursor, pageSize: INSCRITOS_PAGE_SIZE }
          : { pageSize: INSCRITOS_PAGE_SIZE };
        const { itens, proxCursor } = await listarInscritos(db, eventoId, options);
        acc.push(...itens);
        if (!proxCursor) break;
        cursor = proxCursor;
      }
      return acc;
    })()
      .then((todos) => ativo && setState({ data: todos, loading: false, error: null }))
      .catch((error: Error) => ativo && setState({ data: null, loading: false, error }));

    return () => {
      ativo = false;
    };
  }, [eventoId]);

  return state;
}
