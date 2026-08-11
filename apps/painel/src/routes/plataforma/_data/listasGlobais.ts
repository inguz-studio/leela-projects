// =============================================================================
// Data hooks das LISTAS GLOBAIS do painel master (ADMIN-VISAO onda 4 ·
// S1614-T2/T3). Consomem os readers que a ONDA 1 já entregou e provou —
// `listarEventosGlobalPaginado` / `listarClubesGlobalPaginado` para o sistema
// inteiro, `listarEventosDoTenantPaginado` / `listarClubesDoTenantPaginado`
// quando o recorte é um tenant. Nada de query nova aqui.
//
// POR QUE useState E NÃO O GATEWAY react-query. As telas de plataforma leem
// pelo gateway (`lib/query`), mas o gateway modela lista COMPLETA por chave; a
// leitura desta onda é por CURSOR e a UI é "carregar mais" (append). O molde
// que já resolve isso no repositório é o hook do CRM
// (`routes/crm/_data/clientes.ts`), e é ele que este módulo repete — mesmo
// contrato `{itens, loading, loadingMore, error, temMais, carregarMais,
// refetch}`, mesma guarda `ativo` contra resposta de requisição obsoleta.
// Reescrever isso em `useInfiniteQuery` seria um segundo padrão de paginação
// no mesmo app para o mesmo trabalho.
//
// ZERO varredura no cliente: a página vem do reader (clamp [1,100]) e o filtro
// vai no `where` do servidor. Trocar de recorte reinicia a paginação — anexar
// página de um recorte na lista de outro produziria um contador que não bate
// com nada.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  getLeelaDb,
  listarClubesGlobalPaginado,
  listarClubesDoTenantPaginado,
  listarEventosGlobalPaginado,
  listarEventosDoTenantPaginado,
  type ListaGlobalCursor,
} from '@leela/api-client';
import type { Clube, Evento, StatusEvento } from '@leela/core';

/** Estado de uma lista global paginada por cursor. */
export interface ListaGlobalState<T> {
  itens: T[];
  /** Primeira página (ou troca de recorte / refetch). */
  loading: boolean;
  /** Página adicional — a lista já visível permanece na tela. */
  loadingMore: boolean;
  error: Error | null;
  /** Há próxima página (`proxCursor !== null`). Fonte do contador honesto. */
  temMais: boolean;
  carregarMais: () => void;
  refetch: () => void;
}

/**
 * Uma página de qualquer das quatro leituras — o formato `{itens, proxCursor}`
 * é o contrato comum que a onda 1 deu aos quatro readers.
 */
type PaginaDe<T> = (cursor: ListaGlobalCursor | undefined) => Promise<{
  itens: T[];
  proxCursor: ListaGlobalCursor | null;
}>;

/**
 * O motor das duas listas. `chaveDoRecorte` é o que reinicia a paginação:
 * mudou o recorte, a lista zera e o cursor vai junto.
 */
function useListaPaginada<T>(pagina: PaginaDe<T>, chaveDoRecorte: string): ListaGlobalState<T> {
  const [itens, setItens] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<ListaGlobalCursor | null>(null);
  const [temMais, setTemMais] = useState(false);
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setError(null);
    setItens([]);
    setCursor(null);
    setTemMais(false);
    pagina(undefined)
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
    // `pagina` fica FORA das dependências de propósito: ela é recriada a cada
    // render (closure sobre o recorte) e entraria em laço. A identidade que
    // importa é `chaveDoRecorte` — mudou o recorte, refaz a página 1.
  }, [chaveDoRecorte, nonce]);

  const carregarMais = useCallback(() => {
    if (cursor === null || loadingMore) return;
    let ativo = true;
    setLoadingMore(true);
    pagina(cursor)
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
  }, [pagina, cursor, loadingMore]);

  return { itens, loading, loadingMore, error, temMais, carregarMais, refetch };
}

export interface RecorteDeEventos {
  /** `undefined` = sem filtro de status. */
  status?: StatusEvento | undefined;
  /** `null`/vazio = sistema inteiro; com valor, lê a lista daquele tenant. */
  tenantId?: string | null | undefined;
}

/**
 * Todos os eventos do sistema (`/plataforma/eventos`), ou os de um tenant.
 *
 * O `platform_admin` cruza a Rule de `eventos` desde sempre
 * (`firestore.rules:744`) — sem Rule nova, sem `collectionGroup`.
 */
export function useEventosGlobais(recorte: RecorteDeEventos = {}): ListaGlobalState<Evento> {
  const tenantId = recorte.tenantId ?? null;
  const status = recorte.status;
  const pagina: PaginaDe<Evento> = (cursor) =>
    tenantId !== null && tenantId !== ''
      ? listarEventosDoTenantPaginado(getLeelaDb(), tenantId, cursor ? { cursor } : {})
      : listarEventosGlobalPaginado(getLeelaDb(), {
          ...(cursor ? { cursor } : {}),
          ...(status ? { status } : {}),
        });
  return useListaPaginada(pagina, `eventos|${tenantId ?? ''}|${status ?? ''}`);
}

export interface RecorteDeClubes {
  tenantId?: string | null | undefined;
}

/**
 * Todos os clubs do sistema (`/plataforma/clubs`), ou os de um tenant.
 * `Clube` não tem campo de status, então aqui o único recorte é o tenant —
 * não existe filtro de status para oferecer e a tela não finge que existe.
 */
export function useClubesGlobais(recorte: RecorteDeClubes = {}): ListaGlobalState<Clube> {
  const tenantId = recorte.tenantId ?? null;
  const pagina: PaginaDe<Clube> = (cursor) =>
    tenantId !== null && tenantId !== ''
      ? listarClubesDoTenantPaginado(getLeelaDb(), tenantId, cursor ? { cursor } : {})
      : listarClubesGlobalPaginado(getLeelaDb(), cursor ? { cursor } : {});
  return useListaPaginada(pagina, `clubes|${tenantId ?? ''}`);
}
