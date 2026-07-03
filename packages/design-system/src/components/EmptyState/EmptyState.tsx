/**
 * EmptyState — estado vazio obrigatório em listas filtráveis (DoD Tela).
 *
 * Mensagem padrão: "Nenhum [item] encontrado com os filtros aplicados" (C7).
 * Padding 48px (--spacing-12), texto text-tertiary.
 * Slot de ação opcional para "Limpar filtros" ou CTA equivalente.
 * §2.16 flat.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function EmptyState({
  title = 'Nenhum item encontrado',
  description = 'Nenhum resultado encontrado com os filtros aplicados.',
  icon,
  action,
  className,
}: EmptyStateProps): JSX.Element {
  return (
    <div
      role="status"
      aria-label={title}
      className={cn(
        'flex flex-col items-center justify-center gap-[var(--spacing-4)]',
        'py-[var(--spacing-12)] px-[var(--spacing-8)]',
        'text-center',
        className,
      )}
    >
      {icon && (
        <div
          aria-hidden
          className="text-[var(--text-tertiary)] opacity-40"
        >
          {icon}
        </div>
      )}
      <div className="flex flex-col gap-[var(--spacing-2)]">
        <p
          className={cn(
            'text-[length:var(--font-size-base)]',
            'font-[var(--font-weight-semibold)]',
            'text-[var(--text-tertiary)]',
          )}
        >
          {title}
        </p>
        {description !== title && (
          <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

EmptyState.displayName = 'EmptyState';

export { EmptyState };
