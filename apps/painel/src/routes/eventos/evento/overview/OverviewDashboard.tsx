// =============================================================================
// OverviewDashboard — dashboard do evento (S202-T2 · fidelidade LEELA-FID-EVT-T3).
// Compõe, na ordem do mockup `Overview do Evento.html`:
//   1. hero de contagem regressiva · 2. 4 KPIs · 3. bar + donut por modalidade ·
//   4. atividade recente (feed tipado). Alertas operacionais entram só quando há
//   (sinal honesto, não presente no mockup mas útil ao produtor). Presentational.
// =============================================================================

import { Link } from 'react-router-dom';
import { Badge, Button } from '@leela/design-system';
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
  /** Ticket médio já derivado por PAGANTE (D-1008-R19); null = "—". */
  ticketMedio?: number | null | undefined;
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
              // REFLUXO ESTREITO (REV-PAINEL): a linha era `flex` sem
              // `flex-wrap`, com um único filho `shrink-0`. Quando o alerta
              // ganhou o botão de destino, o grupo da direita passou a ocupar
              // ~135px inegociáveis (botão + badge + gaps). A mensagem é texto
              // e não encolhe abaixo da palavra mais longa, então em 320px a
              // conta não fechava (240px úteis contra ~277px de mínimo) e a
              // linha estourava a caixa — com o contêiner de rolagem em
              // `overflow-y-auto`, o eixo x é promovido a `auto` e volta a
              // barra horizontal que o dono já reportou duas vezes.
              //
              // O conserto é o MESMO par do PageHeader do DS: `flex-wrap` com
              // `sm:flex-nowrap` aqui, e `basis-full sm:basis-auto` no grupo de
              // ações. Abaixo de `sm` o grupo não cabe na linha da mensagem por
              // construção e desce inteiro; de `sm` para cima nada muda e o
              // desktop fica idêntico ao de antes. `min-w-0` na mensagem é o
              // que a deixa encolher e quebrar em vez de empurrar a caixa.
              'flex flex-wrap items-center justify-between gap-[var(--spacing-3)] sm:flex-nowrap rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-4)] text-[var(--text-primary)]' +
              (a.severidade === 'critico'
                ? ' border-l-4 border-l-[var(--border-danger)]'
                : a.severidade === 'aviso'
                  ? ' border-l-4 border-l-[var(--feedback-warning)]'
                  : '')
            }
          >
            <span className="min-w-0">{a.mensagem}</span>
            <div className="flex shrink-0 items-center gap-[var(--spacing-3)] ml-auto basis-full sm:basis-auto">
              {/* O alerta que NOMEIA um lugar do painel também leva até ele
                  (DIAG-PAINEL-LACUNAS). `Link` do router, não `<a>` cru: a
                  casca do evento é SPA e um href puro recarregaria o
                  documento inteiro — mesmo motivo do `navSpa` do EventoShell.

                  ORDEM DO ANINHAMENTO (REV-PAINEL): é `Button asChild` POR
                  FORA e `Link` por dentro, nunca o inverso. `<Link><Button>`
                  gerava `<a><button>`, que o HTML proíbe (o `a` não admite
                  descendente interativo) e que na prática entregava DOIS
                  pontos de tabulação para uma ação só — o primeiro deles o
                  `<a>` sem classe nenhuma, portanto sem anel de foco
                  (WCAG 2.4.7). Com `asChild`, o Slot funde os dois: sai um
                  `<a>` único, com o estilo e o `focus-visible:ring` do
                  botão. É o mesmo par já usado na ContaPage. */}
              {a.acao ? (
                <Button asChild variant="secondary" size="sm">
                  <Link to={a.acao.href}>{a.acao.label}</Link>
                </Button>
              ) : null}
              {a.severidade === 'critico' ? <Badge variant="vulcao">Atenção</Badge> : null}
            </div>
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
        receitaConfirmada={props.receitaConfirmada}
        ticketMedio={props.ticketMedio}
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
