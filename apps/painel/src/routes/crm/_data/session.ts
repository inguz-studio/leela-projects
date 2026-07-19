// =============================================================================
// Sessão do organizador para o CRM (uid + tenantId). Espelho do padrão
// resiliente de `assessorias/_data/session.ts` e `financeiro/_data/session.ts`
// (mesma disciplina de convenção do codebase): a leitura de
// `tenants/{tid}/crmClientes` é tenant-scoped (RN-172) e exige o claim
// `tenantId`. Resolve para um estado TERMINAL — nunca trava em 'loading':
// token em cache; se vier sem `tenantId` ou falhar, força refresh; em qualquer
// desfecho sai autenticado (com tenant, ou sem tenant → erro honesto na tela).
// =============================================================================

import { useEffect, useState } from 'react';
import { getClaims, onSessionChange } from '@leela/api-client';
import type { AuthClaims } from '@leela/core';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

export interface CrmSession {
  status: SessionStatus;
  uid: string | null;
  tenantId: string | null;
}

async function lerTenantId(force: boolean): Promise<string | null> {
  const claims = (await getClaims(force)) as AuthClaims | null;
  return claims?.tenantId ?? null;
}

async function resolverSessao(uid: string): Promise<CrmSession> {
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

/** Observa a sessão Firebase e extrai `uid` + `tenantId` (custom claim). */
export function useCrmSession(): CrmSession {
  const [session, setSession] = useState<CrmSession>({
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
