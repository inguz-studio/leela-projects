// =============================================================================
// OverviewContent — layout de 2 colunas do dashboard (S600-T1). Presentational
// puro. Coluna principal: KPIs (S600-T3) + eventos ativos (S601-T1) + últimas
// inscrições (S601-T2). Coluna lateral: countdown/ações (S602-T1) + alertas
// (S602-T2). Viewport estreito → 1 coluna (grid colapsa).
// =============================================================================

import { Skeleton } from '@leela/design-system';
import type { OverviewAlert, OverviewKPIs } from '@leela/core';
import { KpiRow } from './_components/KpiRow';
import { ActiveEvents } from './_components/ActiveEvents';
import { RecentRegistrations } from './_components/RecentRegistrations';
import { Countdown } from './_components/Countdown';
import { AlertsPanel } from './_components/AlertsPanel';
import type { EventoAtivoView } from './_lib/activeEvents';
import type { InscricaoRecenteView } from './_lib/recentRegistrations';
import type { CountdownView } from './_lib/countdown';
import type { OverviewErrorKind } from './_data/overview';

export interface OverviewContentProps {
  kpis: OverviewKPIs | null;
  kpisLoading: boolean;
  kpisError: OverviewErrorKind | null;
  alerts: OverviewAlert[] | null;
  eventos: EventoAtivoView[] | null;
  eventosLoading: boolean;
  inscricoes: InscricaoRecenteView[] | null;
  inscricoesLoading: boolean;
  countdown: CountdownView | null;
  countdownLoading: boolean;
  onNavigate: (href: string) => void;
  onNovoEvento: () => void;
}

const MSG_ERRO: Record<OverviewErrorKind, string> = {
  'permission-denied': 'Esta conta não tem um painel de produtor.',
  unauthenticated: 'Sua sessão expirou. Entre novamente para ver o resumo.',
  unknown: 'Não foi possível carregar seu resumo. Tente novamente.',
};

function KpiSkeletons(): JSX.Element {
  return (
    <div
      role="status"
      aria-label="Carregando indicadores"
      className="grid grid-cols-2 gap-[var(--spacing-4)] lg:grid-cols-4"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="rect" className="h-24" />
      ))}
    </div>
  );
}

export function OverviewContent(props: OverviewContentProps): JSX.Element {
  const {
    kpis,
    kpisLoading,
    kpisError,
    alerts,
    eventos,
    eventosLoading,
    inscricoes,
    inscricoesLoading,
    countdown,
    countdownLoading,
    onNavigate,
    onNovoEvento,
  } = props;

  return (
    <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-3">
      {/* Coluna principal (2/3) */}
      <div className="flex flex-col gap-[var(--spacing-6)] lg:col-span-2">
        {kpisLoading ? (
          <KpiSkeletons />
        ) : kpisError ? (
          <div
            role="alert"
            className="rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            {MSG_ERRO[kpisError]}
          </div>
        ) : kpis ? (
          <KpiRow kpis={kpis} />
        ) : null}

        <ActiveEvents
          eventos={eventos}
          loading={eventosLoading}
          onGerenciar={(slug) => onNavigate(`/eventos/${slug}`)}
          onNovoEvento={onNovoEvento}
        />

        <RecentRegistrations inscricoes={inscricoes} loading={inscricoesLoading} />
      </div>

      {/* Coluna lateral (1/3) */}
      <aside className="flex flex-col gap-[var(--spacing-6)]">
        <Countdown
          countdown={countdown}
          loading={countdownLoading}
          onNavigate={onNavigate}
          onNovoEvento={onNovoEvento}
        />
        <AlertsPanel alerts={alerts} loading={kpisLoading} />
      </aside>
    </div>
  );
}

OverviewContent.displayName = 'OverviewContent';
