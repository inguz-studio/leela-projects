// =============================================================================
// Sessão do super-admin para as telas de plataforma.
//
// Lê o custom claim `role` (setado server-side) para decidir acesso:
//   - platform_admin → opera todas as telas de plataforma;
//   - tenant_owner   → só leitura do editor de termos (RN-404);
//   - qualquer outro → 403 (PlatformGuard).
//
// Escopo LOCAL ao módulo de plataforma de propósito: este hook resolve um
// contrato PRÓPRIO (decide por `role`), não é cópia do `useTenantSession`
// (LEELA-DEBT-T1) — que resolve `tenantId`. Por isso não foi unificado com ele.
//
// -----------------------------------------------------------------------------
// Por que resolve de forma RESILIENTE (LEELA-DEBT-REV · irmão do `711af42`)
// -----------------------------------------------------------------------------
// Contrato diferente, MESMO modo de falha. A versão original fazia
// `getClaims().then(...)` SEM forceRefresh e SEM catch, e a review antagonista da
// DEBT-SWEEP achou aqui a última porta do painel nesse estado (as cinco
// tenant-scoped e a `overview` já tinham sido blindadas). Dois desfechos ruins
// vinham daí:
//
//   1) REJEIÇÃO de `getClaims` nunca chamava `setSession` → `status` ficava
//      'loading' para sempre → `PlatformGuard` pintava Skeleton eterno, sem erro
//      no console e sem caminho de saída. É o skeleton eterno de Clubes
//      (LEELA-CLUBES-FIX) numa área que ninguém tinha auditado.
//   2) Sob o `preview-seed` (que seta o claim e em seguida REVOGA os refresh
//      tokens) o primeiro ID token pode chegar SEM `role`. O guard então
//      respondia 403 a um admin de verdade — resposta errada e definitiva, que
//      é pior que o skeleton porque parece deliberada.
//
// Estratégia (a mesma de `lib/session/tenantSession.ts` e de `overview`): tenta
// o token em cache (barato); se vier SEM `role` ou se FALHAR, força um refresh
// (`getClaims(true)`). Em qualquer desfecho a sessão sai de 'loading' para um
// estado TERMINAL: com o papel recuperado, ou autenticada sem papel — e aí o
// 403 do guard é uma resposta honesta, não um efeito colateral de rede.
// =============================================================================

import { useEffect, useState } from 'react';
import { getClaims, onSessionChange } from '@leela/api-client';
import type { AuthClaims, Role } from '@leela/core';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

export interface PlatformSession {
  status: SessionStatus;
  uid: string | null;
  role: Role | null;
  /** true quando role === 'platform_admin' (RN-401). */
  isAdmin: boolean;
}

/** Lê o `role` do token; `force` refaz o ID token (pega claim recém-setado). */
async function lerRole(force: boolean): Promise<Role | null> {
  const claims = (await getClaims(force)) as AuthClaims | null;
  return claims?.role ?? null;
}

/** Monta o estado terminal a partir do papel resolvido (`isAdmin` deriva dele). */
function sessaoDe(uid: string, role: Role | null): PlatformSession {
  return { status: 'authenticated', uid, role, isAdmin: role === 'platform_admin' };
}

/** Cache → refresh forçado → terminal sem papel. Nunca fica em 'loading'. */
async function resolverSessao(uid: string): Promise<PlatformSession> {
  try {
    let role = await lerRole(false);
    if (!role) role = await lerRole(true);
    return sessaoDe(uid, role);
  } catch {
    // Cache falhou (ex.: token defasado pós-revoke) → uma última tentativa forçada.
    try {
      return sessaoDe(uid, await lerRole(true));
    } catch {
      // Token irrecuperável (refresh token revogado). NÃO trava em loading:
      // autenticado sem papel → o guard responde 403, que é honesto e acionável.
      return sessaoDe(uid, null);
    }
  }
}

/**
 * Observa a sessão Firebase e extrai `uid` + `role` (do custom claim).
 * `isAdmin` deriva de `role` — o guard de rota usa esse booleano.
 */
export function usePlatformSession(): PlatformSession {
  const [session, setSession] = useState<PlatformSession>({
    status: 'loading',
    uid: null,
    role: null,
    isAdmin: false,
  });

  useEffect(() => {
    let ativo = true;
    const unsub = onSessionChange((user) => {
      if (!user) {
        if (ativo) {
          setSession({ status: 'anonymous', uid: null, role: null, isAdmin: false });
        }
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
