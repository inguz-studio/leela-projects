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
// estilizado, nunca mock): Presença por semana — não existe série semanal de
// check-ins legível pelo organizador.
//
// +2026-08-17 (S825-T2 · SERIE-FINANCEIRA): "Formas de pagamento" SAIU dessa
// lista. O agregado por forma passou a existir (E11 · S825-T1) e o bloco
// virou `FormasDePagamento`, que ainda cai no "em breve" enquanto o agregado
// não trouxer a série — a degradação é o estado natural entre este merge e o
// deploy das Functions, não um caso de exceção.
//
// Movimento (README §5): as seções revelam em cascata na entrada — fade +
// subida de 12px, passo de 60ms por seção (`animate-revela-secao` + tokens
// `--motion-stagger`/`--motion-reveal-shift`), uma vez por montagem da tela,
// desligado sob prefers-reduced-motion.
// =============================================================================

import { Button, Skeleton, cn } from '@leela/design-system';
import { TrendingUp } from 'lucide-react';
import { Cascata } from '../../components/CartaoV3';
import { InsightsDaLeela } from '../../components/InsightsDaLeela';
import type { InsightDaLeela } from '../../components/insights';
import type { OverviewAlert, OverviewKPIs, Role } from '@leela/core';
import { alertasDeEvento } from './_lib/insights';
import { KpiRow } from './_components/KpiRow';
import { Countdown } from './_components/Countdown';
import { ComunidadeResumo } from './_components/ComunidadeResumo';
import { AgendaCard } from './_components/AgendaCard';
import { AlertsPanel } from './_components/AlertsPanel';
import { StaffScopeNote } from './_components/StaffScopeNote';
import { OcupacaoEventos } from './_components/OcupacaoEventos';
import { EmBreveV3 } from './_components/EmBreveV3';
import { FormasDePagamento } from './_components/FormasDePagamento';
import { ParceriasNoMobile } from './_components/ParceriasNoMobile';
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
  /**
   * Lista COMPLETA do `getOverview`. A partição RN-573 (alerta de evento ×
   * insight de conjunto) acontece aqui dentro, de propósito: se ela morasse na
   * página, bastaria alguém montar este componente de outro lugar para o mesmo
   * fato voltar a aparecer duas vezes. Aqui ela não tem como escapar.
   */
  alerts: OverviewAlert[] | null;
  /** Leituras de conjunto do portfólio (`_lib/insights`). */
  insights: InsightDaLeela[] | null;
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
    insights,
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

      {/* Largura cheia · Insights da Leela.
          A POSIÇÃO É A DO TEMPLATE DO DONO: logo abaixo da régua de números,
          acima do resto (mockup: KPIs na l.401, Insights na l.439). É a dobra
          onde o bloco tem serventia — leitura do conjunto antes dos blocos que
          decompõem cada parte dele. */}
      <Cascata i={3} className="lg:col-span-2">
        <InsightsDaLeela
          insights={insights}
          loading={kpisLoading}
          /* O alcance aqui é o PORTFÓLIO INTEIRO: esta tela não tem seletor, e
             prometer recorte seria mentira ao contrário da do Engajamento. */
          legenda="Leitura automática dos seus eventos e clubs."
          vazio="Nada pedindo atenção agora."
          onNavigate={onNavigate}
        />
      </Cascata>

      {/* Par · Presença por semana / Formas de pagamento — sem fonte, "em
          breve" no formato do protótipo (nunca gráfico zerado). */}
      <Cascata i={4}>
        <EmBreveV3
          titulo="Presença por semana"
          icon={<TrendingUp aria-hidden />}
          causa="O club não registra presença: o único check-in que existe é o do QR na largada de um evento, e não há série semanal legível pelo organizador. Sem essa fonte, não há curva para desenhar."
          className="h-full"
        />
      </Cascata>
      <Cascata i={5}>
        {/* S825-T2: a série existe — o bloco decide entre rosca, vazio
            honesto e o "em breve" original lá dentro, onde a distinção entre
            "não computada" e "sem venda" não tem como se perder. */}
        <FormasDePagamento
          serie={kpis?.formasPagamento ?? null}
          receitaConfirmada={kpis?.receitaConfirmada ?? null}
          loading={kpisLoading}
          className="h-full"
        />
      </Cascata>

      {/* Largura cheia · Ocupação */}
      <Cascata i={6} className="lg:col-span-2">
        <OcupacaoEventos
          ocupacao={ocupacao}
          loading={eventosLoading}
          error={eventosError ?? false}
          onRetry={onRetryEventos}
          onVerEventos={() => onNavigate('/eventos')}
        />
      </Cascata>

      {/* Largura cheia · Alertas — os DE EVENTO. A leitura de conjunto
          (`pendentes-24h`) subiu para os Insights, e a partição vive em
          `_lib/insights` para os dois lados lerem o mesmo nome (RN-573). */}
      <Cascata i={7} className="lg:col-span-2">
        <AlertsPanel
          alerts={alertasDeEvento(alerts)}
          loading={kpisLoading}
          error={kpisError !== null}
          onRetry={kpisError === 'unknown' ? onRetryOverview : undefined}
          onNavigate={onNavigate}
        />
      </Cascata>

      {/* NAV-MOBILE (leva 20) · a casa do QUINTO item — só abaixo de `lg`, onde
          a barra de quatro deixou Parcerias de fora. Acima disso o rail ainda o
          carrega, e o bloco seria a redundância que a RN-573 desta mesma rodada
          proíbe. Último da grade de propósito: é atalho de área, não trabalho do
          dia — não disputa a dobra com o que a pessoa veio ver. */}
      <Cascata i={8} className="lg:hidden">
        <ParceriasNoMobile onNavigate={onNavigate} />
      </Cascata>
    </div>
  );
}

OverviewContent.displayName = 'OverviewContent';
