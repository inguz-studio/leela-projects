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
 *   - DropdownMenu de ações por linha via renderActions
 *
 * Responsivo (RESP-M5): em lg+ é a tabela densa nativa (INTOCADA). Abaixo de lg
 * — mesmo breakpoint em que o shell troca o rail por drawer (preset L55-58) — a
 * Table entra em CARD-MODE: cada linha empilha como card e cada célula vira uma
 * linha "RÓTULO … valor" (o rótulo vem do header textual da coluna). Isso mata o
 * min-content largo da <table> (~772px) que empurrava o documento à horizontal no
 * 390 (defeito do gate visual). É a escolha da design-principles §(c) para tabela
 * densa de leitura/varredura no celular (cards > scroll-x lateral para o job).
 *
 * Opt-out `responsive` (revisão r1): matriz de comparação em grade (ex.: estoque
 * kit×modalidade) PERDE a leitura "qual coluna está curta entre as linhas" ao
 * virar card. Para esse caso — o único onde design-principles §(c) reserva TABELA
 * e não cards — `responsive="scroll"` MANTÉM a grade densa no mobile e rola na
 * horizontal DENTRO do wrap (overflow-x-auto CONTIDO no card, nunca no body/
 * documento). Default `responsive="card"` = comportamento acima. Use "scroll" só
 * em matriz de comparação; para lista de leitura, card serve melhor o job.
 *
 * A11y: role="table" nativo, th[scope], caption opcional. Em card-mode (<lg) o
 * CSS reflui as linhas em cards; a LEITURA é preservada porque cada célula ganha
 * o rótulo da coluna injetado (ex.: "STATUS Pago"), então cada card lê como um
 * par rótulo→valor mesmo sem o thead. Headers ReactNode (checkbox "selecionar
 * todos") NÃO viram rótulo — evita duplicar controle interativo por card.
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
  /** card-mode (<lg) ligado? Falso = grade densa + scroll-x contido no wrap. */
  cardMode?: boolean;
}

const TableRoot = React.forwardRef<HTMLTableElement, TableRootProps>(
  ({ className, containerClassName, cardMode = true, ...props }, ref) => (
    // Wrap card do mockup (`.table-wrap`): a tabela é um card raised com
    // radius-lg + elev-1, não uma <table> nua sobre o fundo. overflow-x-auto
    // preserva o scroll horizontal E recorta os cantos arredondados.
    //
    // RESP-M5 (<lg = mesmo breakpoint do shell/drawer, preset L55-58): em
    // card-mode a Table densa vira cards — cada linha empilha (ver Table body) e
    // o wrap larga a moldura única + o overflow-x-auto (sem <table> larga, o
    // min-content de ~772px some e o documento não é empurrado à horizontal).
    // Em responsive="scroll" (cardMode=false) o wrap MANTÉM overflow-x-auto em
    // toda largura: a grade densa fica e o scroll-x é CONTIDO aqui, nunca no body.
    <div
      className={cn(
        'w-full overflow-x-auto',
        'bg-[var(--surface-raised)] rounded-[var(--radius-lg)] shadow-elev-1',
        cardMode &&
          'max-lg:overflow-visible max-lg:bg-transparent max-lg:rounded-none max-lg:shadow-none',
        containerClassName,
      )}
    >
      <table
        ref={ref}
        className={cn('w-full border-collapse', cardMode && 'max-lg:block max-lg:w-full', className)}
        {...props}
      />
    </div>
  ),
);
TableRoot.displayName = 'TableRoot';

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & { cardMode?: boolean }
>(({ className, cardMode = true, ...props }, ref) => (
  // RESP-M5: em card-mode (<lg) o thead some — cada célula do card carrega o
  // próprio rótulo (ver TableCell), padrão acessível de tabela responsiva. Em
  // responsive="scroll" o thead FICA (a grade densa precisa dos cabeçalhos).
  <thead ref={ref} className={cn(cardMode && 'max-lg:hidden', className)} {...props} />
));
TableHeader.displayName = 'TableHeader';

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> & { cardMode?: boolean }
>(({ className, cardMode = true, ...props }, ref) => (
  <tbody ref={ref} className={cn(cardMode && 'max-lg:block', className)} {...props} />
));
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
  React.TdHTMLAttributes<HTMLTableCellElement> & { cardMode?: boolean }
