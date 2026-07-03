/**
 * Divider — separador horizontal ou vertical.
 *
 * Variantes: subtle | default | strong
 * §2.16 — divider é exceção permitida ao flat (borda decorativa OK).
 *
 * A11y: role="separator" com aria-orientation.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Variant definitions
// ---------------------------------------------------------------------------

const dividerVariants = cva(
  'shrink-0 border-0',
  {
    variants: {
      variant: {
        subtle:  'bg-[var(--border-subtle)]',
        default: 'bg-[var(--border-default)]',
        strong:  'bg-[var(--border-strong)]',
      },
      orientation: {
        horizontal: 'h-[var(--divider-thickness)] w-full my-[var(--spacing-2)]',
        vertical:   'w-[var(--divider-thickness)] h-full mx-[var(--spacing-2)]',
      },
    },
    defaultVariants: {
      variant:     'default',
      orientation: 'horizontal',
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface DividerProps
  extends React.HTMLAttributes<HTMLHRElement>,
    VariantProps<typeof dividerVariants> {}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Divider({ className, variant, orientation, ...props }: DividerProps): JSX.Element {
  return (
    <hr
      role="separator"
      aria-orientation={orientation ?? 'horizontal'}
      className={cn(dividerVariants({ variant, orientation, className }))}
      {...props}
    />
  );
}

Divider.displayName = 'Divider';

export { Divider };
