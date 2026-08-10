// =============================================================================
// OverviewContent — o corpo da Visão Geral, recriado FIEL ao protótipo "Visao
// Geral v3" (lane HIFI-REC; ordem do dono 10/08 — fidelidade é o critério
// primário, L-004 suspenso).
//
// Grade do protótipo: duas colunas `minmax(0,1.15fr) minmax(0,1fr)` com gap de
// 20px, colapsando para uma coluna abaixo de `lg` (README §4). Ordem das
// seções = ordem do protótipo: Próximo evento + Clubs (coluna 1) · Agenda
// (coluna 2) · régua de indicadores (largura cheia) · Presença por semana +
// Formas de pagamento (par) · Ocupação (largura cheia) · Alertas (largura
// cheia). `minmax(0, …)` nas duas pistas é o que impede a coluna direita de
// ser empurrada/cortada por conteúdo largo — defeito nº 3 da primeira rodada.
//
// O que SAIU da tela (o protótipo não tem): "Eventos ativos" e "Últimas
// inscrições" — os componentes seguem no código; o job deles vive no hub
// /eventos, a um clique do rail e da Agenda. Registrado no handoff.
//
// Seções sem fonte de dado real (regra do contrato: card "em breve"
// estilizado, nunca mock): Presença por semana (não existe série semanal de
// check-ins legível) e Formas de pagamento (nenhum agregado por forma de
// pagamento chega ao cliente). Impedimentos nomeados no handoff.
//
// Movimento (README §5): as seções revelam em cascata na entrada — fade +
// subida de 12px, passo de 60ms por seção (`animate-revela-secao` + tokens
// `--motion-stagger`/`--motion-reveal-shift`), uma vez por montagem da tela,
// desligado sob prefers-reduced-motion.
// =============================================================================

import { Button, Skeleton, cn } from '@leela/design-system';
import { CreditCard, TrendingUp } from 'lucide-react';
import { Cascata } from '../../components/CartaoV3';
import type { OverviewAlert, OverviewKPIs, Role } from '@leela/core';
import { KpiRow } from './_components/KpiRow';
import { Countdown } from './_components/Countdown';
import { ComunidadeResumo } from './_components/ComunidadeResumo';
import { AgendaCard } from './_components/AgendaCard';
import { AlertsPanel } from './_components/AlertsPanel';
import { StaffScopeNote } from './_components/StaffScopeNote';
import { OcupacaoEventos } from './_components/OcupacaoEventos';
import { EmBreveV3 } from './_components/EmBreveV3';
import type { OcupacaoDosEventos } from './_lib/ocupacao';
import type { ItemDaAgenda } from './_lib/agenda';
import type { CountdownView } from './_lib/countdown';
import type { OverviewErrorKind } from './_data/overview';

export interface OverviewContentProps {
  kpis: OverviewKPIs | null;
  kpisLoading: boolean;
  kpisError: OverviewErrorKind | null;
  /** Recarrega getOverview (KPIs + alertas partilham a fonte). */
  onRetryOverview?: (() => void) | undefined;
  alerts: OverviewAlert[] | null;
  /** Eventos com dia civil resolvido (Agenda) — null = sem dado ainda. */
  agenda: ItemDaAgenda[] | null;
  eventosLoading: boolean;
  /** Falha ao listar eventos (alimenta Agenda + Countdown + Ocupação). */
  eventosError?: boolean;
  onRetryEventos?: (() => void) | undefined;
  countdown: CountdownView | null;
  countdownLoading: boolean;
  /** Ocupação dos últimos eventos (v3) — derivada da MESMA lista de eventos. */
  ocupacao: OcupacaoDosEventos | null;
  /** Dia civil de hoje ("2026-08-10") — âncora do calendário da Agenda. */
  hojeISO: string;
  /** Papel do usuário — staff vê nota de escopo em vez de zeros mudos (#16). */
  papel?: Role | null;
  onNavigate: (href: string) => void;
}

