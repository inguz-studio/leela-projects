// =============================================================================
// OverviewKpis — KPIs do dashboard do evento (S202-T2). Consome os agregados ∑
// do doc `eventos/{slug}` (qtdInscritos, receitaConfirmada) — NUNCA recalcula.
// Presentational puro.
// =============================================================================

import { KpiCard } from '../../_components/KpiCard';
import { formatBRL, formatInt } from '../../_lib/format';

export interface OverviewKpisProps {
  qtdInscritos: number;
  receitaConfirmada: number;
}

export function OverviewKpis({ qtdInscritos, receitaConfirmada }: OverviewKpisProps): JSX.Element {
  const ticketMedio = qtdInscritos > 0 ? receitaConfirmada / qtdInscritos : 0;

  return (
    <section
      aria-label="Indicadores do evento"
      className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-3"
    >
      <KpiCard label="Inscritos" value={formatInt(qtdInscritos)} />
      <KpiCard label="Receita confirmada" value={formatBRL(receitaConfirmada)} />
      <KpiCard
        label="Ticket médio"
        value={formatBRL(ticketMedio)}
        hint="Receita confirmada ÷ inscritos"
      />
    </section>
  );
}

OverviewKpis.displayName = 'OverviewKpis';
