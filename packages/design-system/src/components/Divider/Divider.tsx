/**
 * Divider — separador horizontal ou vertical.
 *
 * PROVENIÊNCIA: miolo shadcn stock `separator` (sobre @radix-ui/react-separator)
 * re-exportado como Divider. Diff vs stock (esteira shadcn→brasa):
 *   - API pública PRESERVADA: nome `Divider`/`DividerProps`, variantes
 *     subtle|default|strong e orientation horizontal|vertical (o stock só tem
 *     orientation) — o barrel do DS não muda;
 *   - o Radix garante role="separator" (decorative=false) e data-orientation; o
 *     brasa reintroduz `aria-orientation` explícito também no horizontal (o Radix
 *     o omite por ser o default ARIA) para preservar o contrato de a11y anterior;
 *   - peso por token: variantes por bg (border-subtle/default/strong; `default`
 *     via alias bg-border = border-default), espessura/margem por token
 *     (--divider-thickness, --spacing-2). Decorativa — isenta de 1.4.11.
 *
 * A11y: role="separator" + aria-orientation.
 */

import * as React from 'react';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
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
        default: 'bg-border',
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
  extends Omit<
      React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>,
      'orientation'
    >,
    VariantProps<typeof dividerVariants> {}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Divider = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  DividerProps
>(({ className, variant, orientation, ...props }, ref) => {
  const dir = orientation ?? 'horizontal';
  return (
    <SeparatorPrimitive.Root
      ref={ref}
      orientation={dir}
      // Radix omite aria-orientation no horizontal (default ARIA); reintroduz
      // explícito para manter o contrato de a11y do DS.
      aria-orientation={dir}
      className={cn(dividerVariants({ variant, orientation: dir, className }))}
      {...props}
    />
  );
});
Divider.displayName = 'Divider';

export { Divider };
