/**
 * Popover — menu de ações flutuante ancorado a um trigger (§2.5, C3).
 *
 * Comportamento:
 *   - Controlado (open/onOpenChange): o pai garante "só um aberto por vez"
 *     guardando um único id aberto (padrão em Table renderActions).
 *   - Click fora fecha; Esc fecha e devolve o foco ao trigger.
 *   - Tab (e Shift+Tab) fecha o menu (WAI-APG menu pattern) e devolve o
 *     foco ao trigger (paridade com Esc). preventDefault: o menu vive em
 *     portal no fim do body, então o Tab nativo a partir do menuitem
 *     jogaria o foco para fora da página; do trigger, o próximo Tab segue
 *     a ordem normal do documento.
 *   - stopPropagation no trigger e em cada item (não dispara click da linha).
 *   - Teclado no menu: ↓ ↑ Home End percorrem os itens.
 *   - Menu renderiza em PORTAL no document.body com position:fixed ancorada
 *     no rect do trigger (F07): nunca é clipado por overflow de Table/células;
 *     reposiciona em scroll (capture) e resize enquanto aberto.
 *
 * Trigger: elemento único (ex.: <Button/>) — recebe onClick, aria-haspopup,
 * aria-expanded e aria-controls via Radix Slot (sem wrapper div clicável).
 *
 * A11y: role="menu" + role="menuitem" + foco no primeiro item ao abrir.
 * §2.16 flat — menu se diferencia por surface-raised + elevação, sem borda.
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PopoverAction {
  id: string;
  label: string;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface PopoverProps {
  actions: PopoverAction[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Elemento único que dispara o menu (recebe props via Slot). */
  trigger: React.ReactElement;
  align?: 'left' | 'right';
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Popover({
  actions,
  open,
  onOpenChange,
  trigger,
  align = 'right',
  className,
}: PopoverProps): JSX.Element {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement>(null);
  const menuId = React.useId();

  // Posição fixa ancorada no rect do trigger (menu vive em portal)
  const [position, setPosition] = React.useState<{
    top: number;
    left?: number;
    right?: number;
  }>({ top: 0, left: 0 });

  const updatePosition = React.useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(
      align === 'right'
        ? { top: rect.bottom, right: Math.max(0, window.innerWidth - rect.right) }
        : { top: rect.bottom, left: rect.left },
    );
  }, [align]);

  // Ancora ao abrir e re-ancora em scroll (capture pega scroll de qualquer
  // container pai, ex.: wrapper com overflow da Table) e resize.
  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  // Fecha em click fora — menu está em portal, então checa trigger E menu
  React.useEffect(() => {
    if (!open) return;

    function handleOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideTrigger = containerRef.current?.contains(target) ?? false;
      const insideMenu = menuRef.current?.contains(target) ?? false;
      if (!insideTrigger && !insideMenu) {
        onOpenChange(false);
      }
    }

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open, onOpenChange]);

  // Fecha em Esc + devolve foco ao trigger
  React.useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onOpenChange(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onOpenChange]);

  // Foco no primeiro item ao abrir
  React.useEffect(() => {
    if (open && menuRef.current) {
      const first = menuRef.current.querySelector<HTMLButtonElement>(
        '[role="menuitem"]:not([disabled])',
      );
      first?.focus();
    }
  }, [open]);

  // Navegação por teclado dentro do menu (↓ ↑ Home End; Tab fecha)
  function handleMenuKeyDown(e: React.KeyboardEvent) {
    // WAI-APG (menu): Tab/Shift+Tab fecha o menu. O menu vive em portal no
    // fim do body — deixar o Tab nativo correr a partir do menuitem jogaria
    // o foco para fora da página (depois do body não há nada). Fechamos,
    // prevenimos o default e devolvemos o foco ao trigger (paridade com
    // Esc): o usuário fica no lugar dele na página e o próximo Tab segue a
    // ordem normal do documento. aria-expanded volta a false junto.
    // (Radix Menu bloqueia Tab sem fechar; Headless UI fecha com foco
    // manual — fechar + trigger é o meio-termo determinístico.)
    if (e.key === 'Tab') {
      e.preventDefault();
      onOpenChange(false);
      triggerRef.current?.focus();
      return;
    }

    const items = menuRef.current
      ? Array.from(
          menuRef.current.querySelectorAll<HTMLButtonElement>(
            '[role="menuitem"]:not([disabled])',
          ),
        )
      : [];
    if (items.length === 0) return;

    const current = items.indexOf(document.activeElement as HTMLButtonElement);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      items[(current + 1) % items.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      items[(current - 1 + items.length) % items.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  }

  return (
    <div ref={containerRef} className={cn('relative inline-flex', className)}>
      {/* Trigger — recebe props direto no elemento, sem wrapper clicável */}
      <Slot
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
      >
        {trigger}
      </Slot>

      {/* Menu — portal no body: overflow de containers não clipa (F07) */}
      {open && createPortal(
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Ações"
          onKeyDown={handleMenuKeyDown}
          style={{
            top: position.top,
            left: position.left,
            right: position.right,
          }}
          className={cn(
            'fixed mt-[var(--spacing-1)] z-50',
            'min-w-[var(--popover-min-width)] w-max',
            'bg-[var(--surface-raised)]',
            'rounded-[var(--radius-md)]',
            'shadow-[var(--elevation-2)]',
            'py-[var(--spacing-1)]',
            'overflow-hidden',
          )}
        >
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              disabled={action.disabled}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
                onOpenChange(false);
                triggerRef.current?.focus();
              }}
              className={cn(
                'flex items-center w-full',
                'h-[var(--btn-height-sm)] px-[var(--spacing-4)]',
                'text-[length:var(--font-size-base)] text-left whitespace-nowrap',
                'transition-colors duration-[var(--motion-duration-fast)]',
                'focus-visible:outline-none focus-visible:ring-inset',
                'focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
                action.destructive
                  ? 'text-[var(--text-danger)] hover:bg-[var(--feedback-danger-surface)]'
                  : 'text-[var(--text-primary)] hover:bg-[var(--action-ghost-hover)]',
                action.disabled && 'opacity-40 pointer-events-none',
              )}
            >
              {action.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}

Popover.displayName = 'Popover';

export { Popover };
