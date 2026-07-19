// =============================================================================
// Data hooks do CRM (E19 · S-R9-13 · RN-172). Leitura tenant-scoped DIRETA
// (getLeelaDb + readers de `packages/api-client/src/crm.ts`) com refetch
// manual e paginação por CURSOR (o reader não expõe página numérica — o modelo
// é cursor estável). Escopo LOCAL ao módulo (mesmo racional de
// assessorias/_data): sem tocar o registry compartilhado de react-query.
//
// ZERO varredura no cliente (RN-820/A4): a lista pagina pelo cursor do reader
// (clamp [1,100] no servidor) e o detalhe é 1 point read. A busca é por
// PREFIXO de nome (reader com teto de 50). Nada é filtrado sobre a coleção
// inteira no browser.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  buscarCrmClientesPorNome,
  getCrmCliente,
  getLeelaDb,
  listarCrmClientes,
  type CrmCliente,
  type CrmClientesCursor,
  type CrmClientesOrdem,
} from '@leela/api-client';

export interface ListaClientesState {
  itens: CrmCliente[];
  /** Carregamento da PRIMEIRA página (ou troca de ordenação/refetch). */
  loading: boolean;
  /** Carregamento de uma página adicional (mantém a lista visível). */
  loadingMore: boolean;
  error: Error | null;
  /** Há próxima página (proxCursor !== null). */
  temMais: boolean;
  carregarMais: () => void;
  refetch: () => void;
}

/**
 * Lista paginada de clientes do tenant, ordenada por `ordem` (LTV default).
 * Trocar `ordem` reinicia a paginação. `carregarMais` anexa a próxima página
 * (append — coerente com o cursor, sem página numérica que o modelo não dá).
 */
export function useCrmClientes(
  tenantId: string | null,
  ordem: CrmClientesOrdem
): ListaClientesState {
  const [itens, setItens] = useState<CrmCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<CrmClientesCursor | null>(null);
  const [temMais, setTemMais] = useState(false);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  // Primeira página (e reset em troca de ordem/refetch).
  useEffect(() => {
    if (!tenantId) {
      // Sem tenant a tela mostra o estado 'sem organizador'/skeleton de sessão;
      // MANTER loading=true (init) evita um flash de EmptyState antes do 1º
      // fetch quando o tenantId chega (o nó do EmptyState destacaria = flicker).
      return;
    }
    let ativo = true;
    setLoading(true);
    setError(null);
    setItens([]);
    setCursor(null);
    setTemMais(false);
    listarCrmClientes(getLeelaDb(), tenantId, { ordem })
      .then((r) => {
        if (!ativo) return;
        setItens(r.itens);
        setCursor(r.proxCursor);
        setTemMais(r.proxCursor !== null);
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
  }, [tenantId, ordem, nonce]);

  const carregarMais = useCallback(() => {
    if (!tenantId || cursor === null || loadingMore) return;
    let ativo = true;
    setLoadingMore(true);
    listarCrmClientes(getLeelaDb(), tenantId, { ordem, cursor })
      .then((r) => {
        if (!ativo) return;
        setItens((atual) => [...atual, ...r.itens]);
        setCursor(r.proxCursor);
        setTemMais(r.proxCursor !== null);
      })
      .catch((err: unknown) => {
        if (ativo) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (ativo) setLoadingMore(false);
      });
    return () => {
      ativo = false;
    };
  }, [tenantId, ordem, cursor, loadingMore]);

  return { itens, loading, loadingMore, error, temMais, carregarMais, refetch };
}

export interface BuscaClientesState {
  resultados: CrmCliente[];
  buscando: boolean;
  error: Error | null;
}

/**
 * Busca por PREFIXO de nome (reader server-side, teto 50). Termo vazio =
 * sem busca (`ativa=false`) — a tela volta à lista paginada. Debounce fica a
 * cargo do consumidor.
 */
export function useBuscaClientes(
  tenantId: string | null,
  termo: string
): BuscaClientesState & { ativa: boolean } {
  const [resultados, setResultados] = useState<CrmCliente[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const limpo = termo.trim();
  const ativa = limpo.length > 0;

  useEffect(() => {
    if (!tenantId || !ativa) {
      setResultados([]);
      setBuscando(false);
      setError(null);
      return;
    }
    let vivo = true;
    setBuscando(true);
    setError(null);
    buscarCrmClientesPorNome(getLeelaDb(), tenantId, limpo)
      .then((r) => {
        if (vivo) setResultados(r);
      })
      .catch((err: unknown) => {
        if (vivo) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (vivo) setBuscando(false);
      });
    return () => {
      vivo = false;
    };
  }, [tenantId, limpo, ativa]);

  return { resultados, buscando, error, ativa };
}

export interface ClienteDetalheState {
  cliente: CrmCliente | null;
  /** true quando o reader devolveu null (doc inexistente/expurgado). */
  naoEncontrado: boolean;
  loading: boolean;
  error: Error | null;
}

/** Detalhe de UM cliente (1 point read — histórico consolidado no doc). */
export function useCrmClienteDetalhe(
  tenantId: string | null,
  clienteKey: string | undefined
): ClienteDetalheState {
  const [cliente, setCliente] = useState<CrmCliente | null>(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!tenantId || !clienteKey) {
      // Idem lista: manter loading=true evita flash transitório de
      // "não encontrado" antes do 1º point read quando o tenantId chega.
      return;
    }
    let vivo = true;
    setLoading(true);
    setError(null);
    setNaoEncontrado(false);
    getCrmCliente(getLeelaDb(), tenantId, clienteKey)
      .then((c) => {
        if (!vivo) return;
        setCliente(c);
        setNaoEncontrado(c === null);
      })
      .catch((err: unknown) => {
        if (vivo) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (vivo) setLoading(false);
      });
    return () => {
      vivo = false;
    };
  }, [tenantId, clienteKey]);

  return { cliente, naoEncontrado, loading, error };
}
