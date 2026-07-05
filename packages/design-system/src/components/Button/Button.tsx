/**
 * Button — §2.16 flat, sem borda decorativa.
 *
 * PROVENIÊNCIA: miolo shadcn stock `button` (Slot + cva) restilizado ao brasa.
 * O stock JÁ é a nossa arquitetura (Radix Slot + class-variance-authority). Diff
 * vs stock (esteira shadcn→brasa, mesma receita do Tooltip):
 *   - API pública PRESERVADA: variantes primary|secondary|ghost|destructive e
 *     sizes sm|md|lg (NÃO os nomes stock default/outline/link/icon) — as ~33
 *     telas do painel importam por estes nomes;
 *   - cores de estado por TOKEN semântico (bg-[var(--action-*)] /
 *     text-[var(--action-*-fg)] + hover/active em --action-*-hover|-pressed): a
 *     matriz de contraste referencia esses tokens DIRETO e outros componentes
 *     compõem sobre eles (ex.: ConfirmModal afirma o botão destrutivo pelo token),
 *     então ficam token (não alias) — o stock usaria `bg-primary/90`, modificador
 *     de alpha PROIBIDO com var() hex, trocado por token de estado do brasa;
 *   - focus ring por ALIAS shadcn→brasa: ring-ring (= border-focus) +
 *     ring-offset-background (= surface-base), com largura por token
 *     (--btn-focus-ring) — prova a ponte de aliases no anel de foco;
 *   - dimensões (altura/px/font) por token de componente (--btn-*), motion
 *     tokenizado, flat (border-0) e opacity de disabled do brasa (40).
 *
 * AA: todos os pares fg/bg caem na matriz já provada — cada action-*-fg sobre a
 * própria superfície de ação e seus estados hover/pressed (contrast.test.ts) e
 * ring/offset por alias (shadcn-aliases.test.ts). Nenhum par novo.
 *
 * A11y: type="button" por padrão (evita submit acidental); foco via ring;
 * `aria-disabled` reflete o estado disabled; contraste WCAG AA em todos os pares.
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
    'ring-offset-background',
    'transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
    // Focus ring — cor por alias (ring = border-focus), largura por token, offset AA
    'focus-visible:outline-none',
    'focus-visible:ring-[length:var(--btn-focus-ring)]',
    'focus-visible:ring-ring',
    'focus-visible:ring-offset-2',
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
