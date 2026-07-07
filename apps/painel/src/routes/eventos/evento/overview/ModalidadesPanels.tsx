// =============================================================================
// ModalidadesPanels — os dois painéis de modalidade do Overview (LEELA-FID-EVT-T3),
// fiéis ao mockup: "Inscrições por modalidade" (BarChart, contagem REAL do
// agregado financeiro) e "Receita por modalidade" (DonutChart). Presentational.
//
// Reuso-first: BarChart/DonutChart do DS (Recharts · ADR-010), EmptyState do DS.
// colorIndex chega pronto (mesma cor por modalidade nos 2 gráficos — a página
// fixa a ordem; a cor segue a entidade, não o rank).
// =============================================================================

import type { ReactNode } from 'react';
import { BarChart, DonutChart, EmptyState, cn } from '@leela/design-system';
import type { BarChartDatum, DonutChartDatum } from '@leela/design-system';
import { formatBRL, formatInt } from '../../_lib/format';

export interface ModalidadesPanelsProps {
  totalInscritos: number;
  capacidade: number | null;
  inscricoes: BarChartDatum[];
  receitaTotal: number;
  receita: DonutChartDatum[] | null;
}

/** "R$ 85,6k" — compacto para o centro do donut. @pure */
function brlCompacto(valor: number): string {
  if (valor >= 1000) {
    const k = valor / 1000;
    return `R$ ${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(k)}k`;
  }
  return formatBRL(valor);
}

function CardChart({
  title,
  sub,
  children,
  className,
}: {
  title: string;
  sub: string;
  children: ReactNode;
  className?: string;
}): JSX.Element {
  return (
    <div className={cn('rounded-[var(--card-radius)] bg-[var(--surface-raised)] p-[var(--spacing-5)]', className)}>
      <div className="mb-[var(--spacing-4)] flex items-baseline justify-between gap-[var(--spacing-2)]">
        <h3 className="font-display italic font-[var(--font-weight-bold)] text-[length:var(--font-size-md)] text-[var(--text-primary)]">
          {title}
        </h3>
        <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)] tabular-nums">{sub}</span>
      </div>
      {children}
    </div>
  );
}

export function ModalidadesPanels({
  totalInscritos,
  capacidade,
  inscricoes,
  receitaTotal,
  receita,
}: ModalidadesPanelsProps): JSX.Element {
  const temCap = typeof capacidade === 'number' && capacidade > 0;
  const pct = temCap ? Math.round((totalInscritos / (capacidade as number)) * 100) : null;
  const inscricoesSub = temCap
    ? `${formatInt(totalInscritos)} / ${formatInt(capacidade as number)} vagas · ${pct}%`
    : `${formatInt(totalInscritos)} inscritos`;

  return (
    <section
      aria-label="Distribuição por modalidade"
      className="grid grid-cols-1 gap-[var(--spacing-4)] lg:grid-cols-[3fr_2fr]"
    >
      <CardChart title="Inscrições por modalidade" sub={inscricoesSub}>
        <BarChart aria-label="Inscrições por modalidade" data={inscricoes} height={170} />
      </CardChart>

      <CardChart title="Receita por modalidade" sub={`${formatBRL(receitaTotal)} total`}>
        {receita && receita.length > 0 ? (
          <DonutChart
            aria-label="Receita por modalidade"
            data={receita}
            centerValue={brlCompacto(receitaTotal)}
            centerLabel="Receita total"
            size={180}
            formatValue={formatBRL}
          />
        ) : (
          <EmptyState
            title="Sem detalhamento de receita"
            description="A receita por modalidade ainda não está disponível para este evento."
          />
        )}
      </CardChart>
    </section>
  );
}

ModalidadesPanels.displayName = 'ModalidadesPanels';
