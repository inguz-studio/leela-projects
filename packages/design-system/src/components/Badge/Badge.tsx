/**
 * Badge — indicador semântico de estado/categoria.
 *
 * Variantes semânticas (nunca misturar semântica):
 *   brand | heroico | volcao | vitoria | alerta | neutro
 *
 * §2.16 flat — sem borda decorativa.
 * A11y: role="status" implícito; use aria-label para contexto quando necessário.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Variant definitions
// ---------------------------------------------------------------------------

const badgeVariants = cva(
  [
    'inline-flex items-center justify-center',
    'h-[var(--badge-height)] px-[var(--badge-px)]',
    'rounded-[var(--badge-radius)]',
    'text-[length:var(--badge-font-size)] font-[var(--badge-font-weight)]',
    'whitespace-nowrap select-none',
    // Flat (§2.16)
    'border-0',
  ].join(' '),
  {
    variants: {
      variant: {
        brand:   'bg-[var(--action-primary)] text-[var(--action-primary-fg)]',
        heroico: 'bg-[var(--feedback-info-surface)] text-[var(--feedback-info-fg)]',
        volcao:  'bg-[var(--feedback-danger-surface)] text-[var(--feedback-danger-fg)]',
        vitoria: 'bg-[var(--feedback-success-surface)] text-[var(--feedback-success-fg)]',
        alerta:  'bg-[var(--feedback-warning-surface)] text-[var(--feedback-warning-fg)]',
        neutro:  'bg-[var(--surface-overlay)] text-[var(--text-secondary)]',
      },
    },
    defaultVariants: {
      variant: 'neutro',
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Badge({ className, variant, ...props }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  );
}

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
