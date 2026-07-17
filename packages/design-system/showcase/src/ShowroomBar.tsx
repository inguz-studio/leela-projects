/**
 * ShowroomBar — barra secundária fixa no topo do showroom.
 *
 * Fica acima do PageHeader, em superfície secundária (--surface-overlay) separada
 * do conteúdo por borda. Hospeda o seletor de tema como segmented control.
 *
 * Escopo: showcase apenas — não é componente do DS. Construído com tokens do DS
 * (nenhum valor cru de cor/spacing/radius).
 */

import * as React from 'react';
import { Badge, cn, useTheme, type Theme } from '@leela/design-system';

// ---------------------------------------------------------------------------
// Opções de tema
// ---------------------------------------------------------------------------

interface ThemeOption {
  id: Theme;
  label: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { id: 'brasa', label: 'Brasa' },
  { id: 'wine', label: 'Wine' },
];

// ---------------------------------------------------------------------------
// ThemeSegmented — segmented control acessível (padrão ARIA radiogroup)
// ---------------------------------------------------------------------------

function ThemeSegmented(): JSX.Element {
  const { theme, setTheme } = useTheme();
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const move = (dir: 1 | -1): void => {
    const current = THEME_OPTIONS.findIndex((o) => o.id === theme);
    const next = (current + dir + THEME_OPTIONS.length) % THEME_OPTIONS.length;
    setTheme(THEME_OPTIONS[next].id);
    refs.current[next]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        move(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        move(-1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Selecionar tema do showroom"
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex items-center gap-[var(--spacing-0-5)]',
        'rounded-[var(--radius-pill)] p-[var(--spacing-0-5)]',
        'bg-[var(--surface-sunken)]',
        'border border-[var(--border-subtle)]',
      )}
    >
      {THEME_OPTIONS.map((option, index) => {
        const active = option.id === theme;
        return (
          <button
            key={option.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => setTheme(option.id)}
            className={cn(
              'cursor-pointer select-none',
              'rounded-[var(--radius-pill)]',
              'px-[var(--spacing-3)] py-[var(--spacing-1)]',
              'text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)]',
              'transition-colors',
              'outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]',
              active
                ? 'bg-[var(--surface-high)] text-[var(--text-primary)] shadow-[var(--elevation-1)]'
                : 'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ShowroomBar
// ---------------------------------------------------------------------------

export function ShowroomBar(): JSX.Element {
  const { theme } = useTheme();

  return (
    <div
      className={cn(
        'shrink-0 sticky top-0 z-20',
        'flex items-center justify-between gap-[var(--spacing-4)]',
        'px-[var(--spacing-8)] py-[var(--spacing-3)]',
        'bg-[var(--surface-overlay)]',
        'border-b border-[var(--border-subtle)]',
      )}
    >
      <div className="flex items-center gap-[var(--spacing-3)]">
        <span className="text-[length:var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--text-secondary)]">
          Tema
        </span>
        <ThemeSegmented />
      </div>

      <Badge variant="neutro" aria-label={`Tema ativo: ${theme}`}>
        tema: {theme}
      </Badge>
    </div>
  );
}
