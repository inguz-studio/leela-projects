/**
 * Breadcrumb — trilha de navegação hierárquica.
 *
 * PROVENIÊNCIA: estrutura do shadcn stock `breadcrumb` (nav[aria-label] > ol >
 * li, item atual = span[aria-current="page"], separador aria-hidden entre itens)
 * restilizada ao brasa. Diff vs stock (esteira shadcn→brasa):
 *   - API pública PRESERVADA: o consumidor passa `items: BreadcrumbItem[]`
 *     ({label, href?, onClick?}); a composição stock (Breadcrumb/List/Item/Link/
 *     Page/Separator) fica encapsulada aqui dentro — as telas do painel não mudam;
 *   - separador textual "/" (aria-hidden), não o ChevronRight do lucide: lucide
 *     só entra no DS no Lote B (evita dep prematura);
 *   - cores por alias: item atual `text-foreground` (= text-primary), separador
 *     `text-muted-foreground` (= text-tertiary); links `text-[var(--text-secondary)]`
 *     (sem alias) com hover `text-foreground` — todos na matriz (L87/L91/L94);
 *   - foco/tipo/radius/motion por token.
 *
 * A11y: nav[aria-label="Breadcrumb"] + ordered list + aria-current="page" no
 * último item (não clicável). §2.16 flat.
 */

import type * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BreadcrumbItem {
  label: string;
  href?: string;
  /**
   * Recebe o evento — em `href` + `onClick`, permite `preventDefault()` (nav
   * SPA). Mesmo contrato do `CardEvento`/`SubNav`/`Sidebar`.
   *
   * Só tem efeito no item que RENDERIZA como link: o último item é a página
   * atual (`aria-current="page"`, nunca clicável) e um item intermediário sem
   * `href` é texto. Passar `onClick` nesses dois casos é inerte de propósito —
   * o breadcrumb não inventa alvo de clique onde não existe destino.
   *
   * Alargamento ADITIVO: o campo é opcional e nenhum consumidor existente muda.
   */
  onClick?: (event: React.MouseEvent) => void;
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
                  className="text-muted-foreground text-[length:var(--font-size-sm)] select-none"
                >
                  /
                </span>
              )}
              {isLast ? (
                <span
                  aria-current="page"
                  className={cn(
                    'text-[length:var(--font-size-sm)]',
                    'text-foreground',
                    'font-[var(--font-weight-semibold)]',
                  )}
                >
                  {item.label}
                </span>
              ) : !item.href ? (
                <span
                  className={cn(
                    'text-[length:var(--font-size-sm)]',
                    'text-[var(--text-secondary)]',
                  )}
                >
                  {item.label}
                </span>
              ) : (
                <a
                  href={item.href}
                  {...(item.onClick ? { onClick: item.onClick } : {})}
                  className={cn(
                    'text-[length:var(--font-size-sm)]',
                    'text-[var(--text-secondary)]',
                    'hover:text-foreground',
                    'transition-colors duration-[var(--motion-duration-fast)]',
                    'focus-visible:outline-none focus-visible:ring-2',
                    'focus-visible:ring-ring',
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
