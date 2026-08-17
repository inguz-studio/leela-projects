/**
 * SearchInput — campo de busca da toolbar (mockup be-hero `.search`).
 *
 * PROVENIÊNCIA: composição própria sobre <input type="search"> nativo (role
 * searchbox de graça) — o Input do DS é o campo de formulário 40px com label;
 * a busca do mockup é um contêiner de 320px com ícone e atalho `kbd`.
 *   - dimensões/tipo por token (--search-*), radius sm;
 *   - kbd: mono 10px, keycap RAISED sobre o campo inset (par tertiary×raised
 *     coberto pela matriz de contraste).
 *
 * FLAT COMO OS VIZINHOS (2026-08-17, direção do Vitor — "os pesquisadores estão
 * fora do padrão dos filtros também, do nosso estilo mais flat"). Esta peça
 * ficou de fora da varredura GATE-DS-W1 (2026-07-18, "não estamos respeitando o
 * estilo flat, sem linhas de borda") e por isso era o ÚNICO campo do DS ainda
 * desenhado como caixa outline: fill `surface-raised` (mais claro que a página)
 * + linha `border-default` visível. No wine isso saía branco puro contornado ao
 * lado de facetas `#F5F1EC` sem linha — a busca lia como cartão, e não como
 * campo da barra.
 *
 * A receita agora é a MESMA do resto da família de campo (`Input` default,
 * `Combobox`, `Select`, `Textarea`, `Calendar`): fill inset `surface-sunken` +
 * caixa de borda preservada com cor `--input-border-flat` (= transparent) +
 * foco por ring de 2px. Os tokens são os de campo de propósito, e não uma cópia
 * local: se a casa um dia reacender a borda funcional do campo flat (como o
 * S-R9-04-T2 tentou), a busca acompanha em vez de divergir de novo — que foi
 * exatamente como esta peça se afastou.
 *
 * O par que o `FilterChips` monta acima do limiar é um `Combobox`; ele e a busca
 * agora nascem do mesmo desenho, lado a lado na mesma barra.
 *
 * A11y: input real (searchbox), `aria-label` com default; kbd é decorativo
 * (aria-hidden — o atalho é anunciado pelo aria-keyshortcuts do input). Foco
 * visível de 2px em `--border-focus` (governança §3), agora pelo ring do campo
 * e não pelo halo de 3px a 15% de alpha, que não cumpria a régua dos 2px.
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
          'bg-[var(--surface-sunken)] rounded-[var(--radius-sm)]',
          'border-[length:var(--input-border-width)] border-[color:var(--input-border-flat)]',
          'transition-[border-color,box-shadow] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-0',
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
              // Keycap RAISED sobre o campo agora inset: com o contêiner em
              // `surface-sunken`, um kbd também sunken sumiria (no wine os dois
              // tokens são o MESMO #F5F1EC) e sobraria só a linha da borda para
              // identificá-lo — o oposto de flat. Invertido, o keycap se separa
              // pelo fill nos três temas e a borda decorativa sai.
              'bg-[var(--surface-raised)]',
              'rounded-[var(--search-kbd-radius)]',
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
