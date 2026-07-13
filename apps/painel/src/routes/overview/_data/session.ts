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

/** Lê os claims do token; `force` refaz o ID token (pega claim recém-setado). */
async function lerClaims(force: boolean): Promise<AuthClaims | null> {
  return (await getClaims(force)) as AuthClaims | null;
}

/**
 * Resolve a sessão de forma RESILIENTE, sem NUNCA travar em 'loading'
 * (hardening irmão do LEELA-CLUBES-FIX `711af42`).
 *
 * Embora `getOverview` seja callable server-side (deriva o tenant de
 * context.auth, e por isso a Visão Geral escapava do bug de clubes), este hook
 * ainda expõe `tenantId`/`role` do claim para a UI (distingue staff sem eventos
 * de produtor sem eventos — E02-L1). A versão antiga fazia `getClaims().then()`
 * SEM forceRefresh e SEM catch: sob o preview-seed (que seta o claim e logo
 * REVOGA os refresh tokens), uma REJEIÇÃO deixaria a sessão presa em 'loading'
 * para sempre. Blindamos aqui pela MESMA razão que clubes — um ponto de falha
 * latente a menos.
 *
 * `nome` sai do Firebase `user.displayName` (não do claim) e é preservado em
 * todos os desfechos; `tenantId`/`role` vêm do claim recuperado (cache → refresh
 * forçado → terminal sem tenant). A sessão sempre sai de 'loading'.
 */
async function resolverSessao(uid: string, nome: string | null): Promise<OverviewSession> {
  try {
    let claims = await lerClaims(false);
    if (!claims?.tenantId) claims = await lerClaims(true);
    return {
      status: 'authenticated',
      uid,
      tenantId: claims?.tenantId ?? null,
      nome,
      role: claims?.role ?? null,
    };
  } catch {
    // Cache falhou (ex.: token defasado pós-revoke) → uma última tentativa forçada.
    try {
      const claims = await lerClaims(true);
      return {
        status: 'authenticated',
        uid,
        tenantId: claims?.tenantId ?? null,
        nome,
        role: claims?.role ?? null,
      };
    } catch {
      // Token irrecuperável (refresh token revogado). NÃO trava em loading:
      // autenticado sem tenant/role → a UI degrada honestamente (saudação
      // genérica, sem distinção de papel), nunca skeleton eterno.
      return { status: 'authenticated', uid, tenantId: null, nome, role: null };
    }
  }
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
      void resolverSessao(user.uid, user.displayName ?? null).then((next) => {
        if (ativo) setSession(next);
      });
    });
    return () => {
      ativo = false;
      unsub();
    };
  }, []);

  return session;
}
