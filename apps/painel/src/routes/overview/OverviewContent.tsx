// =============================================================================
// OverviewContent — layout de 2 colunas do dashboard (S600-T1). Presentational
// puro. Coluna principal: KPIs (S600-T3) + eventos ativos (S601-T1) + últimas
// inscrições (S601-T2). Coluna lateral: countdown/ações (S602-T1) + alertas
// (S602-T2). Viewport estreito → 1 coluna (grid colapsa).
// =============================================================================

import { Button, Skeleton } from '@leela/design-system';
import type { OverviewAlert, OverviewKPIs, Role } from '@leela/core';
import { KpiRow } from './_components/KpiRow';
import { ActiveEvents } from './_components/ActiveEvents';
import { RecentRegistrations } from './_components/RecentRegistrations';
import { Countdown } from './_components/Countdown';
import { AlertsPanel } from './_components/AlertsPanel';
import { StaffScopeNote } from './_components/StaffScopeNote';
import { ComunidadeResumo } from './_components/ComunidadeResumo';
import { OcupacaoEventos } from './_components/OcupacaoEventos';
import type { OcupacaoDosEventos } from './_lib/ocupacao';
import type { EventoAtivoView } from './_lib/activeEvents';
import type { InscricaoRecenteView } from './_lib/recentRegistrations';
import type { CountdownView } from './_lib/countdown';
import type { OverviewErrorKind } from './_data/overview';

export interface OverviewContentProps {
  kpis: OverviewKPIs | null;
  kpisLoading: boolean;
  kpisError: OverviewErrorKind | null;
  /** Recarrega getOverview (KPIs + alertas partilham a fonte). */
  onRetryOverview?: (() => void) | undefined;
  alerts: OverviewAlert[] | null;
  eventos: EventoAtivoView[] | null;
  eventosLoading: boolean;
  /** Falha ao listar eventos (alimenta ActiveEvents + Countdown). */
  eventosError?: boolean;
  onRetryEventos?: (() => void) | undefined;
  inscricoes: InscricaoRecenteView[] | null;
  inscricoesLoading: boolean;
  inscricoesError?: boolean;
  onRetryInscricoes?: (() => void) | undefined;
  countdown: CountdownView | null;
  countdownLoading: boolean;
  /** Ocupação dos últimos eventos (v3) — derivada da MESMA lista de eventos. */
  ocupacao: OcupacaoDosEventos | null;
  /** Papel do usuário — staff vê nota de escopo em vez de zeros mudos (#16). */
  papel?: Role | null;
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
    onRetryOverview,
    alerts,
    eventos,
    eventosLoading,
    eventosError,
    onRetryEventos,
    inscricoes,
    inscricoesLoading,
    inscricoesError,
    onRetryInscricoes,
    countdown,
    countdownLoading,
    ocupacao,
    papel,
    onNavigate,
    onNovoEvento,
  } = props;

  const contextoStaff = papel === 'tenant_staff';

  return (
    <div className="grid grid-cols-1 gap-[var(--spacing-6)] lg:grid-cols-3">
      {/* Coluna principal (2/3) */}
      <div className="flex flex-col gap-[var(--spacing-6)] lg:col-span-2">
        {contextoStaff ? <StaffScopeNote /> : null}

        {kpisLoading ? (
          <KpiSkeletons />
        ) : kpisError ? (
          <div
            role="alert"
            className="flex flex-col items-start gap-[var(--spacing-3)] rounded-[var(--card-radius)] border-l-4 border-l-[var(--border-danger)] bg-[var(--surface-raised)] p-[var(--spacing-5)] text-[var(--text-primary)]"
          >
            <span>{MSG_ERRO[kpisError]}</span>
            {kpisError === 'unknown' && onRetryOverview ? (
              <Button variant="secondary" size="sm" onClick={onRetryOverview}>
                Tentar novamente
              </Button>
            ) : null}
          </div>
        ) : kpis ? (
          <KpiRow kpis={kpis} />
        ) : null}

        <ActiveEvents
          eventos={eventos}
          loading={eventosLoading}
          error={eventosError ?? false}
          onRetry={onRetryEventos}
          contextoStaff={contextoStaff}
          onGerenciar={(slug) => onNavigate(`/eventos/${slug}`)}
          onNovoEvento={onNovoEvento}
          onVerTodos={() => onNavigate('/eventos')}
        />

        {/* v3: a leitura analítica dos MESMOS eventos listados acima — quanto
            das vagas foi preenchido. Fica depois da lista porque responde à
            pergunta seguinte ("como foram?"), não à primeira ("quais são?"). */}
        <OcupacaoEventos
          ocupacao={ocupacao}
          loading={eventosLoading}
          error={eventosError ?? false}
          onRetry={onRetryEventos}
          onVerEventos={() => onNavigate('/eventos')}
        />

        <RecentRegistrations
          inscricoes={inscricoes}
          loading={inscricoesLoading}
          error={inscricoesError ?? false}
          onRetry={onRetryInscricoes}
          onVerTodas={() => onNavigate('/eventos')}
        />
      </div>

      {/* Coluna lateral (1/3) */}
      <aside className="flex flex-col gap-[var(--spacing-6)]">
        <Countdown
          countdown={countdown}
          loading={countdownLoading}
          error={eventosError ?? false}
          onRetry={onRetryEventos}
          onNavigate={onNavigate}
        />
        {/* v3: o par "Próximo evento + Clubs" do protótipo. Fecha o buraco
            entre a story do E02 ("consolida eventos E CLUBES numa única
            leitura") e a tela, que consolidava só eventos — os dois agregados
            de comunidade já vinham no retorno de `getOverview` sem serem
            desenhados em lugar nenhum. */}
        <ComunidadeResumo
          kpis={kpis}
          loading={kpisLoading}
          error={kpisError !== null}
          onRetry={kpisError === 'unknown' ? onRetryOverview : undefined}
          onGerenciarClubs={() => onNavigate('/clubes')}
          onNovoClube={() => onNavigate('/clubes/novo')}
        />
        <AlertsPanel
          alerts={alerts}
          loading={kpisLoading}
          error={kpisError !== null}
          onRetry={kpisError === 'unknown' ? onRetryOverview : undefined}
        />
      </aside>
    </div>
  );
}

OverviewContent.displayName = 'OverviewContent';
