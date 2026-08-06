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
 *     do tailwindcss-animate — `data-state="open"` dispara o enter.
 *
 * MOVIMENTO NA SAÍDA (BUILD-MOTION · 04/08). As classes `data-[state=closed]:
 * animate-out` estavam aqui desde a A2 e NUNCA rodaram um frame: o `if (!open)
 * return null` tirava o nó do DOM no mesmo tick, e não há como animar o que já
 * não existe. `usePresencaOverlay` segura o nó até a animação acabar, e só
 * então desmonta. O `useDialogBehavior` passa a receber `presente` — foco volta
 * ao abridor no DESMONTE, paridade com o Radix.
 *
 * Movimento CENTRADO: fade + zoom curto, sem slide — um card no meio da tela
 * não tem borda de onde vir. É a mesma gramática do `Dialog` público em
 * desktop; o bottom-sheet do mobile é dele, porque só ele encosta na borda.
 * ⛔ Todas as classes ganharam `motion-safe:`: sob `prefers-reduced-motion:
 * reduce` o modal aparece e some sem animação nenhuma. Antes desta lane só o
 * `Drawer` respeitava isso — o `Modal` animava para todo mundo.
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
import { estiloMotion, usePresencaOverlay } from '../../utils/overlayMotion';
import { SCROLL_Y_ONLY } from '../../utils/scroll';
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

  // `presente` continua true durante a SAÍDA — é o que dá tempo do
  // `data-state="closed"` rodar a animação antes do nó sumir.
  const { presente, estado } = usePresencaOverlay(open);

  // Comportamento (Esc, focus trap cíclico, scroll-lock, retorno de foco) da
  // fonte ÚNICA — foco de entrada no X (closeRef), paridade com o autofocus
  // que o Radix Content dava. Recebe `presente`: o foco volta no desmonte.
  useDialogBehavior({ open: presente, onClose: close, panelRef, initialFocusRef: closeRef });

  if (!presente) return null;

  return createPortal(
    <>
      <div
        data-testid="modal-overlay"
        data-state={estado}
        style={estiloMotion(estado)}
        aria-hidden
        onClick={close}
        className={cn(
          'fixed inset-0 z-50',
          'bg-[var(--modal-overlay-bg)]',
          'backdrop-blur-[var(--modal-overlay-blur)]',
          // Motion (A2 + BUILD-MOTION): fade tokenizado no enter/exit, gated.
          'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0',
          'motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0',
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-state={estado}
        style={estiloMotion(estado)}
        tabIndex={-1}
        className={cn(
          'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50',
          sizeClass[size],
          'max-w-[calc(100vw-var(--spacing-8))]',
          'max-h-[calc(100vh-var(--spacing-8))]',
          // Superfície via alias shadcn→brasa (card = surface-raised)
          'bg-card',
          'rounded-[var(--radius-lg)]',
          'shadow-[var(--elevation-3)]',
          'p-[var(--spacing-6)]',
          'flex flex-col gap-[var(--spacing-4)]',
          'focus:outline-none',
          // Motion (A2 + BUILD-MOTION): fade + zoom, centrado (sem slide), gated
          'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:zoom-in-95',
          'motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:zoom-out-95',
          className,
          // ---------------------------------------------------------------------
          // TRAVA DE ROLAGEM — DEPOIS do `className` DE PROPÓSITO
          // (BUILD-SCROLL-PADRAO). O painel rola na vertical quando o formulário
          // passa de `max-h`. O eixo X, que era `visible` e o CSS promovia a
          // `auto`, agora é fechado: com `max-w-[calc(100vw-…)]`, qualquer filho
          // largo (grade de campos, número sem quebra, rótulo comprido) desenhava
          // uma barra horizontal DENTRO do modal, ao lado da vertical. Era esse o
          // "scroll duplo" dos modais.
          //
          // Fechar não recorta nada de novo — o eixo promovido a `auto` já
          // recortava — e `hidden` continua rolável por programa, então o campo
          // que recebe foco por teclado continua sendo revelado. Filho largo de
          // verdade (uma `Table`) traz o próprio contêiner de rolagem.
          //
          // `cn` é `twMerge` e resolve pelo ÚLTIMO: com a trava antes do
          // `className`, um consumidor apagava o eixo em silêncio. Regra em
          // utils/scroll.ts.
          // ---------------------------------------------------------------------
          SCROLL_Y_ONLY,
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
