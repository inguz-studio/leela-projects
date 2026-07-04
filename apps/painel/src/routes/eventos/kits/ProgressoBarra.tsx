// =============================================================================
// ProgressoBarra — barra de progresso acessível (§2.5 distribuição de kits).
// Token-based; role=progressbar com aria-valuenow. Presentational.
// =============================================================================

export interface ProgressoBarraProps {
  /** 0..100 */
  pct: number;
  label: string;
}

export function ProgressoBarra({ pct, label }: ProgressoBarraProps): JSX.Element {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-[var(--spacing-2)] w-full overflow-hidden rounded-[var(--radius-pill)] bg-[var(--surface-overlay)]"
    >
      <div
        className="h-full rounded-[var(--radius-pill)] bg-[var(--action-primary)]"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

ProgressoBarra.displayName = 'ProgressoBarra';
