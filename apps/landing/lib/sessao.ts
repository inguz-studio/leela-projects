'use client';
// =============================================================================
// apps/landing/lib/sessao.ts — a sessão vista de dentro da landing (S1221-T1).
//
// A landing não tinha autenticação nenhuma até aqui: a única sessão existente
// era a ANÔNIMA que o checkout cria para poder invocar callables
// (`CheckoutFlow.tsx` · `loginAnonimo`). A área do cliente (RN-451) exige o
// oposto disso — sessão NOMEADA —, e as duas convivem no mesmo `Auth` do
// Firebase, no mesmo navegador, muitas vezes na mesma pessoa (quem comprou
// como anônimo e depois entrou).
//
// Por isso `nomeado` é um campo próprio e NÃO é `usuario !== null`: um uid
// anônimo é uma sessão de verdade para o SDK e seria aceito por qualquer
// guarda escrita como "tem usuário?". RN-451, primeira linha: "sessão anônima
// do checkout não é sessão de área do cliente".
//
// `carregando` também é próprio, e é o estado INICIAL: o `onAuthStateChanged`
// resolve de forma assíncrona a partir da persistência local, então tratar o
// primeiro render como "deslogado" faria o header piscar "Entrar" para quem
// já está dentro (e uma guarda de rota expulsaria a pessoa antes de saber).
// =============================================================================

import { useEffect, useState } from 'react';
import { onSessionChange } from '@leela/api-client';
import { ensureLeela } from '@/lib/leelaClient';

export interface SessaoLanding {
  /** O SDK ainda não respondeu quem é. Nem entrou, nem está fora. */
  carregando: boolean;
  /** Sessão NOMEADA (e-mail/senha ou provedor) — anônima não conta. */
  nomeado: boolean;
  uid: string | null;
  email: string | null;
  /** `displayName` quando existe; nunca inventado a partir do e-mail. */
  nome: string | null;
  /**
   * O vínculo entre conta e compra exige e-mail verificado
   * (`contaSemFriccao.ts`), então a área do cliente precisa distinguir
   * "não verificou" de "não comprou" — e a RN-451 proíbe mostrar lista vazia
   * no lugar do estado honesto.
   */
  emailVerificado: boolean;
}

export const SESSAO_INICIAL: SessaoLanding = {
  carregando: true,
  nomeado: false,
  uid: null,
  email: null,
  nome: null,
  emailVerificado: false,
};

/**
 * Assina o estado de autenticação do navegador. Chamar só de Client Component
 * — `ensureLeela()` inicializa o SDK no cliente e nunca no build.
 */
export function useSessaoLeela(): SessaoLanding {
  const [sessao, setSessao] = useState<SessaoLanding>(SESSAO_INICIAL);

  useEffect(() => {
    ensureLeela();
    const cancelar = onSessionChange((user) => {
      if (user === null || user.isAnonymous) {
        setSessao({ ...SESSAO_INICIAL, carregando: false });
        return;
      }
      setSessao({
        carregando: false,
        nomeado: true,
        uid: user.uid,
        email: user.email,
        nome: user.displayName,
        emailVerificado: user.emailVerified,
      });
    });
    return cancelar;
  }, []);

  return sessao;
}

/**
 * Primeiro nome, ou o e-mail quando a conta ainda não tem nome (a conta criada
 * pelo `contaSemFriccao` nasce sem `displayName`). Nunca devolve string vazia:
 * um botão de conta sem rótulo é um alvo invisível para teclado e leitor.
 */
export function rotuloDaConta(sessao: SessaoLanding): string {
  const nome = sessao.nome?.trim() ?? '';
  if (nome.length > 0) return nome.split(/\s+/)[0] ?? nome;
  const email = sessao.email?.trim() ?? '';
  if (email.length > 0) return email;
  return 'Minha conta';
}
