// =============================================================================
// OverviewDashboard — dashboard do evento (S202-T2 · fidelidade LEELA-FID-EVT-T3).
// Compõe, na ordem do mockup `Overview do Evento.html`:
//   1. hero de contagem regressiva · 2. 4 KPIs · 3. bar + donut por modalidade ·
//   4. atividade recente (feed tipado). Alertas operacionais entram só quando há
//   (sinal honesto, não presente no mockup mas útil ao produtor). Presentational.
// =============================================================================

import { Badge } from '@leela/design-system';
import type { BarChartDatum, DonutChartDatum } from '@leela/design-system';
import { CountdownHero } from './CountdownHero';
import { OverviewKpis } from './OverviewKpis';
import { ModalidadesPanels } from './ModalidadesPanels';
import { AtividadeFeed } from './AtividadeFeed';
import type { AtividadeItem } from './atividade';
import type { AlertaOperacional } from '../../_lib/alertas';

export interface OverviewDashboardProps {
  // Hero
  dias: number | null;
  dataLinha?: string | undefined;
  qtdInscritos: number;
  capacidade: number | null;
  // KPIs
  receitaConfirmada: number;
  receitaSemana?: number | null | undefined;
  ticketSparkline?: number[] | undefined;
  taxaConversaoPct?: number | null | undefined;
  repassePrevisto?: number | null | undefined;
  taxaPct?: number | null | undefined;
  // Modalidades
  inscricoesModal: BarChartDatum[];
  receitaTotal: number;
  receitaModal: DonutChartDatum[] | null;
  // Feed + alertas
  atividade: AtividadeItem[];
  atividadeLoading: boolean;
  alertas: AlertaOperacional[];
}

function Alertas({ alertas }: { alertas: AlertaOperacional[] }): JSX.Element | null {
  if (alertas.length === 0) return null;
  return (
    <section aria-label="Alertas operacionais" className="flex flex-col gap-[var(--spacing-2)]">
      <h3 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        Alertas operacionais
      </h3>
      <ul role="list" className="flex flex-col gap-[var(--spacing-2)]">
        {alertas.map((a) => (
          <li
            key={a.id}
            role="alert"
            className={
              'flex items-center justify-between gap-[var(--spacing-3)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-4)] text-[var(--text-primary)]' +
              (a.severidade === 'critico'
                ? ' border-l-4 border-l-[var(--border-danger)]'
                : a.severidade === 'aviso'
                  ? ' border-l-4 border-l-[var(--feedback-warning)]'
                  : '')
            }
          >
            <span>{a.mensagem}</span>
            {a.severidade === 'critico' ? <Badge variant="vulcao">Atenção</Badge> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function OverviewDashboard(props: OverviewDashboardProps): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-6)]">
      <CountdownHero
        dias={props.dias}
        qtdInscritos={props.qtdInscritos}
        capacidade={props.capacidade}
        dataLinha={props.dataLinha}
      />

      <OverviewKpis
        qtdInscritos={props.qtdInscritos}
        receitaConfirmada={props.receitaConfirmada}
        receitaSemana={props.receitaSemana}
        ticketSparkline={props.ticketSparkline}
        taxaConversaoPct={props.taxaConversaoPct}
        repassePrevisto={props.repassePrevisto}
        taxaPct={props.taxaPct}
      />

      <ModalidadesPanels
        totalInscritos={props.qtdInscritos}
        capacidade={props.capacidade}
        inscricoes={props.inscricoesModal}
        receitaTotal={props.receitaTotal}
        receita={props.receitaModal}
      />

      <AtividadeFeed itens={props.atividade} loading={props.atividadeLoading} />

      <Alertas alertas={props.alertas} />
    </div>
  );
}

OverviewDashboard.displayName = 'OverviewDashboard';
