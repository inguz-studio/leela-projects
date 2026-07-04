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
      void getClaims().then((claims) => {
        if (!ativo) return;
        const tenantId = (claims as AuthClaims | null)?.tenantId ?? null;
        setSession({ status: 'authenticated', uid: user.uid, tenantId });
      });
    });
    return () => {
      ativo = false;
      unsub();
    };
  }, []);

  return session;
}
