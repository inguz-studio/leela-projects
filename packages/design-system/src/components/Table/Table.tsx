/**
 * Table densa (§2.5) — tabela de listagem compacta.
 *
 * PROVENIÊNCIA: primitivos presentacionais do shadcn stock `table`
 * (TableRoot/Header/Body/Row/Head/Cell/Caption) restilizados ao brasa; a NOSSA
 * API pública (Table<TRow> com columns/data/EmptyState/renderActions) vira
 * COMPOSIÇÃO por cima desses primitivos. Diff vs stock:
 *   - API pública INTACTA: exports Table + TableColumn + TableProps; os
 *     primitivos ficam INTERNOS (não exportados) — zero churn nas telas;
 *   - cor por ALIAS shadcn→brasa: header text-muted-foreground (= text-tertiary),
 *     célula text-foreground (= text-primary) — prova a ponte;
 *   - stock usa hover:bg-muted/50 (alpha PROIBIDO com var() hex) → substituído
 *     por hover:bg-[var(--table-row-hover)] (rgba literal por tema — alpha
 *     adapta à superfície do wrap);
 *   - dimensões por token de componente (--table-row-height, --table-cell-*,
 *     --table-header-*, --table-font-size); motion do hover por token.
 *
 * Especificações (densidade do mockup be-hero `.table`, patch de congruência
 * 2026-07-06):
 *   - Wrap card: surface-raised + radius-lg 12px + elev-1 (`.table-wrap`)
 *   - Linha ~47px (--table-row-height; densidade vem do py 14px)
 *   - Padding célula: 14px vertical / 16px horizontal (--table-cell-py/px);
 *     header py 12px (--table-header-py)
 *   - Corpo 13px (--table-font-size = font.size.sm-plus); header 10px
 *     (--table-header-font-size = font.size.xs), uppercase, ls 0.08em,
 *     text-tertiary, font-semibold, fio de fundo --table-header-bg
 *   - EmptyState integrado quando data=[]; aceita componente externo
 *   - Popover de ações por linha via renderActions
 *
 * A11y: role="table" nativo, th[scope], caption opcional.
 * AA: header text-tertiary e célula text-primary sobre surface-raised (wrap) —
 * na matriz; header-bg/row-hover são tints ≤2% provados por composição
 * alpha-sobre-surface no contrast.test.ts (tokens de mesa §).
 * §2.16 flat — sem borda decorativa (linhas separadas por border-b subtle).
 */

import * as React from 'react';
import { cn } from '../../utils/cn';
import { EmptyState } from '../EmptyState/EmptyState';

// ---------------------------------------------------------------------------
// Primitivos presentacionais (shadcn stock `table`, restilizados ao brasa) —
// internos: a API pública é o Table<TRow> composto abaixo.
// ---------------------------------------------------------------------------

interface TableRootProps extends React.HTMLAttributes<HTMLTableElement> {
  /** Classe do contêiner de scroll (wrapper). */
  containerClassName?: string | undefined;
}

const TableRoot = React.forwardRef<HTMLTableElement, TableRootProps>(
  ({ className, containerClassName, ...props }, ref) => (
    // Wrap card do mockup (`.table-wrap`): a tabela é um card raised com
    // radius-lg + elev-1, não uma <table> nua sobre o fundo. overflow-x-auto
    // preserva o scroll horizontal E recorta os cantos arredondados.
    <div
      className={cn(
        'w-full overflow-x-auto',
        'bg-[var(--surface-raised)] rounded-[var(--radius-lg)] shadow-elev-1',
        containerClassName,
      )}
    >
      <table ref={ref} className={cn('w-full border-collapse', className)} {...props} />
    </div>
  ),
);
TableRoot.displayName = 'TableRoot';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => <thead ref={ref} className={className} {...props} />);
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => <tbody ref={ref} className={className} {...props} />);
TableBody.displayName = 'TableBody';

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn('sr-only', className)} {...props} />
));
TableCaption.displayName = 'TableCaption';

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      'border-b border-b-[var(--border-subtle)]',
      'transition-colors duration-[var(--motion-duration-fast)]',
      className,
    )}
    {...props}
  />
));
TableRow.displayName = 'TableRow';

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'py-[var(--table-header-py)] px-[var(--table-cell-px)]',
      'text-[length:var(--table-header-font-size)]',
      'font-[var(--font-weight-semibold)]',
      // Alias shadcn→brasa: muted-foreground = text-tertiary
      'text-muted-foreground',
      'uppercase tracking-[var(--table-header-spacing)]',
      // Fio de fundo do thead (mockup: rgba branca 1.5% — literal por tema)
      'bg-[var(--table-header-bg)]',
      'whitespace-nowrap',
      className,
    )}
    {...props}
  />
));
TableHead.displayName = 'TableHead';

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      'py-[var(--table-cell-py)] px-[var(--table-cell-px)]',
      'text-[length:var(--table-font-size)]',
      // Linha ~47px do mockup (QA m6): o line-height herdado (1.5+) rendia
      // 50.5px; 13px × 1.4 + 28 de padding ≈ 46–47px.
      'leading-[var(--table-line-height)]',
      // Alias shadcn→brasa: foreground = text-primary
      'text-foreground',
      className,
    )}
    {...props}
  />
));
TableCell.displayName = 'TableCell';

// ---------------------------------------------------------------------------
// Types (API pública — inalterada)
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
// Component (composição sobre os primitivos)
// ---------------------------------------------------------------------------

function alignClass(align: TableColumn<unknown>['align']): string {
  if (align === 'center') return 'text-center';
  if (align === 'right') return 'text-right';
  return 'text-left';
}

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
    <TableRoot containerClassName={className}>
      {caption && <TableCaption>{caption}</TableCaption>}

      {/* Header */}
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead
              key={col.key}
              scope="col"
              style={{ width: col.width }}
              className={alignClass(col.align)}
            >
              {col.header}
            </TableHead>
          ))}
          {hasActions && (
            <TableHead scope="col" className="w-10">
              <span className="sr-only">Ações</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>

      {/* Body */}
      <TableBody>
        {data.map((row) => (
          <TableRow
            key={keyExtractor(row)}
            className={cn('h-[var(--table-row-height)]', 'hover:bg-[var(--table-row-hover)]')}
          >
            {columns.map((col) => (
              <TableCell key={col.key} className={alignClass(col.align)}>
                {col.render ? col.render(row) : defaultCell(row, col.key)}
              </TableCell>
            ))}
            {hasActions && renderActions && (
              <TableCell className="text-right">{renderActions(row)}</TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </TableRoot>
  );
}

Table.displayName = 'Table';

export { Table };
