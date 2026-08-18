// =============================================================================
// OverviewPage — container da Visão Geral. Liga sessão + hooks de dados às
// derivações puras (_lib) e às telas presentacionais (shell + content).
//
// HIFI-REC (protótipo "Visao Geral v3"): as seções são as do protótipo —
// Próximo evento, Clubs, Agenda, régua de indicadores, Ocupação e Alertas.
// KPIs + alertas: `getOverview` (contrato único). Countdown, Agenda e
// Ocupação: a MESMA listagem de eventos do organizador — nenhuma query nova
// na primeira tela. "Eventos ativos"/"Últimas inscrições" saíram da tela (o
// protótipo não os tem; o job vive no hub /eventos) — a busca de inscrições
// recentes saiu junto, um round-trip a menos no LCP.
// =============================================================================

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataLocalISO, type Evento } from '@leela/core';
import { OverviewShell } from './OverviewShell';
import { OverviewContent } from './OverviewContent';
import { useOverviewSession } from './_data/session';
import { useEventosProdutor, useOverview } from './_data/overview';
import { derivarAgenda } from './_lib/agenda';
import { derivarCountdown } from './_lib/countdown';
import { derivarOcupacao } from './_lib/ocupacao';
import { derivarInsightsDaVisaoGeral } from './_lib/insights';

function comCapacidade(evento: Evento): {
  nome: string;
  slug: string;
  status: Evento['status'];
  qtdInscritos: number;
  capacidade: number | null;
  data: Evento['data'];
  local: string;
  modalidades: string[];
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
    local: evento.local,
    modalidades: evento.modalidades,
  };
}

export function OverviewPage(): JSX.Element {
  const navigate = useNavigate();
  const session = useOverviewSession();
  const overview = useOverview(session);
  const eventosState = useEventosProdutor(session);

  const eventosInput = useMemo(
    () => (eventosState.data ?? []).map(comCapacidade),
    [eventosState.data]
  );

  const countdown = useMemo(
    () => (eventosState.data ? derivarCountdown(eventosInput, new Date()) : null),
    [eventosState.data, eventosInput]
  );

  // Agenda (v3): mesma lista de eventos, dia civil no fuso do produto.
  const agenda = useMemo(
    () => (eventosState.data ? derivarAgenda(eventosInput) : null),
    [eventosState.data, eventosInput]
  );

  // Ocupação (v3): mesma lista de eventos, nenhuma query nova. `null` enquanto
  // a fonte-mãe não resolveu — o bloco reflete o loading dos eventos.
  const ocupacao = useMemo(
    () => (eventosState.data ? derivarOcupacao(eventosInput) : null),
    [eventosState.data, eventosInput]
  );

  // Insights da Leela (leva 23): leitura de conjunto do que a tela JÁ tem —
  // os alertas e os KPIs do mesmo `getOverview` e a mesma lista de eventos.
  // Nenhuma query nova, pelo mesmo orçamento de LCP que rege a tela inteira.
  const insights = useMemo(
    () =>
      overview.loading
        ? null
        : derivarInsightsDaVisaoGeral(
            overview.data?.alerts ?? null,
            eventosState.data ?? null,
            overview.data
          ),
    [overview.loading, overview.data, eventosState.data]
  );

  // Snapshot do dia civil de HOJE por montagem (âncora do calendário).
  const [hojeISO] = useState(() => dataLocalISO(new Date()));

  return (
    <OverviewShell nome={session.nome}>
      <OverviewContent
        kpis={overview.data}
        kpisLoading={overview.loading}
        kpisError={overview.error ? overview.errorKind : null}
        onRetryOverview={overview.refetch}
        alerts={overview.data?.alerts ?? null}
        insights={insights}
        agenda={agenda}
        eventosLoading={eventosState.loading}
        eventosError={eventosState.error !== null}
        onRetryEventos={eventosState.refetch}
        countdown={countdown}
        countdownLoading={eventosState.loading}
        ocupacao={ocupacao}
        hojeISO={hojeISO}
        papel={session.role}
        onNavigate={(href) => navigate(href)}
      />
    </OverviewShell>
  );
}

OverviewPage.displayName = 'OverviewPage';
