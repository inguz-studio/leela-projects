// =============================================================================
// Hooks de dados da back-office de ESTORNOS (T4 · decisão 43-b).
//
// LEITURA: fila cross-tenant via fan-out (tenants → eventos → reembolsos),
// composto no gateway de queries. AÇÕES: sempre Cloud Function — `decideRefund`
// (aprovar/recusar a fila), `requestRefund` com `overrideCorte` (furar a
// véspera, RN-376) e `cancelarInscricao` (tirar sem devolver, RN-377). Nenhum
// estado, nenhum valor e nenhuma política decididos no cliente.
// =============================================================================

import { useCallback, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  cancelarInscricao,
  decideRefund,
  requestRefund,
  type CancelarInscricaoResult,
  type DecideRefundResult,
  type RequestRefundResult,
} from '@leela/api-client';
import { estornosFilaAdminQuery, type EstornoFilaItem } from '../../../../lib/query/queries';

export interface AsyncQuery<T> {
  data: T;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Fila cross-tenant de estornos que ainda pedem mão humana. */
export function useFilaEstornos(reloadKey = 0): AsyncQuery<EstornoFilaItem[]> {
  const query = useQuery(estornosFilaAdminQuery(reloadKey));
  return {
    data: query.data ?? [],
    loading: query.isPending,
    error: query.error ?? null,
    refetch: () => {
      void query.refetch();
    },
  };
}

export interface EstornoAdminActions {
  running: boolean;
  error: Error | null;
  /**
   * Erro da ÚLTIMA ação, lido de um ref (FIX ESTORNO-REV · vetor 6). O
   * `error` de estado só existe no render SEGUINTE ao da falha, e o handler
   * que chamou a ação foi criado no render ANTERIOR: ler `error` logo depois
   * do `await` devolve o valor velho — na primeira falha, `null`, e o toast
   * de dinheiro saía sem descrição nenhuma. O ref é escrito na mesma volta
   * do `catch`, então o handler enxerga o erro que ele próprio provocou.
   */
  ultimoErro: () => Error | null;
  decidir: (
    eventoId: string,
    inscritoId: string,
    decisao: 'aprovar' | 'recusar',
    motivo?: string,
  ) => Promise<DecideRefundResult | null>;
  estornarFurandoCorte: (
    pedidoId: string,
    inscritoId: string,
    motivo: string,
    motivoOverride: string,
  ) => Promise<RequestRefundResult | null>;
  cancelarSemEstornar: (
    pedidoId: string,
    inscritoId: string,
    motivo: string,
  ) => Promise<CancelarInscricaoResult | null>;
}

/**
 * Ações do admin. Cada uma devolve o resultado do callable ou `null` quando
 * falha — o erro fica em `error` e sobe INTACTO para a mensagem da tela
 * (§2.12): as guardas do servidor já escrevem em português para o operador.
 */
export function useEstornoAdminActions(): EstornoAdminActions {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // Espelho síncrono do erro (ver `ultimoErro` no contrato): estado de React
  // não volta a tempo para quem já está dentro do handler.
  const erroRef = useRef<Error | null>(null);

  const executar = useCallback(async function executar<T>(fn: () => Promise<T>): Promise<T | null> {
    setRunning(true);
    setError(null);
    erroRef.current = null;
    try {
      return await fn();
    } catch (err) {
      const erro = err instanceof Error ? err : new Error(String(err));
      erroRef.current = erro;
      setError(erro);
      return null;
    } finally {
      setRunning(false);
    }
  }, []);

  return {
    running,
    error,
    ultimoErro: useCallback(() => erroRef.current, []),
    decidir: useCallback(
      (eventoId, inscritoId, decisao, motivo) =>
        executar(() =>
          decideRefund({
            eventoId,
            inscritoId,
            decisao,
            ...(motivo !== undefined && motivo.trim().length > 0 ? { motivo } : {}),
          }),
        ),
      [executar],
    ),
    estornarFurandoCorte: useCallback(
      (pedidoId, inscritoId, motivo, motivoOverride) =>
        executar(() =>
          requestRefund({ pedidoId, inscritoId, motivo, overrideCorte: true, motivoOverride }),
        ),
      [executar],
    ),
    cancelarSemEstornar: useCallback(
      (pedidoId, inscritoId, motivo) =>
        executar(() => cancelarInscricao({ pedidoId, inscritoId, motivo })),
      [executar],
    ),
  };
}
