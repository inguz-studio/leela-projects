// =============================================================================
// Dados da conta travada (S1609-T2 · RN-416/417).
//
// A tranca REAL é server-side: sem claim `tenantId`, as Rules já negam todo
// dado de tenant (RN-400/401). Estes hooks só leem o mesmo veredito para
// decidir o que a tela mostra — o overlay é experiência, não segurança.
//
// A sessão resolve `role` E `tenantId` porque a decisão precisa dos dois:
// `platform_admin` não tem `tenantId` e NÃO é conta travada. Resiliência igual
// à de `lib/session/tenantSession.ts` e `plataforma/_data/session.ts` (cache →
// refresh forçado → estado terminal): sessão presa em 'loading' aqui viraria
// um painel em branco sem erro no console.
// =============================================================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getClaims,
  getContatoOnboarding,
  getLeelaDb,
  getLeelaFunctions,
  onSessionChange,
  resgatarConviteOrganizador,
} from '@leela/api-client';
import {
  CONTATO_ONBOARDING_PADRAO,
  isPlatformAdmin,
  type AuthClaims,
  type ContatoOnboarding,
  type Role,
} from '@leela/core';

export type ContaStatus = 'loading' | 'anonymous' | 'authenticated';

export interface ContaOnboardingSession {
  status: ContaStatus;
  uid: string | null;
  role: Role | null;
  tenantId: string | null;
  /** Perna NOVA do crachá de plataforma (lane PAPEL-DUPLO). Só `true` existe. */
  platformAdmin?: true;
}

/**
 * A conta está TRAVADA (RN-416)? Só depois que a sessão é terminal: decidir em
 * 'loading' piscaria o overlay na cara de quem já tem acesso.
 *
 * A isenção é de quem ALCANÇA A PLATAFORMA, não de quem tem o papel literal.
 * A regra antiga comparava `role === 'platform_admin'` e teria coberto de
 * overlay bloqueante justamente o administrador nomeado por capacidade que não
 * tem tenant — a conta certa recebendo a tela de "peça um convite".
 * @pure
 */
export function contaTravada(session: ContaOnboardingSession): boolean {
  if (session.status !== 'authenticated') return false;
  const cracha = {
    ...(session.role !== null ? { role: session.role } : {}),
    ...(session.platformAdmin === true ? { platformAdmin: true as const } : {}),
  } as AuthClaims;
  if (isPlatformAdmin(cracha)) return false;
  return session.tenantId === null;
}

async function lerClaims(force: boolean): Promise<Partial<AuthClaims>> {
  return ((await getClaims(force)) as AuthClaims | null) ?? {};
}

async function resolverSessao(uid: string): Promise<ContaOnboardingSession> {
  try {
    let claims = await lerClaims(false);
    // Sem NENHUM dos dois no cache, o token pode estar defasado (claim recém
    // gravada pelo resgate) — uma tentativa forçada antes de dar o veredito.
    // Crachá VAZIO no cache = token possivelmente defasado (claim recém gravada
    // pelo resgate, ou a capacidade recém concedida). A capacidade entra na
    // conta de "vazio" junto com as outras duas: sem ela, a conta nomeada por
    // capacidade e sem tenant nunca forçaria o refresh e ficaria presa no
    // overlay até o token rodar sozinho.
    if (!claims.tenantId && !claims.role && claims.platformAdmin !== true) {
      claims = await lerClaims(true);
    }
    return {
      status: 'authenticated',
      uid,
      role: claims.role ?? null,
      tenantId: claims.tenantId ?? null,
      ...(claims.platformAdmin === true ? { platformAdmin: true as const } : {}),
    };
  } catch {
    try {
      const claims = await lerClaims(true);
      return {
        status: 'authenticated',
        uid,
        role: claims.role ?? null,
        tenantId: claims.tenantId ?? null,
        ...(claims.platformAdmin === true ? { platformAdmin: true as const } : {}),
      };
    } catch {
      // Token irrecuperável: autenticado sem papel. Estado TERMINAL — a conta
      // vê o overlay (honesto) em vez de skeleton eterno.
      return { status: 'authenticated', uid, role: null, tenantId: null };
    }
  }
}

/** Sessão da conta (papel + tenant) com recarga sob demanda pós-resgate. */
export function useContaOnboardingSession(): ContaOnboardingSession & {
  recarregar: () => void;
} {
  const [session, setSession] = useState<ContaOnboardingSession>({
    status: 'loading',
    uid: null,
    role: null,
    tenantId: null,
  });
  const [recarga, setRecarga] = useState(0);

  useEffect(() => {
    let ativo = true;
    const unsub = onSessionChange((user) => {
      if (!user) {
        if (ativo) setSession({ status: 'anonymous', uid: null, role: null, tenantId: null });
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
  }, [recarga]);

  const recarregar = useCallback(() => setRecarga((n) => n + 1), []);
  return { ...session, recarregar };
}

/** Canal do CTA (RN-417). Nunca fica sem destino: falha cai no padrão. */
export function useContatoOnboarding(): ContatoOnboarding {
  const query = useQuery({
    queryKey: ['onboarding', 'contato'],
    queryFn: () => getContatoOnboarding(getLeelaDb()),
    staleTime: 5 * 60 * 1000,
  });
  return query.data ?? CONTATO_ONBOARDING_PADRAO;
}

export interface ResgateState {
  running: boolean;
  erro: string | null;
}

/** Mensagem de erro do resgate — a recusa do código é ÚNICA (RN-414). */
export function mensagemDoResgate(err: unknown): string {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? (err as { code?: unknown }).code
      : undefined;
  if (code === 'functions/resource-exhausted') {
    return 'Muitas tentativas. Aguarde um pouco ou fale com o time Leela.';
  }
  if (code === 'functions/permission-denied') {
    return 'Código inválido ou já utilizado.';
  }
  if (code === 'functions/failed-precondition') {
    return 'A conta precisa ter e-mail para receber acesso ao painel.';
  }
  return 'Não foi possível liberar o acesso agora. Tente de novo em instantes.';
}

/**
 * Ação de resgate. Em caso de sucesso força o refresh do ID token ANTES de
 * devolver: a claim de tenant acabou de nascer e o token em cache não a
 * carrega — sem isso a home destrava só no próximo login.
 */
export function useResgateConvite() {
  const [state, setState] = useState<ResgateState>({ running: false, erro: null });
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const resgatar = useCallback(async (codigo: string): Promise<boolean> => {
    setState({ running: true, erro: null });
    try {
      await resgatarConviteOrganizador(getLeelaFunctions(), codigo);
      await getClaims(true);
      if (vivo.current) setState({ running: false, erro: null });
      return true;
    } catch (err) {
      if (vivo.current) setState({ running: false, erro: mensagemDoResgate(err) });
      return false;
    }
  }, []);

  return { ...state, resgatar };
}
