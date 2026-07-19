/**
 * Drawer — painel off-canvas do painel, Radix-free (ADR-017, pendência (1)).
 *
 * PROVENIÊNCIA: era a mesma receita do Modal (Radix Dialog restilizado ao
 * brasa). A convergência do ADR-017 troca o motor Radix pelo comportamento
 * ADQUIRIDO compartilhado (`useDialogBehavior`) — focus trap, Esc, retorno de
 * foco, scroll-lock com UMA implementação no DS. Era o ÚLTIMO consumidor de
 * `@radix-ui/react-dialog` no design-system: com a troca, a dependência sai do
 * grafo do DS por completo (pendência (1) + T2 do lote MODAL-CONVERGE).
 *
 * Diff vs Modal:
 *   - Content ANCORADO a uma borda (off-canvas), altura total, largura pelo
 *     conteúdo (o consumidor define; ex.: a Sidebar já é 240px), não centrado;
 *   - MOTION: slide da borda + fade no ENTER, gated por `motion-safe:` — sob
 *     `prefers-reduced-motion: reduce` NÃO há animação (gate Norman). Modal não
 *     gateia; o Drawer gateia por exigência do lote responsivo. O EXIT some com
 *     o unmount (trade-off Radix-free, como no Dialog público);
 *   - overlay reusa --modal-overlay-bg + --modal-overlay-blur (mesma cortina).
 *
 * Uso canônico no shell mobile: envolver a Sidebar do DS abaixo do breakpoint
 * `lg` (o AppShell faz isso internamente). Genérico: qualquer painel lateral.
 *
 * Vias de fechamento: Esc, clique no overlay, e o consumidor chamando
 * onOpenChange(false) (ex.: ao navegar por um item).
 *
 * A11y: role="dialog" + aria-modal + nome acessível por título sr-only (o
 * rótulo visual do drawer costuma ser a própria marca no conteúdo). focus-trap
 * e retorno de foco por `useDialogBehavior`; foco de entrada no 1º focável do
 * conteúdo, ou no próprio painel (tabIndex=-1) quando não há focável — paridade
 * com o autofocus do Radix Content. §2.16 flat — superfície surface-base (a
 * Sidebar já traz a hairline direita do mockup) + elevação pela cortina.
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';
import { useDialogBehavior } from '../Dialog/useDialogBehavior';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DrawerSide = 'left' | 'right';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Nome acessível do diálogo. Renderizado sr-only por padrão; o conteúdo
   * carrega o rótulo visual.
   */
  title: string;
  /** Borda de ancoragem do painel. Default 'left'. */
  side?: DrawerSide;
  children: React.ReactNode;
  /** Classe do PAINEL (Content) — ex.: largura, quando não vier do conteúdo. */
  className?: string;
}

// Slide da borda ancorada, gated por motion-safe (reduced-motion = sem animação).
const SIDE_CLASSES: Record<DrawerSide, string> = {
  left: cn(
    'inset-y-0 left-0 border-r border-r-[var(--border-subtle)]',
    'motion-safe:data-[state=open]:slide-in-from-left',
    'motion-safe:data-[state=closed]:slide-out-to-left',
  ),
  right: cn(
    'inset-y-0 right-0 border-l border-l-[var(--border-subtle)]',
    'motion-safe:data-[state=open]:slide-in-from-right',
    'motion-safe:data-[state=closed]:slide-out-to-right',
  ),
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Drawer({
  open,
  onOpenChange,
  title,
  side = 'left',
  children,
  className,
}: DrawerProps): React.JSX.Element | null {
  const titleId = React.useId();
  const panelRef = React.useRef<HTMLDivElement | null>(null);

  const close = React.useCallback(() => onOpenChange(false), [onOpenChange]);

  // Sem initialFocusRef: o hook foca o 1º focável do conteúdo (ex.: 1º item da
  // Sidebar) ou o próprio painel (tabIndex=-1) quando não há focável.
  useDialogBehavior({ open, onClose: close, panelRef });

  if (!open) return null;

  return createPortal(
    <>
      <div
        data-testid="drawer-overlay"
        data-state="open"
        aria-hidden
        onClick={close}
        className={cn(
          'fixed inset-0 z-40',
          'bg-[var(--modal-overlay-bg)]',
          'backdrop-blur-[var(--modal-overlay-blur)]',
          // Motion: fade da cortina, gated por motion-safe.
          'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0',
          'motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0',
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-state="open"
        tabIndex={-1}
        className={cn(
          'fixed z-40 flex flex-col',
          'h-full max-w-[85vw]',
          // Superfície do painel: base (a Sidebar fecha com a hairline direita).
          'bg-[var(--surface-base)]',
          'shadow-[var(--elevation-3)]',
          'focus:outline-none',
          SIDE_CLASSES[side],
          // Motion: fade tokenizado no enter/exit, gated por motion-safe.
          'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0',
          'motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0',
          className,
        )}
      >
        {/* Nome acessível do diálogo — visual fica no conteúdo (marca). */}
        <h2 id={titleId} className="sr-only">
          {title}
        </h2>
        {children}
      </div>
    </>,
    document.body,
  );
}

Drawer.displayName = 'Drawer';

export { Drawer };
