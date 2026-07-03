/**
 * Pagination — controle de paginação para listas densas (DoD Tela: ≥50 itens).
 *
 * Exibe contador "Mostrando X–Y de Z" + botões anterior/próximo + página atual.
 * A11y: nav[aria-label="Paginação"], botões nomeados, indicador de página com
 * texto sr-only completo ("Página X de Y").
 * §2.16 flat.
 */

import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const controlClass = (enabled: boolean) =>
  cn(
    'inline-flex items-center justify-center',
    'h-[var(--btn-height-sm)] w-[var(--btn-height-sm)]',
    'rounded-[var(--radius-sm)]',
    'text-[length:var(--font-size-base)]',
    'transition-colors duration-[var(--motion-duration-fast)]',
    'focus-visible:outline-none focus-visible:ring-2',
    'focus-visible:ring-[color:var(--border-focus)]',
    enabled
      ? 'text-[var(--text-secondary)] hover:bg-[var(--action-ghost-hover)] hover:text-[var(--text-primary)]'
      : 'text-[var(--text-disabled)]',
  );

function Pagination({
  total,
  page,
  pageSize,
  onPageChange,
  className,
}: PaginationProps): JSX.Element {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Paginação"
      className={cn(
        'flex items-center justify-between gap-[var(--spacing-4)]',
        'py-[var(--spacing-3)] px-[var(--spacing-5)]',
        className,
      )}
    >
      {/* Contador "mostrando X de Y" */}
      <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
        {total === 0
          ? 'Nenhum resultado'
          : `Mostrando ${start}–${end} de ${total}`}
      </p>

      {/* Controles */}
      <div className="flex items-center gap-[var(--spacing-2)]">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          aria-label="Página anterior"
          className={controlClass(hasPrev)}
        >
          <span aria-hidden>‹</span>
        </button>

        <span
          className={cn(
            'inline-flex items-center justify-center',
            'h-[var(--btn-height-sm)] min-w-[var(--btn-height-sm)] px-[var(--spacing-2)]',
            'rounded-[var(--radius-sm)]',
            'text-[length:var(--font-size-sm)]',
            'font-[var(--font-weight-semibold)]',
            'text-[var(--text-primary)]',
            'bg-[var(--surface-overlay)]',
          )}
        >
          <span aria-hidden>
            {page} / {totalPages}
          </span>
          <span className="sr-only">{`Página ${page} de ${totalPages}`}</span>
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          aria-label="Próxima página"
          className={controlClass(hasNext)}
        >
          <span aria-hidden>›</span>
        </button>
      </div>
    </nav>
  );
}

Pagination.displayName = 'Pagination';

export { Pagination };
