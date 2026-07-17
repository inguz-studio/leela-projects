// =============================================================================
// BarChart — barras categóricas horizontais (Recharts · ADR-010). Componente do
// DESIGN SYSTEM, tokenizado (cores `--chart-cat-*`, trilho `--chart-track`),
// tema brasa/wine, WCAG AA. Segue a skill `dataviz`:
//   • forma: magnitude por categoria → barras;
//   • cor: categórica em ordem FIXA (chartCategoryVar), rótulo direto sempre
//     presente (encoding secundário — a cor nunca é a única pista);
//   • marcas finas, ponta arredondada 4px ancorada na base, trilho recessivo;
//   • camada de hover (tooltip) por padrão;
//   • acessibilidade: role="img" + aria-label + TABELA equivalente (sr-only) —
//     identidade nunca só-cor, e existe "table view" (dataviz §6).
//
// Recharts é a lib de gráfico DECIDIDA (ADR-010 §complementos). Sem eixo duplo.
// =============================================================================

import {
  Bar,
  BarChart as RBarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '../../utils/cn';
import { chartCategoryVar, formatChartInt, pctOf } from './chartPalette';
import { ChartErrorBoundary } from './ChartErrorBoundary';

export interface BarChartDatum {
  /** Nome da categoria (identidade — vira rótulo direto e linha da tabela). */
  label: string;
  /** Magnitude da barra. */
  value: number;
  /** Total opcional da categoria (ex.: vagas) — habilita "x / total" e %. */
  total?: number;
  /** Índice de cor categórica (0-based). Default: ordem no array. */
  colorIndex?: number;
}

export interface BarChartProps {
  data: readonly BarChartDatum[];
  /** Nome acessível do gráfico inteiro (obrigatório — é o caption da tabela). */
  'aria-label': string;
  /** Formata o valor exibido (rótulo/tooltip/tabela). Default: inteiro pt-BR. */
  formatValue?: (value: number) => string;
  /** Altura do plot em px (o total = maior `total`/`value` das barras). */
  height?: number;
  className?: string;
}

interface TooltipPayloadItem {
  payload: BarChartDatum;
}

function ChartTooltip({
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
  const temTotal = typeof d.total === 'number' && d.total > 0;
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-overlay)] px-[var(--spacing-3)] py-[var(--spacing-2)] shadow-[var(--elevation-2)]">
      <p className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
        {d.label}
      </p>
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)] [font-variant-numeric:tabular-nums]">
        {formatValue(d.value)}
        {temTotal ? ` / ${formatValue(d.total as number)} · ${pctOf(d.value, d.total as number)}%` : ''}
      </p>
    </div>
  );
}

export function BarChart({
  data,
  'aria-label': ariaLabel,
  formatValue = formatChartInt,
  height = 200,
  className,
}: BarChartProps): JSX.Element {
  const rows = data.map((d, i) => ({ ...d, colorIndex: d.colorIndex ?? i }));
  const domainMax = Math.max(
    1,
    ...rows.map((d) => (typeof d.total === 'number' && d.total > 0 ? d.total : d.value)),
  );

  return (
    <div className={cn('w-full', className)}>
      {/* Plot visível — decorativo p/ SR (a tabela abaixo carrega a semântica). */}
      <div role="img" aria-label={ariaLabel} style={{ width: '100%', height }}>
        <ChartErrorBoundary>
        <ResponsiveContainer width="100%" height="100%">
          <RBarChart
            layout="vertical"
            data={rows}
            margin={{ top: 4, right: 44, bottom: 4, left: 8 }}
            barCategoryGap="28%"
          >
            <XAxis type="number" domain={[0, domainMax]} hide />
            <YAxis
              type="category"
              dataKey="label"
              width={92}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 13 }}
            />
            <Tooltip
              cursor={{ fill: 'var(--chart-track)', opacity: 0.4 }}
              content={<ChartTooltip formatValue={formatValue} />}
            />
            <Bar
              dataKey="value"
              barSize={12}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
              background={{ fill: 'var(--chart-track)', radius: 6 }}
            >
              {rows.map((d) => (
                <Cell key={d.label} fill={chartCategoryVar(d.colorIndex)} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                formatter={(value) => formatValue(Number(value))}
                fill="var(--text-secondary)"
                fontSize={12}
              />
            </Bar>
          </RBarChart>
        </ResponsiveContainer>
        </ChartErrorBoundary>
      </div>

      {/* Table view (dataviz §6) — equivalente textual, oculto visualmente. */}
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Categoria</th>
            <th scope="col">Valor</th>
            <th scope="col">%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.label}>
              <th scope="row">{d.label}</th>
              <td>
                {typeof d.total === 'number' && d.total > 0
                  ? `${formatValue(d.value)} / ${formatValue(d.total)}`
                  : formatValue(d.value)}
              </td>
              <td>{typeof d.total === 'number' && d.total > 0 ? `${pctOf(d.value, d.total)}%` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

BarChart.displayName = 'BarChart';
