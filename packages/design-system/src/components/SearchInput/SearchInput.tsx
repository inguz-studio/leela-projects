/**
 * SearchInput — campo de busca da toolbar (mockup be-hero `.search`).
 *
 * PROVENIÊNCIA: composição própria sobre <input type="search"> nativo (role
 * searchbox de graça) — o Input do DS é o campo de formulário 40px com label;
 * a busca do mockup é um contêiner raised de 320px com ícone e atalho `kbd`.
 *   - dimensões/tipo por token (--search-*), radius sm;
 *   - foco no CONTÊINER (focus-within): borda --border-focus + halo
 *     --border-focus-ring-shadow (o box-shadow 3px do mockup, literal por
 *     tema no semantic — alpha não compõe com var() hex);
 *   - kbd: mono 10px sobre surface-sunken (par tertiary×sunken coberto pela
 *     matriz via tertiary×base — sunken é mais escuro que base no brasa).
 *
 * A11y: input real (searchbox), `aria-label` com default; kbd é decorativo
 * (aria-hidden — o atalho é anunciado pelo aria-keyshortcuts do input).
 * §2.16 flat — borda funcional de input, não decorativa.
 */

import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size' | 'onSubmit'> {
  /** Rótulo do atalho exibido no kbd (default "⌘K"); null omite o kbd. */
  shortcutLabel?: string | null;
  /** Disparado no Enter com o valor atual (busca real pode ser stub do consumidor). */
  onSubmit?: (value: string) => void;
  /** Classe do CONTÊINER (largura default = --search-width). */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      shortcutLabel = '⌘K',
      onSubmit,
      onKeyDown,
      'aria-label': ariaLabel = 'Buscar',
      ...props
    },
    ref,
  ) => {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
      onKeyDown?.(event);
      if (event.key === 'Enter' && onSubmit) {
        onSubmit(event.currentTarget.value);
      }
    };

    return (
      <div
        role="search"
        className={cn(
          'flex items-center',
          'w-[var(--search-width)]',
          'gap-[var(--search-gap)] px-[var(--search-px)] py-[var(--search-py)]',
          'bg-[var(--surface-raised)] rounded-[var(--radius-sm)]',
          'border border-[var(--border-default)]',
          'transition-[border-color,box-shadow] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
          'focus-within:border-[var(--border-focus)]',
          'focus-within:shadow-[var(--border-focus-ring-shadow)]',
          className,
        )}
      >
        <Search
          aria-hidden
          className="shrink-0 w-[var(--search-icon-size)] h-[var(--search-icon-size)] text-[var(--text-tertiary)]"
        />
        <input
          ref={ref}
          type="search"
          aria-label={ariaLabel}
          aria-keyshortcuts={shortcutLabel ? 'Control+K Meta+K' : undefined}
          onKeyDown={handleKeyDown}
          className={cn(
            'flex-1 min-w-0 bg-transparent border-none outline-none',
            'text-[var(--text-primary)] text-[length:var(--search-font-size)]',
            'placeholder:text-[var(--text-tertiary)]',
            // Esconde o "x" nativo do WebKit — o mockup não tem clear button
            '[&::-webkit-search-cancel-button]:hidden',
          )}
          {...props}
        />
        {shortcutLabel && (
          <kbd
            aria-hidden
            className={cn(
              'shrink-0 font-mono',
              'text-[length:var(--search-kbd-font-size)] text-[var(--text-tertiary)]',
              'bg-[var(--surface-sunken)]',
              'border border-[var(--border-subtle)] rounded-[var(--search-kbd-radius)]',
              'px-[var(--search-kbd-px)] py-[var(--search-kbd-py)]',
            )}
          >
            {shortcutLabel}
          </kbd>
        )}
      </div>
    );
  },
);
SearchInput.displayName = 'SearchInput';

export { SearchInput };
