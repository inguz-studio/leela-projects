// =============================================================================
// KpiCard — card flat (§2.16) de indicador. Usado no hub (KPIs globais) e no
// Overview do evento. Presentational puro (só props). `emphasis="critico"` usa
// a única exceção ao flat permitida no épico: border-left Vulcão.
// =============================================================================

import { cn } from '@leela/design-system';

export interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  emphasis?: 'default' | 'critico';
  className?: string;
}

export function KpiCard({
  label,
  value,
  hint,
  emphasis = 'default',
  className,
}: KpiCardProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col gap-[var(--spacing-1)]',
        'rounded-[var(--card-radius)] bg-[var(--surface-raised)]',
        'p-[var(--spacing-5)]',
        emphasis === 'critico' &&
          'border-l-4 border-l-[var(--border-danger)] pl-[var(--spacing-4)]',
        className,
      )}
    >
      <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
        {label}
      </span>
      <span className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] text-[var(--text-primary)]">
        {value}
      </span>
      {hint ? (
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

KpiCard.displayName = 'KpiCard';
