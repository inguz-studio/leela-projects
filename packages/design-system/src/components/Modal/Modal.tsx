/**
 * Modal — diálogo base do PAINEL, Radix-free (ADR-017, pendência (1)).
 *
 * PROVENIÊNCIA: era o miolo shadcn stock `dialog` (Radix Dialog: Portal +
 * Overlay + Content) restilizado ao brasa. A convergência da pendência (1) do
 * ADR-017 troca o motor Radix pelo comportamento ADQUIRIDO compartilhado
 * (`useDialogBehavior` — a mesma parte perigosa que o `Dialog` público e o
 * `RegulamentoModal` da landing provaram): focus trap cíclico, Esc, scroll-lock
 * e retorno de foco passam a ter UMA implementação no DS. Some o
 * `@radix-ui/react-dialog` do grafo do painel também — o ganho de bundle do
 * ADR-017 chega ao painel ("desempenho em ambos").
 *
 * API pública PRESERVADA byte a byte: componente único <Modal open/onOpenChange/
 * title/description/size/footer/children/className> (NÃO os sub-componentes stock
 * DialogHeader/Footer/…). As ~26 telas do painel e o ConfirmModal seguem
 * importando por esta forma, sem tocar em consumidor.
 *
 * DOM/skin PRESERVADOS (os testes existentes passam sem afrouxar asserção):
 *   - portaliza para document.body (paridade com o Radix Portal — escapa
 *     overflow/stacking dos ~33 layouts do painel);
 *   - overlay `data-testid="modal-overlay"` com alpha via TOKEN dedicado
 *     --modal-overlay-bg + blur por token (bg-black/80 modificador é PROIBIDO
 *     com var() hex);
 *   - superfície do conteúdo por ALIAS shadcn→brasa: bg-card (= surface-raised);
 *     anel de foco do X por alias ring-ring (= border-focus) +
 *     ring-offset-background (= surface-base);
 *   - larguras/radius/spacing por token de componente (--modal-*, --radius-lg);
 *   - MOTION tokenizado (A2): overlay fade in, conteúdo fade+zoom in via classes
 *     do tailwindcss-animate — `data-state="open"` dispara o enter (o exit some
 *     com o unmount, como no `Dialog` público; mesmo trade-off Radix-free).
 *
 * 4 vias de fechamento:
 *   1. Botão X            3. Click no overlay
 *   2. Esc (hook)         4. Botão cancelar no footer (consumidor → onOpenChange(false))
 *
 * A11y: role="dialog" + aria-modal + aria-labelledby (título) + aria-describedby
 * quando há description; focus trap e retorno de foco por `useDialogBehavior`.
 * §2.16 flat — conteúdo se diferencia por surface-raised + elevação.
 *
 * AA: par foreground/card = text-primary/surface-raised (contrast.test.ts L88);
 * anel de foco por alias (shadcn-aliases.test.ts). Nenhum par novo.
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { useDialogBehavior } from '../Dialog/useDialogBehavior';

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
}: ModalProps): React.JSX.Element | null {
  const titleId = React.useId();
  const descriptionId = React.useId();
  const closeRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  // Comportamento (Esc, focus trap cíclico, scroll-lock, retorno de foco) da
  // fonte ÚNICA — foco de entrada no X (closeRef), paridade com o autofocus
  // que o Radix Content dava.
  useDialogBehavior({ open, onClose: close, panelRef, initialFocusRef: closeRef });

  if (!open) return null;

  return createPortal(
    <>
      <div
        data-testid="modal-overlay"
        data-state="open"
        aria-hidden
        onClick={close}
        className={cn(
          'fixed inset-0 z-50',
          'bg-[var(--modal-overlay-bg)]',
          'backdrop-blur-[var(--modal-overlay-blur)]',
          // Motion (A2): fade tokenizado no enter/exit
          'data-[state=open]:animate-in data-[state=open]:fade-in-0',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-state="open"
        tabIndex={-1}
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
          <h2
            id={titleId}
            className={cn(
              'text-[length:var(--font-size-lg)]',
              'font-[var(--font-weight-bold)]',
              'text-[var(--text-primary)]',
            )}
          >
            {title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            aria-label="Fechar"
            onClick={close}
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
          </button>
        </div>

        {description && (
          <p
            id={descriptionId}
            className="text-[length:var(--font-size-base)] text-[var(--text-secondary)]"
          >
            {description}
          </p>
        )}

        {children}

        {footer && (
          <div className="flex items-center justify-end gap-[var(--spacing-3)] pt-[var(--spacing-2)]">
            {footer}
          </div>
        )}
      </div>
    </>,
    document.body,
  );
}

Modal.displayName = 'Modal';

export { Modal };
