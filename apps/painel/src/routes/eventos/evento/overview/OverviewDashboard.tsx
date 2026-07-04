// =============================================================================
// OverviewDashboard — dashboard do evento (S202-T2). Presentational puro:
// KPIs (agregados), alertas operacionais inline e atividade recente (últimos
// inscritos). Skeleton na atividade enquanto carrega (§2.12).
// =============================================================================

import { Badge, Skeleton } from '@leela/design-system';
import type { Inscrito, KitInscrito } from '@leela/core';
import { OverviewKpis } from './OverviewKpis';
import type { AlertaOperacional } from '../../_lib/alertas';

const KIT_LABEL: Record<KitInscrito, string> = {
  kit_ouro: 'Ouro',
  kit_prata: 'Prata',
  kit_basico: 'Básico',
  sem_kit: 'Sem kit',
};

export interface OverviewDashboardProps {
  qtdInscritos: number;
  receitaConfirmada: number;
  alertas: AlertaOperacional[];
  inscritosRecentes: Inscrito[] | null;
  inscritosLoading: boolean;
}

function Alertas({ alertas }: { alertas: AlertaOperacional[] }): JSX.Element | null {
  if (alertas.length === 0) return null;
  return (
    <section aria-label="Alertas operacionais" className="flex flex-col gap-[var(--spacing-2)]">
      <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        Alertas operacionais
      </h2>
      <ul role="list" className="flex flex-col gap-[var(--spacing-2)]">
        {alertas.map((a) => (
          <li
            key={a.id}
            role="alert"
            className={
              'rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-4)] text-[var(--text-primary)]' +
              (a.severidade === 'critico'
                ? ' border-l-4 border-l-[var(--border-danger)]'
                : a.severidade === 'aviso'
                  ? ' border-l-4 border-l-[var(--feedback-warning)]'
                  : '')
            }
          >
            {a.mensagem}
          </li>
        ))}
      </ul>
    </section>
  );
}

function AtividadeRecente({
  inscritos,
  loading,
}: {
  inscritos: Inscrito[] | null;
  loading: boolean;
}): JSX.Element {
  return (
    <section aria-label="Atividade recente" className="flex flex-col gap-[var(--spacing-3)]">
      <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        Atividade recente
      </h2>
      {loading ? (
        <div role="status" aria-label="Carregando atividade" className="flex flex-col gap-[var(--spacing-2)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="text" />
          ))}
        </div>
      ) : !inscritos || inscritos.length === 0 ? (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Nenhuma inscrição recente.
        </p>
      ) : (
        <ul role="list" className="flex flex-col gap-[var(--spacing-2)]">
          {inscritos.map((ins) => (
            <li
              key={ins.id}
              className="flex items-center justify-between gap-[var(--spacing-3)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] px-[var(--spacing-4)] py-[var(--spacing-3)]"
            >
              <span className="min-w-0 truncate text-[var(--text-primary)]">{ins.atletaNome}</span>
              <span className="flex items-center gap-[var(--spacing-2)]">
                <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                  {ins.modalidade}
                </span>
                <Badge variant="neutro">{KIT_LABEL[ins.kit]}</Badge>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function OverviewDashboard({
  qtdInscritos,
  receitaConfirmada,
  alertas,
  inscritosRecentes,
  inscritosLoading,
}: OverviewDashboardProps): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-8)]">
      <OverviewKpis qtdInscritos={qtdInscritos} receitaConfirmada={receitaConfirmada} />
      <Alertas alertas={alertas} />
      <AtividadeRecente inscritos={inscritosRecentes} loading={inscritosLoading} />
    </div>
  );
}

OverviewDashboard.displayName = 'OverviewDashboard';
