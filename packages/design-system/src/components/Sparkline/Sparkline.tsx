/**
 * Sparkline — mini gráfico de linha com preenchimento em degradê (mockup
 * be-hero `.sparkline`: 100% de largura, 28px de altura, linha 1.5 na cor da
 * marca com fill vertical .4→0).
 *
 * Token-only por herança: linha e degradê usam `currentColor` — o consumidor
 * pinta com um token semântico (ex.: `text-[var(--text-brand)]`). O degradê é
 * um <linearGradient> com stops em `currentColor` + stop-opacity (.4 → 0),
 * id único via useId (várias sparklines na mesma página não colidem).
 * Altura via token de componente (--kpi-sparkline-h).
 *
 * A11y: decorativa por padrão (aria-hidden); com `aria-label` vira role="img".
 * Dados: `values.length < 2` → não renderiza nada (sem série, sem gráfico —
 * estado honesto fica com o consumidor).
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Geometria (viewBox fixo do mockup: 120×28, preserveAspectRatio none)
// ---------------------------------------------------------------------------

const VIEW_W = 120;
const VIEW_H = 28;

export interface SparklineProps {
  values: readonly number[];
  /** Descreve a série para leitores de tela; sem ele a sparkline é decorativa. */
  'aria-label'?: string;
  className?: string;
}

/** Pontos normalizados min/max → coordenadas do viewBox. @pure */
function toPoints(values: readonly number[]): Array<[number, number]> {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = VIEW_W / (values.length - 1);

  return values.map((v, i) => {
    const x = i * step;
    const y = VIEW_H - ((v - min) / span) * VIEW_H;
    return [Number(x.toFixed(1)), Number(y.toFixed(1))];
  });
}

function Sparkline({
  values,
  'aria-label': ariaLabel,
  className,
}: SparklineProps): JSX.Element | null {
  const gradientId = React.useId();

  if (values.length < 2) return null;

  const pts = toPoints(values);
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
  const fill = `${line} L${VIEW_W},${VIEW_H} L0,${VIEW_H} Z`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="none"
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className={cn('block w-full h-[var(--kpi-sparkline-h)]', className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.4" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

Sparkline.displayName = 'Sparkline';

export { Sparkline };
