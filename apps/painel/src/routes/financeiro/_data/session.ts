// =============================================================================
// Sessão do organizador para as telas de REPASSE (uid + tenantId).
//
// Escopo LOCAL ao módulo de financeiro, mesmo racional de eventos/clubes/
// plataforma: um SessionProvider global é preocupação transversal de vários
// agentes em paralelo — quando existir, este hook deve passar a consumi-lo.
// `tenantId` é obrigatório para toda leitura tenant-scoped do repasse (ADR-009).
// =============================================================================

import { useEffect, useState } from 'react';
import { getClaims, onSessionChange } from '@leela/api-client';
import type { AuthClaims } from '@leela/core';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

export interface FinanceiroSession {
  status: SessionStatus;
  uid: string | null;
  tenantId: string | null;
}

/**
 * Observa a sessão Firebase e extrai `uid` + `tenantId` (do custom claim).
 * `tenantId` alimenta as leituras `tenants/{tid}/saldo|dadosBancarios|repasses`.
 */
export function useFinanceiroSession(): FinanceiroSession {
  const [session, setSession] = useState<FinanceiroSession>({
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
