// =============================================================================
// Sessão do super-admin para as telas de plataforma.
//
// Lê o CRACHÁ (custom claims, setado server-side) para decidir acesso:
//   - crachá que concede plataforma → opera todas as telas (RN-401);
//   - qualquer outro                → 403 (PlatformGuard).
//
// "Concede plataforma" tem DUAS pernas desde a lane PAPEL-DUPLO, e quem decide
// é `isPlatformAdmin` do core — nunca este arquivo:
//   - `role === 'platform_admin'` — as contas legadas, sem migração;
//   - `platformAdmin === true`    — a capacidade, que coexiste com o papel
//                                   operacional da conta.
// A segunda perna existe porque `role` é valor ÚNICO: no dia em que o dono
// virou `tenant_owner`, o `platform_admin` dele foi sobrescrito e o painel
// master fechou. Papel diz o que a conta É; capacidade diz o que ela TAMBÉM
// PODE FAZER.
//
// Escopo LOCAL ao módulo de plataforma de propósito: este hook resolve um
// contrato PRÓPRIO (decide acesso à plataforma), não é cópia do
// `useTenantSession` (LEELA-DEBT-T1) — que resolve `tenantId`. Por isso não foi
// unificado com ele.
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
import { isPlatformAdmin } from '@leela/core';
import type { AuthClaims, Role } from '@leela/core';

export type SessionStatus = 'loading' | 'authenticated' | 'anonymous';

export interface PlatformSession {
  status: SessionStatus;
  uid: string | null;
  role: Role | null;
  /**
   * A conta alcança o painel master (RN-401). Deriva de `isPlatformAdmin` do
   * core — as duas pernas do crachá. NUNCA compare `role` aqui: foi essa
   * comparação que fechou o painel para o dono.
   */
  isAdmin: boolean;
}

/** Lê o crachá INTEIRO do token; `force` refaz o ID token. */
async function lerClaims(force: boolean): Promise<AuthClaims | null> {
  return (await getClaims(force)) as AuthClaims | null;
}

/**
 * Monta o estado terminal a partir do crachá INTEIRO.
 *
 * A linha que estava aqui era `isAdmin: role === 'platform_admin'`, e era a
 * SEGUNDA PORTA do painel master: as Rules já aceitavam as duas pernas do
 * crachá (lane PAPEL-DUPLO) e esta função continuava lendo só o `role`,
 * descartando o resto. O dono virou `tenant_owner` — e `role`, sendo valor
 * único, apagou o `platform_admin` que ele tinha. Resultado: os dados abriam e
 * a TELA respondia 403.
 *
 * `isPlatformAdmin` é o ponto único de decisão do core e aceita as duas pernas
 * (papel legado OU capacidade). Aqui só se consome — nenhuma regra de quem é
 * admin nasce no painel.
 */
function sessaoDe(uid: string, claims: AuthClaims | null): PlatformSession {
  return {
    status: 'authenticated',
    uid,
    role: claims?.role ?? null,
    isAdmin: claims !== null && isPlatformAdmin(claims),
  };
}

/** Cache → refresh forçado → terminal sem crachá. Nunca fica em 'loading'. */
async function resolverSessao(uid: string): Promise<PlatformSession> {
  try {
    let claims = await lerClaims(false);
    // Gatilho de refresh: o crachá em cache NÃO concede o painel. Antes era
    // "não tem role", que é mais barato e estava errado para o caso que esta
    // lane conserta — a conta recém-nomeada tem `role` (tenant_owner) e ainda
    // não tem a capacidade no token, então o gatilho antigo nunca disparava e
    // o 403 durava até o token rodar sozinho. O custo é um refresh por visita
    // de não-admin a `/plataforma`, que é uma rota que não-admin não visita.
    if (claims === null || !isPlatformAdmin(claims)) claims = await lerClaims(true);
    return sessaoDe(uid, claims);
  } catch {
    // Cache falhou (ex.: token defasado pós-revoke) → uma última tentativa forçada.
    try {
      return sessaoDe(uid, await lerClaims(true));
    } catch {
      // Token irrecuperável (refresh token revogado). NÃO trava em loading:
      // autenticado sem crachá → o guard responde 403, honesto e acionável.
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
