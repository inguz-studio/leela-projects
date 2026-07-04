// =============================================================================
// KpiCard — card flat (§2.16) de indicador. Usado no hub (KPIs globais), no
// Overview e na tela de membros. Presentational puro (só props).
// =============================================================================

import { cn } from '@leela/design-system';

export interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}

export function KpiCard({ label, value, hint, className }: KpiCardProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col gap-[var(--spacing-1)]',
        'rounded-[var(--card-radius)] bg-[var(--surface-raised)]',
        'p-[var(--spacing-5)]',
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
