// =============================================================================
// KpiRow — os 4 cards de KPI do topo da Visão Geral (S600-T3). Presentational
// puro: consome o retorno de `getOverview` (agregado ∑ — NUNCA recalcula).
//
// Cards: Inscrições · Receita confirmada · Vagas restantes (badge "Esgotando"
// quando há evento em risco) · Taxa de conversão (sparkline; "—" quando null).
// §2.16 flat — cards sem borda decorativa (surface-raised).
// =============================================================================

import { Badge, cn } from '@leela/design-system';
import type { OverviewKPIs } from '@leela/core';
import { Sparkline } from './Sparkline';
import { formatBRL, formatInt, formatPct, formatTrend } from '../_lib/format';

export interface KpiRowProps {
  kpis: OverviewKPIs;
}

interface KpiCardProps {
  label: string;
  value: string;
  trend?: string | undefined;
  badge?: string | undefined;
  sparkline?: number[] | undefined;
}

function KpiCard({ label, value, trend, badge, sparkline }: KpiCardProps): JSX.Element {
  return (
    <div className="flex flex-col gap-[var(--spacing-1)] rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]">
      <div className="flex items-center justify-between gap-[var(--spacing-2)]">
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
          {label}
        </span>
        {badge ? <Badge variant="alerta">{badge}</Badge> : null}
      </div>
      <div className="flex items-end justify-between gap-[var(--spacing-2)]">
        <span className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
          {value}
        </span>
        {sparkline && sparkline.length >= 2 ? (
          <Sparkline values={sparkline} className="shrink-0 text-[var(--action-primary)]" />
        ) : null}
      </div>
      {trend ? (
        <span
          className={cn(
            'text-[length:var(--font-size-sm)]',
            trend === '—' ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-secondary)]'
          )}
        >
          {trend === '—' ? '—' : `${trend} vs. 7 dias`}
        </span>
      ) : null}
    </div>
  );
}

export function KpiRow({ kpis }: KpiRowProps): JSX.Element {
  return (
    <section
      aria-label="Indicadores consolidados"
      className="grid grid-cols-2 gap-[var(--spacing-4)] lg:grid-cols-4"
    >
      <KpiCard
        label="Inscrições"
        value={formatInt(kpis.inscricoesTotais)}
        trend={formatTrend(kpis.inscricoesTrendPct)}
      />
      <KpiCard
        label="Receita confirmada"
        value={formatBRL(kpis.receitaConfirmada)}
        trend={formatTrend(kpis.receitaTrendPct)}
      />
      <KpiCard
        label="Vagas restantes"
        value={formatInt(kpis.vagasRestantes)}
        badge={kpis.eventoEmRisco ? 'Esgotando' : undefined}
      />
      <KpiCard
        label="Taxa de conversão"
        value={formatPct(kpis.taxaConversaoPct)}
        sparkline={kpis.conversaoSparkline}
      />
    </section>
  );
}

KpiRow.displayName = 'KpiRow';
