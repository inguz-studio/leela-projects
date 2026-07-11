/**
 * Drawer — painel off-canvas sobre Radix Dialog (LEELA-RESP-M1-T2).
 *
 * PROVENIÊNCIA: mesma receita do Modal (Radix Dialog: Portal + Overlay +
 * Content restilizado ao brasa) — a11y de diálogo de graça (focus-trap, Esc,
 * retorno de foco, aria-dialog). Diff vs Modal:
 *   - Content é ANCORADO a uma borda (off-canvas), altura total, largura pelo
 *     conteúdo (o consumidor define; ex.: a Sidebar já é 240px), não centrado;
 *   - MOTION: slide da borda + fade, gated por `motion-safe:` — sob
 *     `prefers-reduced-motion: reduce` NÃO há animação (aparece/some instantâneo,
 *     gate Norman `prefers-reduced-motion`). Modal não gateia; o Drawer gateia
 *     por ser exigência explícita do lote responsivo;
 *   - overlay reusa --modal-overlay-bg + --modal-overlay-blur (mesma cortina).
 *
 * Uso canônico no shell mobile: envolver a Sidebar do DS abaixo do breakpoint
 * `lg` (o AppShell faz isso internamente). Genérico: qualquer painel lateral.
 *
 * 3 vias de fechamento (Radix): Esc, clique no overlay, e o consumidor
 * chamando onOpenChange(false) (ex.: ao navegar por um item).
 *
 * A11y: role="dialog" + nome acessível por <Dialog.Title> (sr-only por padrão —
 * o título visual do drawer costuma ser a própria marca no conteúdo). focus-trap
 * e retorno de foco por conta do Radix. §2.16 flat — superfície surface-base
 * (a Sidebar já traz a hairline direita do mockup) + elevação pela cortina.
 */

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DrawerSide = 'left' | 'right';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Nome acessível do diálogo (obrigatório — Radix exige um Dialog.Title).
   * Renderizado sr-only por padrão; o conteúdo carrega o rótulo visual.
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
}: DrawerProps): JSX.Element {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          data-testid="drawer-overlay"
          className={cn(
            'fixed inset-0 z-50',
            'bg-[var(--modal-overlay-bg)]',
            'backdrop-blur-[var(--modal-overlay-blur)]',
            // Motion: fade da cortina, gated por motion-safe.
            'motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0',
            'motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0',
          )}
        />
        <Dialog.Content
          // Sem description: desliga o aria-describedby default do Radix.
          aria-describedby={undefined}
          className={cn(
            'fixed z-50 flex flex-col',
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
          <Dialog.Title className="sr-only">{title}</Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

Drawer.displayName = 'Drawer';

export { Drawer };
