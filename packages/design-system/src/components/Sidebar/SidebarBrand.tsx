/**
 * SidebarBrand — bloco de marca do topo da sidebar (contrato visual `.brand/
 * .brand-mark/.brand-sub` do mockup Be Hero): mark em display 800 itálico 22px
 * com ponto na cor da marca, sub 11px uppercase, hairline embaixo.
 *
 * Componível: o DS entrega a ANATOMIA e o espaçamento; o texto (mark + sub)
 * vem do consumidor — a marca final do painel é decisão pendente do produto.
 *
 * A11y: texto real no DOM; o ponto decorativo é aria-hidden.
 */

import { cn } from '../../utils/cn';

export interface SidebarBrandProps {
  /** Texto da marca (ex.: "LEELA"). */
  mark: string;
  /** Linha secundária uppercase (ex.: "Painel do Organizador"). */
  sub?: string;
  /** Ponto final na cor da marca (mockup `.brand-mark .dot`). Default true. */
  showDot?: boolean;
  className?: string;
}

export function SidebarBrand({
  mark,
  sub,
  showDot = true,
  className,
}: SidebarBrandProps): JSX.Element {
  return (
    <div
      className={cn(
        'pt-[var(--sidebar-brand-pt)] px-[var(--sidebar-brand-px)] pb-[var(--sidebar-brand-pb)]',
        'border-b border-b-[var(--border-subtle)]',
        className,
      )}
    >
      <div
        className={cn(
          'font-display italic font-[var(--font-weight-extrabold)]',
          'text-[length:var(--sidebar-brand-mark-size)] leading-none',
          'tracking-[var(--sidebar-brand-mark-spacing)]',
          'text-[var(--text-primary)]',
        )}
      >
        <span>{mark}</span>
        {showDot && (
          <span aria-hidden className="text-[var(--text-brand)]">
            .
          </span>
        )}
      </div>
      {sub && (
        <div
          className={cn(
            'mt-[var(--sidebar-brand-sub-mt)]',
            'text-[length:var(--sidebar-brand-sub-size)]',
            'text-[var(--text-tertiary)]',
            'tracking-[var(--sidebar-brand-sub-spacing)] uppercase',
            'font-[var(--font-weight-medium)]',
          )}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

SidebarBrand.displayName = 'SidebarBrand';
