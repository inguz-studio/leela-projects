// =============================================================================
// Data hook da aba VENDAS da ficha do tenant (ADMIN-VISAO onda 2 · S1613-T2).
//
// A ESPINHA É O PAGAMENTO, e a escolha é de segurança de dinheiro. As duas
// leituras da onda 1 (`listarPedidosDoTenantPaginado` e
// `listarPagamentosDoTenantPaginado`) paginam por cursor em coleções
// DIFERENTES, e nem todo pedido tem cobrança (`pagamentoRef: null` enquanto a
// Function do checkout não criou). Paginar as duas em lockstep e casar por
// posição faria as janelas desalinharem na primeira ausência — e uma linha com
// o pagamento errado (ou sem pagamento) exibiria célula vazia por um motivo
// DIFERENTE do que o rótulo diz. A RN-537 proíbe exatamente essa confusão.
//
// Então: a página vem de `listarPagamentosDoTenantPaginado` (o doc que carrega
// `conciliacao`) e o pedido de cada linha vem de `getPedido` pelo
// `pedidoRef` — leitura por id, sem ambiguidade. O custo é assumido e
// declarado: até 20 leituras de doc por página, numa tela de back-office. É o
// mesmo tipo de fan-out já em uso e justificado no gateway
// (`repassesFilaAdminQuery`, `estornos`), e é O(1) por linha em vez de O(N)
// por tenant.
//
// Consequência que fica escrita: pedido SEM cobrança não aparece nesta aba.
// Isso é a definição de venda no modelo — enquanto não há `pagamentos/{id}`,
// não houve cobrança nenhuma. A aba não inventa linha para um checkout que
// não chegou a cobrar.
//
// POR QUE useState E NÃO O GATEWAY react-query: a mesma razão de
// `plataforma/_data/listasGlobais.ts` — o gateway modela lista COMPLETA por
// chave e esta leitura é por CURSOR com "carregar mais" (append). Este arquivo
// REPETE aquele molde (guarda `ativo`, `chaveDoRecorte` reiniciando a
// paginação, contrato `ListaGlobalState`) em vez de inventar um segundo padrão
// de paginação. O motor não é importado porque `useListaPaginada` é interno
// daquele módulo e ele fica fora do território desta lane; o TIPO do contrato,
// esse sim, vem de lá.
// =============================================================================

import { useCallback, useEffect, useState } from 'react';
import {
  getLeelaDb,
  getPedido,
  listarPagamentosDoTenantPaginado,
  type TenantVendasCursor,
} from '@leela/api-client';
import type { Pagamento, Pedido } from '@leela/core';
import type { ListaGlobalState } from '../../_data/listasGlobais';

/**
 * Uma linha da aba Vendas: a cobrança (onde mora o dinheiro carimbado) e o
 * pedido dela (onde moram o código e o responsável).
 *
 * `pedido: null` é honesto e visível: significa que o doc do pedido não pôde
 * ser lido. Nenhuma cifra depende dele — as duas colunas de economia saem do
 * `pagamento`, então a falta do pedido nunca vira número errado.
 */
export interface VendaDoTenant {
  pagamento: Pagamento;
  pedido: Pedido | null;
}

/** Uma página de vendas: cobranças + os pedidos correspondentes. */
async function paginaDeVendas(
  tenantId: string,
  cursor: TenantVendasCursor | undefined
): Promise<{ itens: VendaDoTenant[]; proxCursor: TenantVendasCursor | null }> {
  const db = getLeelaDb();
  const pagina = await listarPagamentosDoTenantPaginado(
    db,
    tenantId,
    cursor ? { cursor } : {}
  );

  const pedidos = await Promise.all(
    pagina.itens.map((pagamento) =>
      // A falha de UM pedido não derruba a página inteira de dinheiro: a linha
      // aparece sem código e sem responsável, com as cifras intactas.
      getPedido(db, pagamento.pedidoRef).catch(() => null)
    )
  );

  return {
    itens: pagina.itens.map((pagamento, i) => ({
      pagamento,
      pedido: pedidos[i] ?? null,
    })),
    proxCursor: pagina.proxCursor,
  };
}

/**
 * As vendas de um tenant, paginadas por cursor. Contrato idêntico ao das
 * listas globais — o contador honesto sai de `temMais` e nunca de um total
 * que a query jamais computou.
 */
export function useVendasDoTenant(tenantId: string): ListaGlobalState<VendaDoTenant> {
  const [itens, setItens] = useState<VendaDoTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<TenantVendasCursor | null>(null);
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
    if (tenantId === '') {
      setLoading(false);
      return;
    }
    paginaDeVendas(tenantId, undefined)
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
  }, [tenantId, nonce]);

  const carregarMais = useCallback(() => {
    if (cursor === null || loadingMore) return;
    let ativo = true;
    setLoadingMore(true);
    paginaDeVendas(tenantId, cursor)
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
  }, [tenantId, cursor, loadingMore]);

  return { itens, loading, loadingMore, error, temMais, carregarMais, refetch };
}
