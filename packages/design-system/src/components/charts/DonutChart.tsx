// =============================================================================
// DonutChart — rosca categórica (Recharts Pie · ADR-010). Componente do DESIGN
// SYSTEM, tokenizado (`--chart-cat-*`, anel na surface), tema brasa/wine, AA.
// Segue a skill `dataviz`:
//   • forma: composição de um todo → rosca (parte-de-um-todo, poucas fatias);
//   • cor categórica em ordem FIXA; LEGENDA sempre presente p/ ≥2 séries, com
//     swatch + rótulo + valor + % (identidade nunca só-cor);
//   • gap de 2px entre fatias (paddingAngle) + anel de 2px na surface;
//   • hover por padrão (tooltip por fatia);
//   • valor-âncora no centro (hero number) + table view (sr-only).
//
// Recharts é a lib DECIDIDA (ADR-010 §complementos).
// =============================================================================

import * as React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '../../utils/cn';
import { chartCategoryVar, formatChartInt, pctOf } from './chartPalette';
import { ChartErrorBoundary } from './ChartErrorBoundary';

export interface DonutChartDatum {
  label: string;
  value: number;
  colorIndex?: number;
}

export interface DonutChartProps {
  data: readonly DonutChartDatum[];
  /** Nome acessível do gráfico inteiro (obrigatório — caption da tabela). */
  'aria-label': string;
  /** Valor grande no centro (ex.: "R$ 85,6k"). */
  centerValue?: React.ReactNode;
  /** Legenda curta sob o valor central. */
  centerLabel?: string;
  /** Formata valores (legenda/tooltip/tabela). Default: inteiro pt-BR. */
  formatValue?: (value: number) => string;
  /** Diâmetro do plot em px. */
  size?: number;
  className?: string;
}

interface TooltipPayloadItem {
  payload: DonutChartDatum & { _total: number };
}

function DonutTooltip({
  active,
  payload,
  formatValue,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  formatValue: (value: number) => string;
}): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]!.payload;
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-overlay)] px-[var(--spacing-3)] py-[var(--spacing-2)] shadow-[var(--elevation-2)]">
      <p className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        {d.label}
      </p>
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)] [font-variant-numeric:tabular-nums]">
        {formatValue(d.value)} · {pctOf(d.value, d._total)}%
      </p>
    </div>
  );
}

export function DonutChart({
  data,
  'aria-label': ariaLabel,
  centerValue,
  centerLabel,
  formatValue = formatChartInt,
  size = 200,
  className,
}: DonutChartProps): JSX.Element {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const rows = data.map((d, i) => ({ ...d, colorIndex: d.colorIndex ?? i, _total: total }));

  return (
    <div className={cn('flex flex-col gap-[var(--spacing-4)]', className)}>
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <div role="img" aria-label={ariaLabel} className="h-full w-full">
          <ChartErrorBoundary>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip content={<DonutTooltip formatValue={formatValue} />} />
              <Pie
                data={rows}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius="66%"
                outerRadius="100%"
                paddingAngle={2}
                startAngle={90}
                endAngle={-270}
                stroke="var(--surface-raised)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {rows.map((d) => (
                  <Cell key={d.label} fill={chartCategoryVar(d.colorIndex)} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          </ChartErrorBoundary>
        </div>
        {(centerValue || centerLabel) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && (
              <span className="font-display italic font-[var(--font-weight-bold)] text-[length:var(--font-size-lg)] text-[var(--text-primary)] [font-variant-numeric:tabular-nums]">
                {centerValue}
              </span>
            )}
            {centerLabel && (
              <span className="text-[length:var(--font-size-xs)] text-[var(--text-tertiary)]">
                {centerLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Legenda (dataviz §6: ≥2 séries → legenda sempre presente). */}
      <ul role="list" className="flex flex-col gap-[var(--spacing-2)]">
        {rows.map((d) => (
          <li key={d.label} className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-sm)]">
            <span
              aria-hidden
              className="h-[var(--chart-swatch-size)] w-[var(--chart-swatch-size)] shrink-0 rounded-[var(--chart-swatch-radius)]"
              style={{ background: chartCategoryVar(d.colorIndex) }}
            />
            <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{d.label}</span>
            <span className="text-[var(--text-secondary)] [font-variant-numeric:tabular-nums]">
              {formatValue(d.value)}
            </span>
            <span className="w-[var(--chart-legend-pct-w)] text-right text-[var(--text-tertiary)] [font-variant-numeric:tabular-nums]">
              {pctOf(d.value, total)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

DonutChart.displayName = 'DonutChart';
