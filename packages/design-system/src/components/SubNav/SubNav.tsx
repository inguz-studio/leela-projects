/**
 * SubNav — barra de sub-navegação (§2.14).
 *
 * Tab ativa: font-weight 600 + underline Brasa 2px via --subnav-underline token.
 * Contador: pill Badge no label da tab.
 * A11y: role="tablist" + role="tab" + aria-selected + keyboard (← →).
 * Navegação via href ou onClick.
 * §2.16 flat — sem borda decorativa.
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
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function SubNav({ tabs, className }: SubNavProps): JSX.Element {
  const tabRefs = React.useRef<(HTMLAnchorElement | HTMLButtonElement | null)[]>([]);

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = (index + 1) % tabs.length;
      tabRefs.current[next]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = (index - 1 + tabs.length) % tabs.length;
      tabRefs.current[prev]?.focus();
    }
  }

  return (
    <div
      role="tablist"
      aria-label="Navegação de seções"
      className={cn(
        'flex items-end gap-[var(--spacing-1)]',
        'h-[var(--subnav-height)]',
        'border-b border-b-[var(--border-subtle)]',
        'px-[var(--spacing-6)]',
        className,
      )}
    >
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
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
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
                  'h-[var(--badge-height)] min-w-[var(--badge-height)] px-[var(--badge-px)]',
                  'rounded-[var(--badge-radius)]',
                  'text-[length:var(--badge-font-size)] font-[var(--badge-font-weight)]',
                  isActive
                    ? 'bg-[var(--action-primary)] text-[var(--action-primary-fg)]'
                    : 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]',
                )}
              >
                {tab.count}
              </span>
            )}
          </>
        );

        if (tab.href) {
          return (
            <a
              key={tab.id}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
              className={sharedClass}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              onKeyDown={(e) => handleKeyDown(e, index)}
            >
              {content}
            </a>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={sharedClass}
            onClick={tab.onClick}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}

SubNav.displayName = 'SubNav';

export { SubNav };
