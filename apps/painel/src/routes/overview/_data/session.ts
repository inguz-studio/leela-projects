// =============================================================================
// Sessão do produtor para a Visão Geral (uid + tenantId + nome de exibição).
//
// Escopo LOCAL ao módulo (como em eventos/clubes): um SessionProvider global é
// preocupação transversal de vários agentes — não tocar aqui. O `nome` sai do
// Firebase `user.displayName` (AuthClaims não carrega nome) e alimenta a
// saudação (S600-T1); null quando ausente → saudação genérica.
// =============================================================================

import { useEffect, useState } from 'react';
import { getClaims, onSessionChange } from '@leela/api-client';
import type { AuthClaims, Role } from '@leela/core';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

export interface OverviewSession {
  status: SessionStatus;
  uid: string | null;
  tenantId: string | null;
  nome: string | null;
  /** Papel do token — o dashboard é agregado por INDIVÍDUO (decisão E02-L1),
   *  então a UI distingue staff sem eventos próprios de produtor sem eventos. */
  role: Role | null;
}

/** Observa a sessão Firebase e extrai uid + tenantId (claim) + nome (displayName). */
export function useOverviewSession(): OverviewSession {
  const [session, setSession] = useState<OverviewSession>({
    status: 'loading',
    uid: null,
    tenantId: null,
    nome: null,
    role: null,
  });

  useEffect(() => {
    let ativo = true;
    const unsub = onSessionChange((user) => {
      if (!user) {
        if (ativo) {
          setSession({ status: 'anonymous', uid: null, tenantId: null, nome: null, role: null });
        }
        return;
      }
      void getClaims().then((claims) => {
        if (!ativo) return;
        const parsed = claims as AuthClaims | null;
        setSession({
          status: 'authenticated',
          uid: user.uid,
          tenantId: parsed?.tenantId ?? null,
          nome: user.displayName ?? null,
          role: parsed?.role ?? null,
        });
      });
    });
    return () => {
      ativo = false;
      unsub();
    };
  }, []);

  return session;
}
