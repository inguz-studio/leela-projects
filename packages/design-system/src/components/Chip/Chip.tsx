/**
 * Chip — filtro/seleção com estado ativo.
 *
 * radius-pill, cor ativa = brand (action-primary).
 * Suporta variante toggleable (active/inactive) e removível (onRemove).
 *
 * A11y: role="option" quando em grupo, aria-selected para estado ativo.
 * §2.16 flat — sem borda decorativa.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Whether the chip is in selected/active state. */
  active?: boolean;
  /** Called when the remove (×) button is clicked. Renders a remove icon. */
  onRemove?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, active = false, onRemove, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="option"
        aria-selected={active}
        disabled={disabled}
        className={cn(
          // Base
          'inline-flex items-center gap-1',
          'h-[var(--chip-height)] px-[var(--chip-px)]',
          'rounded-[var(--chip-radius)]',
          'text-[length:var(--chip-font-size)]',
          'whitespace-nowrap select-none cursor-pointer',
          // Flat (§2.16)
          'border-0',
          // Transition
          'transition-colors duration-[var(--motion-duration-fast)]',
          // Inactive state
          !active && [
            'bg-[var(--surface-overlay)] text-[var(--text-secondary)]',
            'hover:bg-[var(--surface-high)] hover:text-[var(--text-primary)]',
          ],
          // Active state — brasa brand color
          active && [
            'bg-[var(--action-primary)] text-[var(--action-primary-fg)]',
            'hover:bg-[var(--action-primary-hover)]',
          ],
          // Disabled
          'disabled:pointer-events-none disabled:opacity-40',
          className,
        )}
        {...props}
      >
        {children}
        {onRemove ? (
          <span
            role="button"
            aria-label="Remover"
            tabIndex={0}
            className="ml-1 inline-flex items-center text-xs leading-none opacity-70 hover:opacity-100 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                onRemove();
              }
            }}
          >
            ×
          </span>
        ) : null}
      </button>
    );
  },
);
Chip.displayName = 'Chip';

export { Chip };
