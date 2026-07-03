/**
 * CardDesafio — card de desafio com progresso (T4).
 *
 * - Progress bar em Vitória (feedback-success).
 * - 100% concluído → glow elev-brand no card.
 * - A11y: role="progressbar" com aria-valuenow/min/max e rótulo.
 * - §2.16 flat — sem borda; diferencia-se por surface-raised.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CardDesafioProps {
  title: string;
  /** Progresso 0–100 (valores fora da faixa são grampeados). */
  progress: number;
  /** Metadados: prazo, recompensa, participantes. */
  meta?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CardDesafio({
  title,
  progress,
  meta,
  icon,
  className,
}: CardDesafioProps): JSX.Element {
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));
  const complete = clamped >= 100;

  return (
    <article
      className={cn(
        'flex flex-col gap-[var(--spacing-3)]',
        'bg-[var(--surface-raised)]',
        'rounded-[var(--card-radius)]',
        'p-[var(--spacing-4)]',
        complete && 'shadow-[var(--elevation-brand)]',
        className,
      )}
    >
      <div className="flex items-start gap-[var(--spacing-3)]">
        {icon && (
          <span
            aria-hidden
            className="shrink-0 w-[var(--icon-size)] h-[var(--icon-size)] flex items-center justify-center text-[var(--text-brand)]"
          >
            {icon}
          </span>
        )}
        <div className="flex flex-col gap-[var(--spacing-1)] min-w-0 flex-1">
          <h3
            className={cn(
              'text-[length:var(--font-size-md)]',
              'font-[var(--font-weight-semibold)]',
              'text-[var(--text-primary)]',
            )}
          >
            {title}
          </h3>
          {meta && (
            <div className="flex items-center gap-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
              {meta}
            </div>
          )}
        </div>
      </div>

      {/* Progresso — Vitória */}
      <div className="flex items-center gap-[var(--spacing-3)]">
        <div
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso: ${clamped}%`}
          className={cn(
            'h-[var(--spacing-2)] flex-1',
            'rounded-[var(--radius-pill)]',
            'bg-[var(--surface-overlay)]',
            'overflow-hidden',
          )}
        >
          <div
            className={cn(
              'h-full rounded-[var(--radius-pill)]',
              'bg-[var(--feedback-success)]',
              'motion-safe:transition-[width]',
              'motion-safe:duration-[var(--motion-duration-normal)]',
            )}
            style={{ width: `${clamped}%` }}
          />
        </div>
        <span
          className={cn(
            'text-[length:var(--font-size-sm)]',
            'font-[var(--font-weight-semibold)]',
            complete ? 'text-[var(--text-success)]' : 'text-[var(--text-secondary)]',
          )}
        >
          {clamped}%
        </span>
      </div>
    </article>
  );
}

CardDesafio.displayName = 'CardDesafio';

export { CardDesafio };
