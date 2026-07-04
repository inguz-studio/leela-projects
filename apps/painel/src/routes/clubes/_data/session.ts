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
