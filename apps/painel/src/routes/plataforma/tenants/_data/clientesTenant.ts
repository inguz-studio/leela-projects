// =============================================================================
// Data hooks da aba CLIENTES da ficha do tenant (ADMIN-VISAO onda 3 ·
// S1612-T6). Dois hooks porque a tela tem DOIS NÍVEIS, e a fronteira entre eles
// é a decisão de desenho da tarefa inteira.
//
// O dono decidiu, na íntegra (ADMINVISAO-2, leva 6 de 11/08): "tem que guardar
// cpf, e-mail, telefone, cidade, endereço, restrições, pedidos, tudo. É a ficha
// geral de clientes, membros, participantes dos clubs, e a visao geral no
// individuo, para analisarmos como organizadores."
//
// A frase tem duas metades e as duas mandam. "Tudo" diz QUAIS campos; "a visão
// geral NO INDIVÍDUO" diz ONDE eles aparecem. Por isso:
//
//   `useClientesDoTenant` — a LISTA, e ela é comportamento e só. Vem de
//   `listarClientesDoTenant` (onda 1), que devolve nome, eventos, inscrições,
//   valor gasto e LTV. Nada de contato, documento ou endereço passa por aqui.
//
//   `useFichaDoCliente` — o INDIVÍDUO, sob gesto explícito. Uma chamada a
//   `obterFichaDoCliente` por pessoa aberta, e cada uma é uma consulta de PII
//   identificada que o servidor REGISTRA em `auditoriaAcessos`.
//
// ⛔ NÃO EXISTE, E NÃO DEVE NASCER, uma versão que abra a ficha da página
// inteira. Uma coluna de CPF na tabela emitiria uma consulta auditada por linha
// só por alguém ter aberto a tela, e transformaria a aba na agenda de contato
// de todos os participantes de todos os produtores — que é o que a RN-540
// recusa quando proíbe saída em massa. A decisão do dono autorizou o CONTEÚDO
// da ficha, não a extração da base. É o mesmo desenho da revelação por linha do
// diretório de contas (V-4), com o drawer no lugar da célula.
//
// POR QUE useState E NÃO O GATEWAY react-query: a mesma razão de
// `plataforma/_data/listasGlobais.ts` e de `tenants/_data/vendas.ts` — o
// gateway modela lista COMPLETA por chave e esta leitura é por CURSOR com
// "carregar mais" (append). Este arquivo REPETE aquele molde (guarda contra
// resposta obsoleta, contrato `ListaGlobalState`) em vez de inventar um
// terceiro padrão de paginação no mesmo app para o mesmo trabalho.
//
// O CURSOR AQUI É UMA STRING. `listarClientesDoTenant` pagina por `clienteKey`
// (o docId do último item da página), não por snapshot do Firestore como os
// readers que rodam pelo client SDK. O contrato de estado é o mesmo; o tipo do
// cursor, não.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getLeelaFunctions,
  listarClientesDoTenant,
  obterFichaDoCliente,
  type ClienteTenantView,
  type FichaDoClienteView,
} from '@leela/api-client';
import type { ListaGlobalState } from '../../_data/listasGlobais';
import { mensagemDaRecusa } from '../../_lib/errors';

// ---------------------------------------------------------------------------
// A lista — comportamento de compra, paginado por cursor
// ---------------------------------------------------------------------------

/**
 * Os clientes de um tenant, paginados pelo `clienteKey`. Contrato idêntico ao
 * das listas globais — o contador honesto sai de `temMais` e nunca de um total
 * que o callable jamais computou.
 */
export function useClientesDoTenant(
  tenantId: string
): ListaGlobalState<ClienteTenantView> {
  const [itens, setItens] = useState<ClienteTenantView[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
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
    listarClientesDoTenant(getLeelaFunctions(), { tenantId })
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
    listarClientesDoTenant(getLeelaFunctions(), { tenantId, cursor })
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

// ---------------------------------------------------------------------------
// A ficha — um indivíduo por gesto (RN-539 / RN-540)
// ---------------------------------------------------------------------------

export interface FichaDoClienteState {
  /** `clienteKey` em foco; null = nenhuma ficha aberta. */
  clienteKey: string | null;
  /**
   * Nome vindo da LINHA, não da resposta. O cabeçalho do drawer precisa dizer
   * de quem é a ficha enquanto a consulta está no ar — sem isso o operador
   * espera sem saber se clicou na pessoa certa.
   */
  nome: string;
  ficha: FichaDoClienteView | null;
  loading: boolean;
  /** Mensagem de operador; null = sem erro a exibir. */
  erro: string | null;
  abrir: (cliente: ClienteTenantView) => void;
  fechar: () => void;
}

/**
 * A ficha de UMA pessoa, aberta por gesto explícito.
 *
 * Cada `abrir` é uma consulta auditada no servidor — por isso ela nasce de um
 * clique e NUNCA da montagem da lista. Não existe versão que abra a página
 * inteira, e não deve nascer uma.
 *
 * A guarda `emFoco` descarta resposta de pessoa que já saiu de foco: sem ela,
 * uma consulta lenta da pessoa A poderia aterrissar no drawer da pessoa B, e o
 * painel exibiria CPF e endereço sob o nome errado. Numa tela de PII isso não é
 * flicker, é dado atribuído à pessoa errada.
 */
export function useFichaDoCliente(tenantId: string): FichaDoClienteState {
  const [clienteKey, setClienteKey] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [ficha, setFicha] = useState<FichaDoClienteView | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const emFoco = useRef<string | null>(null);

  const fechar = useCallback(() => {
    emFoco.current = null;
    setClienteKey(null);
    setFicha(null);
    setErro(null);
    setLoading(false);
  }, []);

  const abrir = useCallback(
    (cliente: ClienteTenantView) => {
      // Já em foco: não repete a consulta. Duas chamadas pela mesma pessoa
      // deixariam dois registros de acesso para um gesto só, e o rastro passaria
      // a contar mais consultas do que houve.
      if (emFoco.current === cliente.clienteKey) return;

      emFoco.current = cliente.clienteKey;
      setClienteKey(cliente.clienteKey);
      setNome(cliente.nome);
      setFicha(null);
      setErro(null);
      setLoading(true);

      obterFichaDoCliente(getLeelaFunctions(), {
        tenantId,
        clienteKey: cliente.clienteKey,
      })
        .then((r) => {
          if (emFoco.current !== cliente.clienteKey) return;
          setFicha(r);
        })
        .catch((err: unknown) => {
          if (emFoco.current !== cliente.clienteKey) return;
          setErro(mensagemDaRecusa(err));
        })
        .finally(() => {
          if (emFoco.current !== cliente.clienteKey) return;
          setLoading(false);
        });
    },
    [tenantId]
  );

  return { clienteKey, nome, ficha, loading, erro, abrir, fechar };
}
