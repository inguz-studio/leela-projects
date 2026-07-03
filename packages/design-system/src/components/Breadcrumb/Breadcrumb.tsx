/**
 * Breadcrumb — trilha de navegação hierárquica.
 *
 * Último item: não clicável (página atual, aria-current="page").
 * Separador: "/" entre items.
 * A11y: nav[aria-label="Breadcrumb"] + ordered list + aria-current.
 * §2.16 flat.
 */

import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Breadcrumb({ items, className }: BreadcrumbProps): JSX.Element {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex items-center gap-[var(--spacing-2)]" role="list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-[var(--spacing-2)]">
              {index > 0 && (
                <span
                  aria-hidden
                  className="text-[var(--text-tertiary)] text-[length:var(--font-size-sm)] select-none"
                >
                  /
                </span>
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className={cn(
                    'text-[length:var(--font-size-sm)]',
                    'text-[var(--text-primary)]',
                    'font-[var(--font-weight-semibold)]',
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  className={cn(
                    'text-[length:var(--font-size-sm)]',
                    'text-[var(--text-secondary)]',
                    'hover:text-[var(--text-primary)]',
                    'transition-colors duration-[var(--motion-duration-fast)]',
                    'focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-[color:var(--border-focus)]',
                    'rounded-[var(--radius-sm)]',
                  )}
                >
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

Breadcrumb.displayName = 'Breadcrumb';

export { Breadcrumb };
