/**
 * Modal — diálogo base sobre Radix Dialog (§2.15 base).
 *
 * PROVENIÊNCIA: miolo shadcn stock `dialog` (Radix Dialog: Portal + Overlay +
 * Content) restilizado ao brasa — mesma receita do Tooltip/A3. Diff vs stock:
 *   - API pública PRESERVADA: componente único <Modal open/onOpenChange/title/
 *     description/size/footer/children/className> (NÃO os sub-componentes stock
 *     DialogHeader/Footer/…) — as ~33 telas importam por esta forma;
 *   - superfície do conteúdo por ALIAS shadcn→brasa: bg-card (= surface-raised),
 *     provando a ponte; anel de foco do X por alias ring-ring (= border-focus) +
 *     ring-offset-background (= surface-base);
 *   - overlay com alpha via TOKEN dedicado --modal-overlay-bg (o stock usa
 *     bg-black/80 — modificador de alpha PROIBIDO com var() hex) + blur por token;
 *   - larguras/radius/spacing por token de componente (--modal-*, --radius-lg);
 *   - MOTION tokenizado (A2): overlay fade in/out, conteúdo fade+zoom in/out via
 *     classes stock do tailwindcss-animate embrulhado — animate-in/out sem
 *     modificador roda em var(--motion-duration-fast)+var(--motion-easing-default)
 *     (animationDuration/TimingFunction.DEFAULT no preset). Zero duração/easing cru.
 *     Centrado mantido (translate); sem slide para não descentralizar.
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
 *
 * AA: par foreground/card = text-primary/surface-raised (contrast.test.ts L88);
 * anel de foco por alias (shadcn-aliases.test.ts). Nenhum par novo.
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
            // Motion (A2): fade tokenizado no enter/exit
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
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
            // Superfície via alias shadcn→brasa (card = surface-raised)
            'bg-card',
            'rounded-[var(--radius-lg)]',
            'shadow-[var(--elevation-3)]',
            'p-[var(--spacing-6)]',
            'flex flex-col gap-[var(--spacing-4)]',
            'focus:outline-none',
            // Motion (A2): fade + zoom tokenizado, centrado (sem slide)
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
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
                // Anel de foco por alias shadcn→brasa (ring = border-focus,
                // ring-offset-background = surface-base)
                'ring-offset-background',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-ring',
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
