// =============================================================================
// Data hooks das telas de assessoria parceira (E18). Leitura tenant-scoped
// direta (getLeelaDb + listParceriasAssessoria) com refetch manual — escopo
// LOCAL ao módulo, sem tocar o registry compartilhado de react-query (baixo
// atrito entre agentes). Escrita é toda por callable (cadastrar/encerrar/
// definirCondicao) — o container invoca e refaz a leitura.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  getLeelaDb,
  listParceriasAssessoria,
  listarEventosDoOrganizador,
} from '@leela/api-client';
import type { Evento, ParceriaAssessoria } from '@leela/core';

export interface AsyncData<T> {
  data: T;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/** Lista as parcerias de assessoria do tenant (S1803). */
export function useParceriasAssessoria(tenantId: string | null): AsyncData<ParceriaAssessoria[]> {
  const [data, setData] = useState<ParceriaAssessoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    let ativo = true;
    setLoading(true);
    setError(null);
    listParceriasAssessoria(getLeelaDb(), tenantId)
      .then((lista) => {
        if (ativo) setData(lista);
      })
      .catch((err: unknown) => {
        if (ativo) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [tenantId, nonce]);

  return { data, loading, error, refetch };
}

/**
 * Eventos do organizador para o seletor da condição de desconto (S1802 — o
 * cupom nasce num evento do PRÓPRIO tenant). Reuso da query existente.
 */
export function useEventosDoOrganizador(
  tenantId: string | null,
  organizadorId: string | null
): AsyncData<Evento[]> {
  const [data, setData] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!tenantId || !organizadorId) {
      setLoading(false);
      return;
    }
    let ativo = true;
    setLoading(true);
    setError(null);
    listarEventosDoOrganizador(getLeelaDb(), { tenantId, organizadorId })
      .then((lista) => {
        if (ativo) setData(lista);
      })
      .catch((err: unknown) => {
        if (ativo) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, [tenantId, organizadorId, nonce]);

  return { data, loading, error, refetch };
}
