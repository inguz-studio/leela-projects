// =============================================================================
// AlertsPanel — painel de alertas operacionais (S602-T2; recomposto no Lote
// FIDELIDADE T6 como o `.side-panel` do mockup): card único raised com head
// ("Alertas" + contagem) e itens em grade 28px+1fr separados por hairline,
// cada um com ÍCONE por severidade nos pares de feedback já provados na
// matriz AA: warn → triângulo âmbar · info → info heroico (paleta do mockup)
// · ok → check vitória.
//
// Consome o `alerts[]` do MESMO `getOverview` (contrato único — sem segunda
// chamada). Ordenação já vem da derivação server-side (E02-L1).
// Contagem do head: "N ativos" (não "novos" — não existe lido/não-lido no
// contrato; divergência honesta registrada). Sem alertas → "Tudo em dia."
// =============================================================================

import { Skeleton, cn } from '@leela/design-system';
import { AlertTriangle, Check, Info, type LucideIcon } from 'lucide-react';
import type { OverviewAlert, SeveridadeAlerta } from '@leela/core';
import { PanelError } from './PanelError';

export interface AlertsPanelProps {
  alerts: OverviewAlert[] | null;
  loading: boolean;
  /** Falha do getOverview — nunca fabricar "Tudo em dia" sobre erro (#03). */
  error?: boolean;
  onRetry?: (() => void) | undefined;
}

interface IconeSeveridade {
  icon: LucideIcon;
  classes: string;
}

// `.alert-icon` do mockup: tile 28px com tint + fg de feedback por severidade
// (info usa a família heroico — paleta do mockup; no tema brasa info == heroico).
const ICONE_SEVERIDADE: Record<SeveridadeAlerta, IconeSeveridade> = {
  warn: {
    icon: AlertTriangle,
    classes: 'bg-[var(--feedback-warning-surface)] text-[var(--feedback-warning-fg)]',
  },
  info: {
    icon: Info,
    classes: 'bg-[var(--feedback-info-surface)] text-[var(--feedback-info-fg)]',
  },
  ok: {
    icon: Check,
    classes: 'bg-[var(--feedback-success-surface)] text-[var(--feedback-success-fg)]',
  },
};

export function AlertsPanel({ alerts, loading, error, onRetry }: AlertsPanelProps): JSX.Element {
  return (
    <section
      aria-label="Alertas operacionais"
      className={cn(
        'rounded-[var(--card-radius)] bg-[var(--surface-raised)]',
        'p-[var(--sidepanel-padding)] shadow-elev-1',
      )}
    >
      {/* Head do side-panel: título + contagem */}
      <div className="flex items-center justify-between mb-[var(--sidepanel-head-mb)]">
        <h2 className="text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          Alertas
        </h2>
        {alerts && alerts.length > 0 ? (
          <span className="text-[length:var(--sidepanel-meta-size)] text-[var(--text-tertiary)]">
            {alerts.length} {alerts.length === 1 ? 'ativo' : 'ativos'}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div role="status" aria-label="Carregando alertas" className="flex flex-col gap-[var(--spacing-2)]">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} variant="rect" className="h-14" />
          ))}
        </div>
      ) : error ? (
        <PanelError message="Não foi possível carregar os alertas." onRetry={onRetry} />
      ) : !alerts || alerts.length === 0 ? (
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Tudo em dia. Nenhum alerta.
        </p>
      ) : (
        <ul role="list" className="flex flex-col">
          {alerts.map((alerta, index) => {
            const severidade = ICONE_SEVERIDADE[alerta.severidade] ?? ICONE_SEVERIDADE.info;
            const Icone = severidade.icon;
            return (
              <li
                key={alerta.id}
                role="alert"
                className={cn(
                  'grid grid-cols-[var(--sidepanel-icon-size)_1fr] items-start',
                  'gap-[var(--sidepanel-item-gap)] py-[var(--sidepanel-item-py)]',
                  index === 0
                    ? 'pt-[var(--spacing-1)]'
                    : 'border-t border-t-[var(--border-subtle)]',
                )}
              >
                <span
                  aria-hidden
                  data-testid={`alert-icon-${alerta.severidade}`}
                  className={cn(
                    'flex items-center justify-center shrink-0',
                    'w-[var(--sidepanel-icon-size)] h-[var(--sidepanel-icon-size)]',
                    'rounded-[var(--radius-sm)]',
                    severidade.classes,
                  )}
                >
                  <Icone className="w-[var(--sidepanel-icon-svg-size)] h-[var(--sidepanel-icon-svg-size)]" />
                </span>
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block text-[length:var(--sidepanel-title-size)] font-[var(--font-weight-medium)]',
                      'leading-[var(--sidepanel-title-leading)] text-[var(--text-primary)] text-pretty',
                    )}
                  >
                    {alerta.titulo}
                  </span>
                  <span className="block text-[length:var(--sidepanel-meta-size)] text-[var(--text-tertiary)] mt-[var(--sidepanel-meta-mt)]">
                    {alerta.quando}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

AlertsPanel.displayName = 'AlertsPanel';
