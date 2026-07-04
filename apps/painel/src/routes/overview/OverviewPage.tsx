// =============================================================================
// OverviewPage — container da Visão Geral. Liga sessão + hooks de dados às
// derivações puras (_lib) e às telas presentacionais (shell + content).
//
// KPIs + alertas: `getOverview` (contrato único). Eventos ativos + countdown:
// listagem do organizador. Inscrições recentes: fusão cross-evento (Onda 1).
// Capacidade por evento não está no `Evento` do cliente (parseEvento não a
// expõe) → entra como null; a UI degrada sem ratio/badge de ocupação.
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
  // Capacidade desconhecida no cliente (Onda 1) — resolução canônica é server-side.
  return {
    nome: evento.nome,
    slug: evento.slug,
    status: evento.status,
    qtdInscritos: evento.qtdInscritos,
    capacidade: null,
    data: evento.data,
  };
}

export function OverviewPage(): JSX.Element {
  const navigate = useNavigate();
  const session = useOverviewSession();
  const overview = useOverview(session);
  const eventosState = useEventosProdutor(session);
  const inscricoesState = useInscricoesRecentes(eventosState.data);

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
        alerts={overview.data?.alerts ?? null}
        eventos={eventosAtivos}
        eventosLoading={eventosState.loading}
        inscricoes={inscricoes}
        inscricoesLoading={inscricoesState.loading}
        countdown={countdown}
        countdownLoading={eventosState.loading}
        onNavigate={(href) => navigate(href)}
        onNovoEvento={() => navigate('/eventos/novo')}
      />
    </OverviewShell>
  );
}

OverviewPage.displayName = 'OverviewPage';
