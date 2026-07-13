// =============================================================================
// Sessão do profissional para as telas de clube (uid + tenantId).
//
// Escopo LOCAL ao módulo de clubes de propósito (mesma justificativa de
// eventos/_data/session): um SessionProvider global é preocupação transversal
// de vários agentes em paralelo. Quando existir, este hook passa a consumi-lo.
// =============================================================================

import { useEffect, useState } from 'react';
import { getClaims, onSessionChange } from '@leela/api-client';
import type { AuthClaims } from '@leela/core';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

export interface ClubesSession {
  status: SessionStatus;
  uid: string | null;
  tenantId: string | null;
}

/** Lê o `tenantId` do token; `force` refaz o ID token (pega claim recém-setado). */
async function lerTenantId(force: boolean): Promise<string | null> {
  const claims = (await getClaims(force)) as AuthClaims | null;
  return claims?.tenantId ?? null;
}

/**
 * Resolve a sessão de forma RESILIENTE, sem NUNCA travar em 'loading'.
 *
 * Por que existe (LEELA-CLUBES-FIX): a rota de clubes é 100% client-scoped —
 * depende do claim `tenantId` para montar a query (ADR-009). O preview-seed seta
 * o claim e logo REVOGA os refresh tokens (revokeRefreshTokens), então o token
 * que o cliente vê primeiro pode (a) ainda não carregar o `tenantId` ou (b)
 * falhar ao refrescar. A versão antiga fazia `getClaims().then(...)` SEM
 * forceRefresh e SEM catch: claim ausente virava erro e, pior, uma REJEIÇÃO
 * deixava a sessão presa em 'loading' PARA SEMPRE → skeleton eterno, sem erro
 * no console, com a query em `enabled:false` (nunca resolve nem rejeita). A
 * Visão Geral escapava porque `getOverview` é callable server-side (deriva o
 * tenant de context.auth, não do claim do cliente).
 *
 * Estratégia: tenta o token em cache (barato); se vier SEM `tenantId` ou se
 * FALHAR, força um refresh (getClaims(true)) — o mesmo padrão que o doc de
 * getClaims recomenda após mudança de claim. Em qualquer desfecho a sessão sai
 * de 'loading' para um estado TERMINAL: com o tenant recuperado, ou autenticada
 * sem tenant (o consumidor mostra erro honesto e acionável — nunca skeleton).
 */
async function resolverSessao(uid: string): Promise<ClubesSession> {
  try {
    let tenantId = await lerTenantId(false);
    if (!tenantId) tenantId = await lerTenantId(true);
    return { status: 'authenticated', uid, tenantId };
  } catch {
    // Cache falhou (ex.: token defasado pós-revoke) → uma última tentativa forçada.
    try {
      const tenantId = await lerTenantId(true);
      return { status: 'authenticated', uid, tenantId };
    } catch {
      // Token irrecuperável (refresh token revogado). NÃO trava em loading:
      // autenticado sem tenant → a tela mostra erro honesto, não skeleton eterno.
      return { status: 'authenticated', uid, tenantId: null };
    }
  }
}

/**
 * Observa a sessão Firebase e extrai `uid` + `tenantId` (custom claim).
 * `tenantId` é obrigatório para toda query tenant-scoped (ADR-009).
 */
export function useClubesSession(): ClubesSession {
  const [session, setSession] = useState<ClubesSession>({
    status: 'loading',
    uid: null,
    tenantId: null,
  });

  useEffect(() => {
    let ativo = true;
    const unsub = onSessionChange((user) => {
      if (!user) {
        if (ativo) setSession({ status: 'anonymous', uid: null, tenantId: null });
        return;
      }
      void resolverSessao(user.uid).then((next) => {
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
