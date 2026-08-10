/**
 * CardEvento — card de evento com media 16/10 (T4).
 *
 * - Media 16/10: slot `media` (imagem/gradiente por categoria vem do
 *   consumidor); fallback: gradiente com tokens semantic.
 * - Badge de modalidade sobreposto no canto da media (slot `modality`).
 * - Hover: translateY para cima + elevação (motion-safe).
 * - §2.16 flat — sem borda; diferencia-se por surface-raised.
 *
 * Interativo: com `href` vira <a>; com só `onClick` vira <button>;
 * sem ambos, <article> estático. Com href+onClick, o onClick recebe o evento
 * (pode `preventDefault()` — ex.: navegação SPA sem recarregar a página).
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface CardEventoProps {
  title: string;
  /** Media 16/10 — imagem ou gradiente da categoria (fallback: gradiente semantic). */
  media?: React.ReactNode;
  /** Badge de modalidade sobreposto na media (ex.: <Badge>5K</Badge>). */
  modality?: React.ReactNode;
  /** Metadados: data, local, contadores. */
  meta?: React.ReactNode;
  footer?: React.ReactNode;
  href?: string;
  /** Recebe o evento — em href+onClick, permite `preventDefault()` (nav SPA). */
  onClick?: (event: React.MouseEvent) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function CardEvento({
  title,
  media,
  modality,
  meta,
  footer,
  href,
  onClick,
  className,
}: CardEventoProps): JSX.Element {
  const rootClass = cn(
    'group block w-full text-left',
    'bg-[var(--surface-raised)]',
    '[backdrop-filter:var(--card-blur)]',
    'rounded-[var(--card-radius)]',
    'overflow-hidden',
    'motion-safe:transition-[transform,box-shadow]',
    'motion-safe:duration-[var(--motion-duration-fast)]',
    'motion-safe:ease-[var(--motion-easing-default)]',
    'hover:-translate-y-[var(--spacing-1)] hover:shadow-[var(--elevation-2)]',
    'focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-[color:var(--border-focus)]',
    className,
  );

  const body = (
    <>
      {/* Media 16/10 */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {media ?? (
          <div
            aria-hidden
            data-testid="card-evento-gradient"
            className="h-full w-full bg-[image:linear-gradient(135deg,var(--action-primary),var(--surface-high))]"
          />
        )}
        {modality && (
          <div className="absolute top-[var(--spacing-3)] left-[var(--spacing-3)]">
            {modality}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex flex-col gap-[var(--spacing-2)] p-[var(--spacing-4)]">
        <h3
          className={cn(
            'text-[length:var(--font-size-md)]',
            'font-[var(--font-weight-semibold)]',
            'text-[var(--text-primary)]',
          )}
        >
          {title}
        </h3>
        {meta && (
          <div className="flex items-center gap-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {meta}
          </div>
        )}
        {footer && <div className="pt-[var(--spacing-2)]">{footer}</div>}
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} onClick={onClick} className={rootClass}>
        {body}
      </a>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={rootClass}>
        {body}
      </button>
    );
  }

  return <article className={rootClass}>{body}</article>;
}

CardEvento.displayName = 'CardEvento';

export { CardEvento };
