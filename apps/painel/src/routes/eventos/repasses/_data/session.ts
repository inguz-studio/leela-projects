// =============================================================================
// Sessão do organizador para as telas de REPASSE (uid + tenantId).
//
// Escopo LOCAL à subdivisão de Repasses, mesmo racional de eventos/clubes/
// plataforma: um SessionProvider global é preocupação transversal de vários
// agentes em paralelo — quando existir, este hook deve passar a consumi-lo.
// `tenantId` é obrigatório para toda leitura tenant-scoped do repasse (ADR-009).
//
// Viajou de `routes/financeiro/_data/` para cá na rodada IA-MENU: era
// compartilhado entre a Análise e os Repasses, as duas telas que se separaram.
// A Análise passou a usar o `useCrmSession` (contrato idêntico) que já existia
// no módulo de CRM; este hook seguiu com o Repasse. Nenhuma cópia nova nasceu.
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

/** Lê o `tenantId` do token; `force` refaz o ID token (pega claim recém-setado). */
async function lerTenantId(force: boolean): Promise<string | null> {
  const claims = (await getClaims(force)) as AuthClaims | null;
  return claims?.tenantId ?? null;
}

/**
 * Resolve a sessão de forma RESILIENTE, sem NUNCA travar em 'loading'
 * (hardening irmão do LEELA-CLUBES-FIX `711af42`).
 *
 * A rota de financeiro é tenant-scoped: TODA leitura de repasse/análise exige o
 * claim `tenantId` (ADR-009). Sob o preview-seed, que seta o claim e logo REVOGA
 * os refresh tokens (revokeRefreshTokens), o primeiro ID token que o cliente vê
 * pode (a) ainda não carregar o `tenantId` ou (b) falhar ao refrescar. A versão
 * antiga fazia `getClaims().then(...)` SEM forceRefresh e SEM catch: uma
 * REJEIÇÃO deixava a sessão presa em 'loading' PARA SEMPRE (as queries ficam
 * `enabled:false`, nunca resolvem nem rejeitam) → skeleton eterno, sem erro.
 *
 * Estratégia: tenta o token em cache (barato); se vier SEM `tenantId` ou se
 * FALHAR, força um refresh (getClaims(true)). Em qualquer desfecho a sessão sai
 * de 'loading' para um estado TERMINAL: com o tenant recuperado, ou autenticada
 * sem tenant (o consumidor mostra erro honesto — nunca skeleton eterno).
 */
async function resolverSessao(uid: string): Promise<FinanceiroSession> {
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
