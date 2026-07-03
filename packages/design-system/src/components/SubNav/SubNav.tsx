/**
 * SubNav — barra de sub-navegação (§2.14).
 *
 * Container: bg-surface-raised, padding 0 40px (--subnav-px), border-bottom.
 * Tab inativa: font-weight 400, text-secondary.
 * Tab ativa: font-weight 600, text-primary, underline Brasa 2px via ::after.
 * Contador: pill radius 10px, min-width 28px, height 20px, bg-surface-base,
 * font-size 11px (tokens --subnav-pill-*).
 *
 * Semântica: navegação entre rotas — nav landmark + lista de links com
 * aria-current="page" na ativa (não é tablist; Tabs §2.7 cobre troca in-page).
 * Teclado: Tab percorre os links normalmente; ← → como atalho opcional.
 * §2.16 flat — border-bottom é divider permitido.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubNavTab {
  id: string;
  label: string;
  href?: string;
  count?: number;
  active?: boolean;
  onClick?: () => void;
}

export interface SubNavProps {
  tabs: SubNavTab[];
  /** Rótulo do landmark de navegação. */
  'aria-label'?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SubNav({
  tabs,
  'aria-label': ariaLabel = 'Navegação de seções',
  className,
}: SubNavProps): JSX.Element {
  const tabRefs = React.useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      tabRefs.current[(index + 1) % tabs.length]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      tabRefs.current[(index - 1 + tabs.length) % tabs.length]?.focus();
    }
  }

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        'bg-[var(--surface-raised)]',
        'border-b border-b-[var(--border-subtle)]',
        'px-[var(--subnav-px)]',
        className,
      )}
    >
      <ul role="list" className="flex items-end gap-[var(--spacing-1)] h-[var(--subnav-height)]">
        {tabs.map((tab, index) => {
          const isActive = tab.active ?? false;
          const sharedClass = cn(
            'relative inline-flex items-center gap-[var(--spacing-2)]',
            'h-full pb-[var(--spacing-1)]',
            'px-[var(--spacing-3)]',
            'text-[length:var(--font-size-base)]',
            'whitespace-nowrap',
            'transition-colors duration-[var(--motion-duration-fast)]',
            'focus-visible:outline-none focus-visible:ring-2',
            'focus-visible:ring-[color:var(--border-focus)]',
            'rounded-t-[var(--radius-sm)]',
            isActive
              ? 'text-[var(--text-primary)] font-[var(--font-weight-semibold)]'
              : 'text-[var(--text-secondary)] font-[var(--font-weight-regular)] hover:text-[var(--text-primary)]',
            // Underline indicator (Brasa 2px)
            isActive && [
              'after:absolute after:bottom-0 after:left-0 after:right-0',
              'after:h-[var(--subnav-underline)] after:bg-[var(--border-brand)]',
              'after:rounded-t-[var(--radius-sm)]',
            ],
          );

          const content = (
            <>
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center',
                    'h-[var(--subnav-pill-height)] min-w-[var(--subnav-pill-min-width)]',
                    'px-[var(--spacing-2)]',
                    'rounded-[var(--subnav-pill-radius)]',
                    'text-[length:var(--subnav-pill-font-size)] font-[var(--font-weight-semibold)]',
                    'bg-[var(--surface-base)]',
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]',
                  )}
                >
                  {tab.count}
                </span>
              )}
            </>
          );

          return (
            <li key={tab.id} className="h-full">
              {tab.href ? (
                <a
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={sharedClass}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onClick={tab.onClick}
                >
                  {content}
                </a>
              ) : (
                <button
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  className={sharedClass}
                  onClick={tab.onClick}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

SubNav.displayName = 'SubNav';

export { SubNav };
