// =============================================================================
// Sparkline — mini gráfico de linha inline (SVG puro, sem lib). Presentational.
// Vazio (Onda 1 — sem série de conversão) → não renderiza nada.
// Cor via token semântico (stroke currentColor herdado do container).
// =============================================================================

export interface SparklineProps {
  values: number[];
  className?: string;
}

export function Sparkline({ values, className }: SparklineProps): JSX.Element | null {
  if (values.length < 2) return null;

  const w = 64;
  const h = 20;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = w / (values.length - 1);

  const pontos = values
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${w} ${h}`}
      className={className}
      width={w}
      height={h}
      preserveAspectRatio="none"
    >
      <polyline
        points={pontos}
        fill="none"
        stroke="var(--action-primary)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

Sparkline.displayName = 'Sparkline';
