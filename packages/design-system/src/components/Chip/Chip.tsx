/**
 * Chip — filtro/seleção com estado ativo.
 *
 * radius-pill, cor ativa = brand (action-primary).
 * Suporta variante toggleable (active/inactive) e removível (onRemove).
 *
 * A11y (F10): toggle button nativo com aria-pressed — role="option" era
 * inválido fora de um listbox (aria-selected órfão), e o × interno com
 * role="button"+tabIndex criava interativo focável aninhado em <button>
 * (violação ARIA). O × agora é decorativo (aria-hidden, clique por bubbling
 * controlado) e a remoção por teclado é Delete/Backspace no próprio chip.
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
  ({ className, active = false, onRemove, children, disabled, onKeyDown, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={active}
        disabled={disabled}
        onKeyDown={(e) => {
          // Remoção por teclado no próprio chip (o × é decorativo)
          if (onRemove && (e.key === 'Delete' || e.key === 'Backspace')) {
            e.preventDefault();
            onRemove();
          }
          onKeyDown?.(e);
        }}
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
          // Decorativo: sem role/tabIndex (interativo aninhado é ARIA inválida).
          // Clique no × remove; teclado remove via Delete/Backspace no chip.
          <span
            aria-hidden
            className="ml-1 inline-flex items-center text-[length:var(--font-size-xs)] leading-none opacity-70 hover:opacity-100 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
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
