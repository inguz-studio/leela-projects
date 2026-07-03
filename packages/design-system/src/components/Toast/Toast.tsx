/**
 * Toast — feedback de ação de escrita (DoD Tela).
 *
 * Regras:
 *   - Some em 4s; variante danger persiste até dismiss manual (ToastProvider).
 *   - Borda esquerda 3px por variante (--toast-border-left + feedback-*).
 *   - danger usa role="alert" (assertivo); demais role="status" (polite).
 *
 * §2.16 flat — se diferencia por surface-overlay + elevação; a borda
 * esquerda é o marcador semântico da variante (mesma exceção do card crítico).
 */

import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const toastVariants = cva(
  [
    'flex items-start gap-[var(--spacing-3)]',
    'w-[var(--toast-width)] max-w-[calc(100vw-var(--spacing-8))]',
    'bg-[var(--surface-overlay)]',
    'rounded-[var(--radius-md)]',
    'shadow-[var(--elevation-2)]',
    'p-[var(--spacing-4)]',
    'border-l-[length:var(--toast-border-left)]',
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
            'hover:text-[var(--text-primary)] hover:bg-[var(--action-ghost-hover)]',
            'transition-colors duration-[var(--motion-duration-fast)]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[color:var(--border-focus)]',
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