const MSG_ERRO: Record<OverviewErrorKind, string> = {
  'permission-denied': 'Esta conta não tem um painel de produtor.',
  unauthenticated: 'Sua sessão expirou. Entre novamente para ver o resumo.',
  unknown: 'Não foi possível carregar seu resumo. Tente novamente.',
};

export function OverviewContent(props: OverviewContentProps): JSX.Element {
  const {
    kpis,
    kpisLoading,
    kpisError,
    onRetryOverview,
    alerts,
    agenda,
    eventosLoading,
    eventosError,
    onRetryEventos,
    countdown,
    countdownLoading,
    ocupacao,
    hojeISO,
    papel,
    onNavigate,
  } = props;

  const contextoStaff = papel === 'tenant_staff';

  return (
    <div
      className={cn(
        'grid grid-cols-1 items-stretch gap-[var(--v3-gap)]',
        'lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]',
      )}
    >
      {contextoStaff ? (
        <div className="lg:col-span-2">
          <StaffScopeNote />
        </div>
      ) : null}

      {/* Coluna 1 · Próximo evento + Clubs (protótipo: pilha com o mesmo gap) */}
      <Cascata i={0} className="flex flex-col gap-[var(--v3-gap)]">
        <Countdown
          countdown={countdown}
          loading={countdownLoading}
          error={eventosError ?? false}
          onRetry={onRetryEventos}
          onNavigate={onNavigate}
        />
        <ComunidadeResumo
          kpis={kpis}
          loading={kpisLoading}
          error={kpisError !== null}
          onRetry={kpisError === 'unknown' ? onRetryOverview : undefined}
          onGerenciarClubs={() => onNavigate('/clubes')}
          onNovoClube={() => onNavigate('/clubes/novo')}
        />
      </Cascata>

      {/* Coluna 2 · Agenda */}
      <Cascata i={1}>
        <AgendaCard
          itens={agenda}
          loading={eventosLoading}
          error={eventosError ?? false}
          onRetry={onRetryEventos}
          hojeISO={hojeISO}
          onNavigate={onNavigate}
        />
      </Cascata>

      {/* Largura cheia · régua de indicadores */}
      <Cascata i={2} className="lg:col-span-2">
        {kpisLoading ? (
          <div
            role="status"
            aria-label="Carregando indicadores"
            className="grid grid-cols-1 gap-[var(--spacing-4)] xs:grid-cols-2 lg:grid-cols-4"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rect" className="h-24" />
            ))}
          </div>
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
      </Cascata>

      {/* Par · Presença por semana / Formas de pagamento — sem fonte, "em
          breve" no formato do protótipo (nunca gráfico zerado). */}
      <Cascata i={3}>
        <EmBreveV3
          titulo="Presença por semana"
          icon={<TrendingUp aria-hidden />}
          causa="O club não registra presença: o único check-in que existe é o do QR na largada de um evento, e não há série semanal legível pelo organizador. Sem essa fonte, não há curva para desenhar."
          className="h-full"
        />
      </Cascata>
      <Cascata i={4}>
        <EmBreveV3
          titulo="Formas de pagamento"
          icon={<CreditCard aria-hidden />}
          causa="Nenhum agregado por forma de pagamento chega ao cliente hoje — a inscrição não carrega a forma no retorno do resumo. Assim que a série financeira existir, o donut aparece aqui."
          className="h-full"
        />
      </Cascata>

      {/* Largura cheia · Ocupação */}
      <Cascata i={5} className="lg:col-span-2">
        <OcupacaoEventos
          ocupacao={ocupacao}
          loading={eventosLoading}
          error={eventosError ?? false}
          onRetry={onRetryEventos}
          onVerEventos={() => onNavigate('/eventos')}
        />
      </Cascata>

      {/* Largura cheia · Alertas */}
      <Cascata i={6} className="lg:col-span-2">
        <AlertsPanel
          alerts={alerts}
          loading={kpisLoading}
          error={kpisError !== null}
          onRetry={kpisError === 'unknown' ? onRetryOverview : undefined}
          onNavigate={onNavigate}
        />
      </Cascata>
    </div>
  );
}

OverviewContent.displayName = 'OverviewContent';
