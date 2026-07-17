// =============================================================================
// Sessão do organizador para as telas de ASSESSORIAS parceiras (uid + tenantId).
//
// Escopo LOCAL ao módulo (mesmo racional de financeiro/_data/session.ts): a
// leitura de `tenants/{tid}/parceirosAssessoria` é tenant-scoped (ADR-009) e
// exige o claim `tenantId`. Resolve de forma RESILIENTE — nunca trava em
// 'loading' (irmão do hardening `711af42`): token em cache; se vier sem
// `tenantId` ou falhar, força um refresh; em qualquer desfecho sai para um
// estado TERMINAL (com tenant, ou autenticado sem tenant → erro honesto).
// =============================================================================

import { useEffect, useState } from 'react';
import { getClaims, onSessionChange } from '@leela/api-client';
import type { AuthClaims } from '@leela/core';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AssessoriasSession {
  status: SessionStatus;
  uid: string | null;
  tenantId: string | null;
}

async function lerTenantId(force: boolean): Promise<string | null> {
  const claims = (await getClaims(force)) as AuthClaims | null;
  return claims?.tenantId ?? null;
}

async function resolverSessao(uid: string): Promise<AssessoriasSession> {
  try {
    let tenantId = await lerTenantId(false);
    if (!tenantId) tenantId = await lerTenantId(true);
    return { status: 'authenticated', uid, tenantId };
  } catch {
    try {
      const tenantId = await lerTenantId(true);
      return { status: 'authenticated', uid, tenantId };
    } catch {
      return { status: 'authenticated', uid, tenantId: null };
    }
  }
}

/** Observa a sessão Firebase e extrai `uid` + `tenantId` (do custom claim). */
export function useAssessoriasSession(): AssessoriasSession {
  const [session, setSession] = useState<AssessoriasSession>({
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
