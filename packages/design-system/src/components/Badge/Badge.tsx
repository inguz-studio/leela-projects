/**
 * Badge — indicador semântico de estado/categoria.
 *
 * PROVENIÊNCIA: miolo shadcn stock `badge` (cva) restilizado ao brasa. Diff vs
 * stock (esteira shadcn→brasa):
 *   - API pública PRESERVADA: variantes semânticas brand|heroico|vulcao|vitoria|
 *     alerta|neutro (NÃO os nomes stock default/secondary/destructive/outline);
 *   - `brand` por alias (bg-primary/text-primary-foreground = action-primary/-fg,
 *     provado em shadcn-aliases.test.ts); `neutro` por alias bg-muted
 *     (= surface-overlay) + text-secondary (par na matriz L93);
 *   - variantes de feedback (heroico/vulcao/vitoria/alerta) por TOKEN dedicado
 *     (--feedback-*-surface/-fg): não há alias shadcn para a paleta de feedback,
 *     e o par fg/surface já está na matriz. Desde o D-PATCH o heroico usa a
 *     família rosa --feedback-heroico-* (paleta Be Hero restaurada) — o azul
 *     info não existe no mockup e saiu do tema brasa;
 *   - flat (border-0): o stock traz `border`; o brasa é flat (§2.16);
 *   - dimensões/tipo/radius por token de componente (--badge-*).
 *
 * AA: nenhum par novo — todos caem na matriz de contraste já provada.
 * A11y: use aria-label para contexto quando o texto não bastar.
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
        brand:   'bg-primary text-primary-foreground',
        heroico: 'bg-[var(--feedback-heroico-surface)] text-[var(--feedback-heroico-fg)]',
        vulcao:  'bg-[var(--feedback-danger-surface)] text-[var(--feedback-danger-fg)]',
        vitoria: 'bg-[var(--feedback-success-surface)] text-[var(--feedback-success-fg)]',
        alerta:  'bg-[var(--feedback-warning-surface)] text-[var(--feedback-warning-fg)]',
        neutro:  'bg-muted text-[var(--text-secondary)]',
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
