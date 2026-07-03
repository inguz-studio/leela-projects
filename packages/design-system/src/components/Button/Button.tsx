/**
 * Button — §2.16 flat, sem borda decorativa.
 *
 * Variantes: primary | secondary | ghost | destructive
 * Sizes:     sm | md | lg
 * Estados:   default, hover, pressed (active), disabled, focus-visible
 *
 * A11y:
 * - type="button" por padrão (evita submit acidental)
 * - foco via ring 2 px (border-focus token)
 * - contraste WCAG AA em todos os pares variante/estado
 * - `aria-disabled` reflete estado disabled
 *
 * Tokens consumidos: apenas semantic/component (nunca hex/primitivo direto).
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Variant definitions
// ---------------------------------------------------------------------------

const buttonVariants = cva(
  // ── Base ─────────────────────────────────────────────────────────────────
  [
    'inline-flex items-center justify-center gap-2',
    'font-[var(--btn-font-weight)] not-italic select-none whitespace-nowrap',
    'rounded-[var(--btn-radius)]',
    'transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
    // Focus ring — contraste AA, 2 px offset
    'focus-visible:outline-none',
    'focus-visible:ring-[length:var(--btn-focus-ring)]',
    'focus-visible:ring-[color:var(--border-focus)]',
    'focus-visible:ring-offset-2',
    'focus-visible:ring-offset-[color:var(--surface-base)]',
    // Disabled
    'disabled:pointer-events-none disabled:opacity-40',
    // Flat (§2.16): sem borda decorativa
    'border-0',
  ].join(' '),
  {
    variants: {
      variant: {
        primary: [
          'bg-[var(--action-primary)] text-[var(--action-primary-fg)]',
          'hover:bg-[var(--action-primary-hover)]',
          'active:bg-[var(--action-primary-pressed)]',
        ].join(' '),

        secondary: [
          'bg-[var(--action-secondary)] text-[var(--action-secondary-fg)]',
          'hover:bg-[var(--action-secondary-hover)]',
          'active:bg-[var(--action-secondary)]',
        ].join(' '),

        ghost: [
          'bg-transparent text-[var(--action-ghost-fg)]',
          'hover:bg-[var(--action-ghost-hover)]',
          'active:bg-[var(--action-ghost-hover)]',
        ].join(' '),

        destructive: [
          'bg-[var(--action-destructive)] text-[var(--action-destructive-fg)]',
          'hover:bg-[var(--action-destructive-hover)]',
          'active:bg-[var(--action-destructive-pressed)]',
        ].join(' '),
      },

      size: {
        sm: 'h-[var(--btn-height-sm)] px-[var(--btn-px-sm)] text-[length:var(--btn-font-size-sm)]',
        md: 'h-[var(--btn-height-md)] px-[var(--btn-px-md)] text-[length:var(--btn-font-size-md)]',
        lg: 'h-[var(--btn-height-lg)] px-[var(--btn-px-lg)] text-[length:var(--btn-font-size-lg)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * When true, renders the Radix Slot — passes all props to the immediate child.
   * Useful for wrapping <Link> elements.
   */
  asChild?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      type = 'button',
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled}
        aria-disabled={disabled}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
