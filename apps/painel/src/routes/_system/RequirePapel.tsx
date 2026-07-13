// =============================================================================
// RequirePapel (guarda de 403 por papel) — LEELA-E07-web · S501-T1.
//
// Materializa "403 casado com E04-S304": lê o papel do usuário NESTE evento
// (custom claim `eventos[eventoId]` + atalho de titularidade, via usePapelEvento)
// e consulta a MATRIZ ÚNICA `podeAcessar(papel, area)` de @leela/core — a MESMA
// que as Rules espelham. O cliente só REFLETE o veredito; nunca recomputa
// RN-320. Distingue "não logado" (→ login, E00) de "logado sem permissão"
// (→ 403). Usado na fiação das rotas de área do evento (EventosRoutes).
//
// A área é passada por prop; o evento vem do Outlet context do EventoLayout.
// =============================================================================

import type { ReactNode } from 'react';
import { Navigate, useLocation, useOutletContext } from 'react-router-dom';
import { Skeleton } from '@leela/design-system';
import { podeAcessar, type AreaEvento, type PapelEvento } from '@leela/core';
import { usePapelEvento } from '../eventos/_data/papelEvento';
import { useEventosSession, type SessionStatus } from '../eventos/_data/session';
import type { EventoOutletContext } from '../eventos/evento/EventoLayout';
import { Forbidden } from './Forbidden';

// Destino do fluxo de login (E00). A tela real ainda não existe no painel
// (autenticação de produção é do E00); placeholder até ela ser fiada.
const ROTA_LOGIN = '/entrar';

export type AcessoDecisao = 'loading' | 'login' | 'forbidden' | 'allow';

/**
 * Decisão PURA de acesso — o coração do "403 casado com a matriz". Consome
 * `podeAcessar` de @leela/core (fonte única RN-320); testável célula a célula.
 * @pure
 */
export function avaliarAcesso(
  entrada: { status: SessionStatus; papel: PapelEvento | null; loading: boolean },
  area: AreaEvento,
): AcessoDecisao {
  if (entrada.loading || entrada.status === 'loading') return 'loading';
  if (entrada.status === 'anonymous') return 'login';
  if (entrada.papel === null || !podeAcessar(entrada.papel, area)) return 'forbidden';
  return 'allow';
}

interface RequirePapelProps {
  area: AreaEvento;
  children: ReactNode;
}

export function RequirePapel({ area, children }: RequirePapelProps): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const session = useEventosSession();
  const { papel, loading } = usePapelEvento(evento);
  const location = useLocation();

  const decisao = avaliarAcesso({ status: session.status, papel, loading }, area);

  if (decisao === 'loading') {
    return (
      <div role="status" aria-label="Verificando permissão" className="p-[var(--spacing-6)]">
        <Skeleton variant="rect" className="h-40" />
      </div>
    );
  }
  if (decisao === 'login') {
    // Não logado → fluxo de login (E00), NÃO 403. Fecha o ciclo do redirect
    // (S020-T1): guarda a rota de origem em `state.from` para o EntrarPage
    // devolver o usuário exatamente onde ele tentou entrar após autenticar.
    return (
      <Navigate to={ROTA_LOGIN} replace state={{ from: location.pathname + location.search }} />
    );
  }
  if (decisao === 'forbidden') {
    return <Forbidden />;
  }
  return <>{children}</>;
}

RequirePapel.displayName = 'RequirePapel';
