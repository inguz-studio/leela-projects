// =============================================================================
// Sessão do organizador para as telas de evento (uid + tenantId).
//
// Escopo LOCAL ao módulo de eventos de propósito: um SessionProvider global é
// uma preocupação transversal compartilhada por 4 agentes em paralelo — evitar
// tocá-la aqui. Quando existir, este hook deve passar a consumi-lo.
// =============================================================================

import { useEffect, useState } from 'react';
import { getClaims, onSessionChange } from '@leela/api-client';
import type { AuthClaims } from '@leela/core';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

export interface EventosSession {
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
 * Resolve a sessão de forma RESILIENTE, sem NUNCA travar em 'loading'
 * (hardening irmão do LEELA-CLUBES-FIX `711af42`).
 *
 * A rota de eventos é tenant-scoped: as queries do hub/detalhe exigem o claim
 * `tenantId` (ADR-009). Sob o preview-seed, que seta o claim e logo REVOGA os
 * refresh tokens (revokeRefreshTokens), o primeiro ID token que o cliente vê
 * pode (a) ainda não carregar o `tenantId` ou (b) falhar ao refrescar. A versão
 * antiga fazia `getClaims().then(...)` SEM forceRefresh e SEM catch: uma
 * REJEIÇÃO deixava `setSession` sem ser chamado e a sessão presa em 'loading'
 * PARA SEMPRE (a query fica `enabled:false`, nunca resolve nem rejeita) →
 * skeleton eterno, sem erro no console.
 *
 * Estratégia: tenta o token em cache (barato); se vier SEM `tenantId` ou se
 * FALHAR, força um refresh (getClaims(true)). Em qualquer desfecho a sessão sai
 * de 'loading' para um estado TERMINAL: com o tenant recuperado, ou autenticada
 * sem tenant (o consumidor mostra erro honesto — nunca skeleton eterno).
 */
async function resolverSessao(uid: string): Promise<EventosSession> {
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
 * Observa a sessão Firebase e extrai `uid` + `tenantId` (do custom claim).
 * `tenantId` é obrigatório para toda query tenant-scoped (ADR-009).
 */
export function useEventosSession(): EventosSession {
  const [session, setSession] = useState<EventosSession>({
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
