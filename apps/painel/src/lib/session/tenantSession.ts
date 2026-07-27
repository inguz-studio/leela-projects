// =============================================================================
// Sessão TENANT-SCOPED do painel — UMA implementação (LEELA-DEBT-T1).
//
// Antes desta unificação, cinco módulos (`eventos`, `clubes`,
// `clubes/assessorias`, `crm`, `eventos/repasses`) carregavam a MESMA função
// palavra por palavra, cada um sob um nome próprio (`useEventosSession`,
// `useClubesSession`, …). O comentário de cada cópia dizia a mesma coisa:
// "um SessionProvider global é preocupação transversal de vários agentes em
// paralelo — quando existir, este hook passa a consumi-lo". Ele existe agora e
// é este arquivo. Cinco cópias significavam cinco lugares para um hardening de
// autenticação ser esquecido; o hardening abaixo (`711af42`) precisou ser
// aplicado cinco vezes, e a sexta rota nova nasceria com a sexta cópia.
//
// O que este hook NÃO é: não substitui as sessões de forma DIFERENTE —
// `overview` (soma `nome` + `role`), `plataforma` (decide por `role`),
// `marcas` (owner-only, só `uid`) e o rodapé do shell (só nome + foto) seguem
// nos próprios módulos porque resolvem contratos distintos, não cópias deste.
//
// -----------------------------------------------------------------------------
// Por que resolve de forma RESILIENTE (LEELA-CLUBES-FIX `711af42`)
// -----------------------------------------------------------------------------
// Toda leitura tenant-scoped exige o claim `tenantId` (ADR-009). O preview-seed
// seta o claim e em seguida REVOGA os refresh tokens (revokeRefreshTokens), de
// modo que o primeiro ID token que o cliente vê pode (a) ainda não carregar o
// `tenantId` (token defasado) ou (b) falhar ao refrescar. A versão original
// fazia `getClaims().then(...)` SEM forceRefresh e SEM catch: uma REJEIÇÃO
// deixava `setSession` sem ser chamado e a sessão presa em 'loading' PARA
// SEMPRE — as queries ficam `enabled:false`, nunca resolvem nem rejeitam →
// skeleton eterno, sem erro no console.
//
// Estratégia: tenta o token em cache (barato); se vier SEM `tenantId` ou se
// FALHAR, força um refresh (`getClaims(true)`) — o mesmo padrão que o doc de
// getClaims recomenda após mudança de claim. Em qualquer desfecho a sessão sai
// de 'loading' para um estado TERMINAL: com o tenant recuperado, ou autenticada
// sem tenant (a tela mostra erro honesto e acionável — nunca skeleton eterno).
// =============================================================================

import { useEffect, useState } from 'react';
import { getClaims, onSessionChange } from '@leela/api-client';
import type { AuthClaims } from '@leela/core';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

/** Sessão de um módulo tenant-scoped: quem é (uid) e sob qual tenant (claim). */
export interface TenantSession {
  status: SessionStatus;
  uid: string | null;
  tenantId: string | null;
}

/** Lê o `tenantId` do token; `force` refaz o ID token (pega claim recém-setado). */
async function lerTenantId(force: boolean): Promise<string | null> {
  const claims = (await getClaims(force)) as AuthClaims | null;
  return claims?.tenantId ?? null;
}

/** Cache → refresh forçado → terminal sem tenant. Nunca fica em 'loading'. */
async function resolverSessao(uid: string): Promise<TenantSession> {
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
export function useTenantSession(): TenantSession {
  const [session, setSession] = useState<TenantSession>({
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
