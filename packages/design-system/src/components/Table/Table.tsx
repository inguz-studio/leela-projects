/**
 * Table densa (§2.5) — tabela de listagem compacta.
 *
 * Especificações:
 *   - Linha 64px (--table-row-height token)
 *   - Padding célula: 14px vertical / 20px horizontal (--table-cell-py/px)
 *   - Header: uppercase, letter-spacing 0.08em, text-tertiary, font-semibold
 *   - EmptyState integrado quando data=[]; aceita componente externo
 *   - Popover de ações por linha via renderActions
 *
 * A11y: role="table" nativo, th[scope], caption opcional.
 * §2.16 flat — sem borda decorativa (linhas separadas por border-b subtl).
 */

import * as React from 'react';
import { cn } from '../../utils/cn';
import { EmptyState } from '../EmptyState/EmptyState';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TableColumn<TRow> {
  key: string;
  header: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  /** Sem `render`, a célula exibe `row[key]` (valores primitivos). */
  render?: (row: TRow) => React.ReactNode;
}

/** Fallback de célula: lê `row[key]` e exibe primitivos como texto. */
function defaultCell<TRow>(row: TRow, key: string): React.ReactNode {
  const value = (row as Record<string, unknown>)[key];
  if (value === null || value === undefined) return null;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return String(value);
}

export interface TableProps<TRow> {
  columns: TableColumn<TRow>[];
  data: TRow[];
  keyExtractor: (row: TRow) => string;
  caption?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  renderActions?: (row: TRow) => React.ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function Table<TRow>({
  columns,
  data,
  keyExtractor,
  caption,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  renderActions,
  className,
}: TableProps<TRow>): JSX.Element {
  const hasActions = Boolean(renderActions);

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle ?? 'Nenhum resultado encontrado'}
        description={emptyDescription ?? 'Nenhum resultado encontrado com os filtros aplicados.'}
        icon={emptyIcon}
      />
    );
  }

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        {caption && (
          <caption className="sr-only">{caption}</caption>
        )}

        {/* Header */}
        <thead>
          <tr className="border-b border-b-[var(--border-subtle)]">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                style={{ width: col.width }}
                className={cn(
                  'py-[var(--table-cell-py)] px-[var(--table-cell-px)]',
                  'text-[length:var(--font-size-sm)]',
                  'font-[var(--font-weight-semibold)]',
                  'text-[var(--text-tertiary)]',
                  'uppercase tracking-[var(--table-header-spacing)]',
                  'whitespace-nowrap',
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right',
                  (!col.align || col.align === 'left') && 'text-left',
                )}
              >
                {col.header}
              </th>
            ))}
            {hasActions && (
              <th scope="col" className="py-[var(--table-cell-py)] px-[var(--table-cell-px)] w-10">
                <span className="sr-only">Ações</span>
              </th>
            )}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className={cn(
                'border-b border-b-[var(--border-subtle)]',
                'h-[var(--table-row-height)]',
                'transition-colors duration-[var(--motion-duration-fast)]',
                'hover:bg-[var(--surface-raised)]',
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'py-[var(--table-cell-py)] px-[var(--table-cell-px)]',
                    'text-[length:var(--font-size-base)]',
                    'text-[var(--text-primary)]',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    (!col.align || col.align === 'left') && 'text-left',
                  )}
                >
                  {col.render ? col.render(row) : defaultCell(row, col.key)}
                </td>
              ))}
              {hasActions && renderActions && (
                <td className="py-[var(--table-cell-py)] px-[var(--table-cell-px)] text-right">
                  {renderActions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

Table.displayName = 'Table';

export { Table };
