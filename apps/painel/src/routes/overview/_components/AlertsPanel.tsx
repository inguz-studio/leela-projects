// =============================================================================
// AlertsPanel — painel de alertas operacionais (S602-T2). Presentational puro.
//
// Consome o `alerts[]` do MESMO `getOverview` (contrato único — sem segunda
// chamada). Severidade → cor semântica: warn (border danger) · info (border
// info) · ok (sem borda). Ordenação já vem da derivação server-side (E02-L1).
// Sem alertas → "Tudo em dia. Nenhum alerta." Skeleton no load.
// =============================================================================

import { Skeleton, cn } from '@leela/design-system';
import type { OverviewAlert, SeveridadeAlerta } from '@leela/core';

export interface AlertsPanelProps {
  alerts: OverviewAlert[] | null;
  loading: boolean;
}

const BORDA_SEVERIDADE: Record<SeveridadeAlerta, string> = {
  warn: 'border-l-4 border-l-[var(--border-danger)]',
  info: 'border-l-4 border-l-[var(--feedback-info-fg)]',
  ok: '',
};

export function AlertsPanel({ alerts, loading }: AlertsPanelProps): JSX.Element {
  return (
    <section aria-label="Alertas operacionais" className="flex flex-col gap-[var(--spacing-3)]">
      <h2 className="text-[length:var(--font-size-md)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        Alertas
      </h2>

      {loading ? (
        <div role="status" aria-label="Carregando alertas" className="flex flex-col gap-[var(--spacing-2)]">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-14" />
          ))}
        </div>
      ) : !alerts || alerts.length === 0 ? (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Tudo em dia. Nenhum alerta.
        </p>
      ) : (
        <ul role="list" className="flex flex-col gap-[var(--spacing-2)]">
          {alerts.map((alerta) => (
            <li
              key={alerta.id}
              role="alert"
              className={cn(
                'flex flex-col gap-[var(--spacing-1)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-4)]',
                BORDA_SEVERIDADE[alerta.severidade]
              )}
            >
              <span className="text-[var(--text-primary)]">{alerta.titulo}</span>
              <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                {alerta.quando}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

AlertsPanel.displayName = 'AlertsPanel';
