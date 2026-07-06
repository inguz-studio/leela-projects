/**
 * DateBadge — pill de contexto temporal do page-head (mockup be-hero
 * `.date-badge`): "Domingo, 19 de Abril · 14:32" com dot verde "ao vivo".
 *
 * Anatomia do mockup: inline-flex gap 8, bg surface-overlay + hairline
 * border-subtle, texto 12/500 secondary, padding 6×10, radius pill; dot 6px
 * na cor de sucesso com glow (box-shadow tokenizado por tema —
 * `--datebadge-dot-glow`).
 *
 * O CONTEÚDO (texto/`<time>`) é do consumidor — o DS não formata datas.
 * A11y: decorativo por natureza (o dot é aria-hidden); quando o texto
 * carregar significado de status, o consumidor descreve via aria-label.
 * AA: text-secondary sobre surface-overlay — par já na matriz.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface DateBadgeProps {
  children: React.ReactNode;
  /** Dot verde "ao vivo" (default true, como o mockup). */
  showDot?: boolean;
  className?: string;
}

function DateBadge({ children, showDot = true, className }: DateBadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap',
        'gap-[var(--datebadge-gap)]',
        'px-[var(--datebadge-px)] py-[var(--datebadge-py)]',
        'rounded-[var(--radius-pill)]',
        'bg-[var(--surface-overlay)]',
        'border border-[var(--border-subtle)]',
        'text-[length:var(--datebadge-font-size)]',
        'font-[var(--font-weight-medium)]',
        'text-[var(--text-secondary)]',
        className,
      )}
    >
      {showDot && (
        <span
          aria-hidden
          data-testid="datebadge-dot"
          className={cn(
            'shrink-0 rounded-[var(--radius-pill)]',
            'w-[var(--datebadge-dot-size)] h-[var(--datebadge-dot-size)]',
            'bg-[var(--feedback-success)]',
            'shadow-[var(--datebadge-dot-glow)]',
          )}
        />
      )}
      {children}
    </span>
  );
}

DateBadge.displayName = 'DateBadge';

export { DateBadge };
