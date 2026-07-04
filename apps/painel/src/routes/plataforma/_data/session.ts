// =============================================================================
// Sessão do super-admin para as telas de plataforma.
//
// Lê o custom claim `role` (setado server-side) para decidir acesso:
//   - platform_admin → opera todas as telas de plataforma;
//   - tenant_owner   → só leitura do editor de termos (RN-404);
//   - qualquer outro → 403 (PlatformGuard).
//
// Escopo LOCAL ao módulo de plataforma de propósito (mesmo racional do módulo
// de eventos): um SessionProvider global é preocupação transversal de 4 agentes
// em paralelo — quando existir, este hook deve passar a consumi-lo.
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
      void getClaims().then((claims) => {
        if (!ativo) return;
        const role = (claims as AuthClaims | null)?.role ?? null;
        setSession({
          status: 'authenticated',
          uid: user.uid,
          role,
          isAdmin: role === 'platform_admin',
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
