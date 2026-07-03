/**
 * PageHeader — cabeçalho de contexto 96px (§2.1).
 *
 * Contém: avatar/nome, badges de status, metadados, slot de ações.
 * Altura 96px via --header-height token.
 * §2.16 flat — sem borda decorativa.
 * A11y: heading semântico, region landmark.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  avatar?: React.ReactNode;
  badges?: React.ReactNode;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PageHeader({
  title,
  subtitle,
  avatar,
  badges,
  metadata,
  actions,
  className,
}: PageHeaderProps): JSX.Element {
  return (
    <header
      aria-label={title}
      className={cn(
        'flex items-center gap-[var(--spacing-4)]',
        'min-h-[var(--header-height)]',
        'px-[var(--spacing-6)]',
        'bg-[var(--surface-raised)]',
        className,
      )}
    >
      {/* Avatar slot */}
      {avatar && (
        <div className="shrink-0" aria-hidden>
          {avatar}
        </div>
      )}

      {/* Title + badges + metadata */}
      <div className="flex flex-col justify-center gap-[var(--spacing-1)] min-w-0 flex-1">
        <div className="flex items-center gap-[var(--spacing-2)] flex-wrap">
          <h1
            className={cn(
              'text-[length:var(--font-size-lg)]',
              'font-[var(--font-weight-bold)]',
              'text-[var(--text-primary)]',
              'truncate',
            )}
          >
            {title}
          </h1>
          {badges && (
            <div className="flex items-center gap-[var(--spacing-2)] flex-wrap">
              {badges}
            </div>
          )}
        </div>
        {(subtitle || metadata) && (
          <div className="flex items-center gap-[var(--spacing-3)] flex-wrap">
            {subtitle && (
              <p className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
                {subtitle}
              </p>
            )}
            {metadata && (
              <div className="flex items-center gap-[var(--spacing-3)] text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
                {metadata}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions slot */}
      {actions && (
        <div className="flex items-center gap-[var(--spacing-3)] shrink-0 ml-auto">
          {actions}
        </div>
      )}
    </header>
  );
}

PageHeader.displayName = 'PageHeader';

export { PageHeader };
