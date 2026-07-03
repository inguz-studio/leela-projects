/**
 * Modal — diálogo base sobre Radix Dialog (§2.15 base).
 *
 * Larguras: sm 480px / md 560px / lg 640px (tokens --modal-width-*).
 * Overlay com blur (tokens --modal-overlay-bg / --modal-overlay-blur).
 *
 * 4 vias de fechamento:
 *   1. Botão X (Dialog.Close)
 *   2. Esc (Radix)
 *   3. Click no overlay (Radix onInteractOutside)
 *   4. Botão cancelar no footer (consumidor chama onOpenChange(false))
 *
 * A11y: role="dialog" + aria-labelledby (Dialog.Title) + aria-describedby
 * quando há description; focus trap e retorno de foco por conta do Radix.
 * §2.16 flat — conteúdo se diferencia por surface-raised + elevação.
 */

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | undefined;
  size?: ModalSize;
  children?: React.ReactNode;
  /** Slot de rodapé — botões de ação (ex.: cancelar + confirmar). */
  footer?: React.ReactNode;
  className?: string;
}

const sizeClass: Record<ModalSize, string> = {
  sm: 'w-[var(--modal-width-sm)]',
  md: 'w-[var(--modal-width-md)]',
  lg: 'w-[var(--modal-width-lg)]',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  children,
  footer,
  className,
}: ModalProps): JSX.Element {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-testid="modal-overlay"
          className={cn(
            'fixed inset-0 z-50',
            'bg-[var(--modal-overlay-bg)]',
            'backdrop-blur-[var(--modal-overlay-blur)]',
          )}
        />
        <Dialog.Content
          // Sem description, desliga o aria-describedby default do Radix
          {...(description ? {} : { 'aria-describedby': undefined })}
          className={cn(
            'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
            sizeClass[size],
            'max-w-[calc(100vw-var(--spacing-8))]',
            'max-h-[calc(100vh-var(--spacing-8))]',
            'overflow-y-auto',
            'bg-[var(--surface-raised)]',
            'rounded-[var(--radius-lg)]',
            'shadow-[var(--elevation-3)]',
            'p-[var(--spacing-6)]',
            'flex flex-col gap-[var(--spacing-4)]',
            'focus:outline-none',
            className,
          )}
        >
          {/* Header: título + X */}
          <div className="flex items-start justify-between gap-[var(--spacing-4)]">
            <Dialog.Title
              className={cn(
                'text-[length:var(--font-size-lg)]',
                'font-[var(--font-weight-bold)]',
                'text-[var(--text-primary)]',
              )}
            >
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Fechar"
              className={cn(
                'shrink-0 inline-flex items-center justify-center',
                'h-[var(--btn-height-sm)] w-[var(--btn-height-sm)]',
                'rounded-[var(--radius-sm)]',
                'text-[var(--text-secondary)]',
                'hover:text-[var(--text-primary)] hover:bg-[var(--action-ghost-hover)]',
                'transition-colors duration-[var(--motion-duration-fast)]',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-[color:var(--border-focus)]',
              )}
            >
              <span aria-hidden>✕</span>
            </Dialog.Close>
          </div>

          {description && (
            <Dialog.Description className="text-[length:var(--font-size-base)] text-[var(--text-secondary)]">
              {description}
            </Dialog.Description>
          )}

          {children}

          {footer && (
            <div className="flex items-center justify-end gap-[var(--spacing-3)] pt-[var(--spacing-2)]">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

Modal.displayName = 'Modal';

export { Modal };
