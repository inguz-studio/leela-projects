// =============================================================================
// KpiCard — card flat (§2.16) de indicador das telas de plataforma. Promovido
// do inline do MacroDashboard para reuso local (mesmo padrão de
// clubes/_components e eventos/_components — NÃO é componente do DS). Usado no
// dashboard macro (KPIs globais) e no detalhe do tenant (saúde/contexto).
// Presentational puro (só props).
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
      <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
        {label}
      </span>
      <span className="text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)] [font-variant-numeric:tabular-nums] text-[var(--text-primary)]">
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
