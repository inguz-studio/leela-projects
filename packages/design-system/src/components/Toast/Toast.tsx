/**
 * Toast — feedback de ação de escrita (DoD Tela).
 *
 * PROVENIÊNCIA (Lote A restante, decisão bd31974): VISUAL shadcn `toast`,
 * COMPORTAMENTO nosso. O frame adota a receita stock (rounded-md + border +
 * shadow + animate-in) via classes de ALIAS shadcn→brasa (border-border,
 * bg-popover = surface-overlay — mesma cor resolvida de antes) e motion
 * tokenizado (A2: animate-in roda em var(--motion-duration-fast)). A fila do
 * `useToast` (ToastProvider) fica INTACTA — nada de Radix Toast primitives.
 *
 * Regras preservadas do E01:
 *   - Some em 4s; variante danger persiste até dismiss manual (ToastProvider).
 *   - Borda esquerda 3px por variante (--toast-border-left + feedback-*) —
 *     marcador semântico brasa, sobrepõe a borda stock só no lado esquerdo.
 *   - danger usa role="alert" (assertivo); demais role="status" (polite).
 *
 * AA: título/descrição sobre bg-popover = text-primary|secondary sobre
 * surface-overlay; borda esquerda = feedback-* sobre surface-overlay — todos
 * na matriz de contraste (contrast.test.ts). border-border é decorativa
 * (frame shadcn), não-funcional — fora do gate 1.4.11.
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const toastVariants = cva(
  [
    'group relative flex items-start gap-[var(--spacing-3)]',
    'w-[var(--toast-width)] max-w-[calc(100vw-var(--spacing-8))]',
    // Frame shadcn stock via aliases: superfície + borda + raio + elevação
    'bg-popover',
    'rounded-md border border-border',
    'shadow-elev-2',
    'p-[var(--spacing-4)]',
    // Marcador semântico brasa (E01): borda esquerda por variante
    'border-l-[length:var(--toast-border-left)]',
    // Motion tokenizado (A2): entrada stock do toast shadcn
    'animate-in fade-in-0 slide-in-from-bottom-2',
  ].join(' '),
  {
    variants: {
      variant: {
        success: 'border-l-[color:var(--feedback-success)]',
        danger: 'border-l-[color:var(--feedback-danger)]',
        warning: 'border-l-[color:var(--feedback-warning)]',
        info: 'border-l-[color:var(--feedback-info)]',
      },
    },
    defaultVariants: {
      variant: 'info',
    },
  },
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type ToastVariant = NonNullable<VariantProps<typeof toastVariants>['variant']>;

export interface ToastProps {
  title: string;
  description?: string | undefined;
  variant?: ToastVariant;
  onDismiss?: () => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Toast({
  title,
  description,
  variant = 'info',
  onDismiss,
  className,
}: ToastProps): JSX.Element {
  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      className={cn(toastVariants({ variant }), className)}
    >
      <div className="flex flex-col gap-[var(--spacing-1)] min-w-0 flex-1">
        <p className="text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]">
          {title}
        </p>
        {description && (
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {description}
          </p>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          aria-label="Fechar notificação"
          onClick={onDismiss}
          className={cn(
            'shrink-0 inline-flex items-center justify-center',
            'h-[var(--spacing-6)] w-[var(--spacing-6)]',
            'rounded-[var(--radius-sm)]',
            'text-[var(--text-secondary)]',
            'hover:bg-accent hover:text-accent-foreground',
            'transition-colors duration-[var(--motion-duration-fast)]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-ring',
          )}
        >
          <span aria-hidden>✕</span>
        </button>
      )}
    </div>
  );
}

Toast.displayName = 'Toast';

export { Toast, toastVariants };
