// =============================================================================
// OverviewPage — container da Visão Geral. Liga sessão + hooks de dados às
// derivações puras (_lib) e às telas presentacionais (shell + content).
//
// KPIs + alertas: `getOverview` (contrato único). Eventos ativos + countdown:
// listagem do organizador. Inscrições recentes: fusão cross-evento (Onda 1).
// Capacidade: `parseEvento` expõe a capacidade DIRETA do doc (S600-T2-fix);
// null = desconhecida (a resolução Σkits é server-side, RN-210) e a UI
// degrada sem ratio/badge de ocupação — com capacidade, exibe 453/500.
// =============================================================================

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Evento } from '@leela/core';
import { OverviewShell } from './OverviewShell';
import { OverviewContent } from './OverviewContent';
import { useOverviewSession } from './_data/session';
import { useEventosProdutor, useInscricoesRecentes, useOverview } from './_data/overview';
import { derivarEventosAtivos } from './_lib/activeEvents';
import { derivarInscricoesRecentes } from './_lib/recentRegistrations';
import { derivarCountdown } from './_lib/countdown';

function comCapacidade(evento: Evento): {
  nome: string;
  slug: string;
  status: Evento['status'];
  qtdInscritos: number;
  capacidade: number | null;
  data: Evento['data'];
} {
  // Capacidade direta do doc via parseEvento (S600-T2-fix); `?? null` cobre
  // literais legados sem o campo (opcional na entidade — padrão `percursos`).
  return {
    nome: evento.nome,
    slug: evento.slug,
    status: evento.status,
    qtdInscritos: evento.qtdInscritos,
    capacidade: evento.capacidade ?? null,
    data: evento.data,
  };
}

export function OverviewPage(): JSX.Element {
  const navigate = useNavigate();
  const session = useOverviewSession();
  const overview = useOverview(session);
  const eventosState = useEventosProdutor(session);
  // Erro dos eventos é propagado: quebra o skeleton eterno das inscrições (#39).
  const inscricoesState = useInscricoesRecentes(eventosState.data, eventosState.error);

  const eventosInput = useMemo(
    () => (eventosState.data ?? []).map(comCapacidade),
    [eventosState.data]
  );

  const eventosAtivos = useMemo(
    () => (eventosState.data ? derivarEventosAtivos(eventosInput) : null),
    [eventosState.data, eventosInput]
  );

  const countdown = useMemo(
    () => (eventosState.data ? derivarCountdown(eventosInput, new Date()) : null),
    [eventosState.data, eventosInput]
  );

  const inscricoes = useMemo(
    () => (inscricoesState.data ? derivarInscricoesRecentes(inscricoesState.data, 5) : null),
    [inscricoesState.data]
  );

  return (
    <OverviewShell nome={session.nome} onNavigate={(href) => navigate(href)}>
      <OverviewContent
        kpis={overview.data}
        kpisLoading={overview.loading}
        kpisError={overview.error ? overview.errorKind : null}
        onRetryOverview={overview.refetch}
        alerts={overview.data?.alerts ?? null}
        eventos={eventosAtivos}
        eventosLoading={eventosState.loading}
        eventosError={eventosState.error !== null}
        onRetryEventos={eventosState.refetch}
        inscricoes={inscricoes}
        inscricoesLoading={inscricoesState.loading}
        inscricoesError={inscricoesState.error !== null}
        // Retry aponta para a raiz: se os eventos falharam, recarrega eventos
        // (as inscrições re-derivam); senão recarrega só as inscrições.
        onRetryInscricoes={eventosState.error ? eventosState.refetch : inscricoesState.refetch}
        countdown={countdown}
        countdownLoading={eventosState.loading}
        onNavigate={(href) => navigate(href)}
        onNovoEvento={() => navigate('/eventos/novo')}
      />
    </OverviewShell>
  );
}

OverviewPage.displayName = 'OverviewPage';