>(({ className, cardMode = true, ...props }, ref) => (
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
      // RESP-M5 card-mode (<lg): a célula vira linha "rótulo … valor" dentro do
      // card. O rótulo (injetado na composição, só p/ header string) fica à
      // esquerda; o valor à direita. Fio subtle separa as células; a última do
      // card perde o fio (regra no <tr>). `max-lg:min-w-0` (revisão r1 A3) deixa
      // a célula-flex ENCOLHER abaixo do conteúdo → um token longo (e-mail/URL/
      // UUID) quebra no valor em vez de estourar e ser cortado pelo overflow do
      // card. Em responsive="scroll" nada disso aplica (grade densa preservada).
      cardMode &&
        'max-lg:flex max-lg:items-center max-lg:justify-between max-lg:gap-[var(--spacing-4)] max-lg:min-w-0 max-lg:border-b max-lg:border-b-[var(--border-subtle)]',
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
  /** Texto do cabeçalho, ou um nó (ex.: checkbox "selecionar todos"). */
  header: React.ReactNode;
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
  /**
   * Clique na LINHA inteira (abre detalhe/slide-in) — conveniência de mouse.
   * A linha PRESERVA role=row (semântica de tabela para leitor de tela); NÃO
   * viramos a `<tr>` num role=button (isso apagaria a estrutura da tabela). O
   * acesso por teclado fica no controle interno da linha (ex.: botão "Detalhe"
   * em `renderActions`) — padrão acessível de "linha clicável com alvo real".
   * Cliques em controles interativos dentro da linha (checkbox, botões, links)
   * NÃO disparam o onRowClick (o handler ignora alvos input/button/a/label).
   */
  onRowClick?: (row: TRow) => void;
  className?: string;
  /**
   * Comportamento abaixo de `lg` (<1024px). Default `'card'`: cada linha empilha
   * como card e cada célula vira "RÓTULO … valor" (leitura de cima p/ baixo no
   * celular — design-principles §(c)). `'scroll'` é o opt-out para MATRIZ de
   * comparação em grade (ex.: estoque kit×modalidade), onde virar card apaga a
   * leitura "qual coluna está curta entre as linhas": mantém a tabela densa e
   * rola na horizontal DENTRO do wrap (`overflow-x-auto` contido no card, nunca
   * no body/documento). Use `'scroll'` só em grade de comparação.
   */
  responsive?: 'card' | 'scroll';
}

/** Um clique nasceu de um controle interativo (não deve abrir o detalhe)? */
function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('button, a, input, label, select, [role="menu"], [data-row-stop]'));
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
  onRowClick,
  className,
  responsive = 'card',
}: TableProps<TRow>): JSX.Element {
  const hasActions = Boolean(renderActions);
  const clickable = Boolean(onRowClick);
  // card-mode (empilhar em cards <lg) é o default; 'scroll' mantém a grade densa
  // e o scroll-x contido no wrap (matriz de comparação). Um flag só, propagado.
  const cardMode = responsive === 'card';

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
    <TableRoot containerClassName={className} cardMode={cardMode}>
      {caption && <TableCaption>{caption}</TableCaption>}

      {/* Header */}
      <TableHeader cardMode={cardMode}>
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
      <TableBody cardMode={cardMode}>
        {data.map((row) => (
          <TableRow
            key={keyExtractor(row)}
            className={cn(
              'h-[var(--table-row-height)]',
              'hover:bg-[var(--table-row-hover)]',
              clickable && 'cursor-pointer',
              // RESP-M5 card-mode (<lg): a linha vira um card empilhado (raised +
              // radius + elev-1, sem o divisor de linha) e a última célula do
              // card perde o fio subtle. Em lg+ (e em responsive="scroll") nada
              // disso aplica — tabela densa intocada.
              cardMode &&
                'max-lg:block max-lg:h-auto max-lg:mb-[var(--spacing-3)] max-lg:rounded-[var(--radius-lg)] max-lg:bg-[var(--surface-raised)] max-lg:shadow-elev-1 max-lg:overflow-hidden max-lg:border-b-0 max-lg:[&>*:last-child]:border-b-0',
            )}
            {...(clickable
              ? {
                  onClick: (e: React.MouseEvent<HTMLTableRowElement>) => {
                    if (isInteractiveTarget(e.target)) return;
                    onRowClick?.(row);
                  },
                }
              : {})}
          >
            {columns.map((col) => {
              // Rótulo do card só para header textual: um header ReactNode (ex.:
              // checkbox "selecionar todos") NÃO vira rótulo — evita duplicar
              // controles interativos em cada card (a11y). Só em card-mode. Zero
              // mudança de API.
              const mobileLabel =
                cardMode && typeof col.header === 'string' ? col.header : null;
              return (
                <TableCell key={col.key} cardMode={cardMode} className={alignClass(col.align)}>
                  {mobileLabel && (
                    <span className="hidden max-lg:block shrink-0 text-left text-[length:var(--table-header-font-size)] font-[var(--font-weight-semibold)] uppercase tracking-[var(--table-header-spacing)] text-muted-foreground">
                      {mobileLabel}
                    </span>
                  )}
                  {/* Revisão r1 A3: o valor quebra (overflow-wrap) e encolhe
                      (min-w-0) no card — um token único longo não estoura o flex
                      p/ ser cortado pelo overflow do card. Escopo max-lg: desktop
                      e responsive="scroll" ficam byte-idênticos. */}
                  {cardMode ? (
                    <span className="max-lg:min-w-0 max-lg:[overflow-wrap:anywhere]">
                      {col.render ? col.render(row) : defaultCell(row, col.key)}
                    </span>
                  ) : col.render ? (
                    col.render(row)
                  ) : (
                    defaultCell(row, col.key)
                  )}
                </TableCell>
              );
            })}
            {hasActions && renderActions && (
              <TableCell cardMode={cardMode} className="text-right max-lg:justify-end">
                {renderActions(row)}
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </TableRoot>
  );
}

Table.displayName = 'Table';

export { Table };
