/**
 * KpiCard — card flat (§2.16) de indicador. Promovido ao DS a partir das 4
 * cópias que haviam divergido no painel (eventos/_components, clubes/_components,
 * plataforma/_components e o CardKpi local do EstoqueView). Presentational puro
 * (só props): label + valor + hint opcional, tudo por token.
 *
 * PROVENIÊNCIA: união dos 4 clones. O padrão dominante (eventos + clubes) define
 * o canônico — label `text-secondary`, valor `text-xl` bold, hint `text-tertiary`,
 * card flat `surface-raised` com `card-radius`. As duas variações reais viram
 * props semânticas, não knobs cosméticos:
 *   - `emphasis="critico"` — borda-esquerda Vulcão (a ÚNICA exceção ao flat
 *     permitida no épico §2.16), vinda da cópia de eventos.
 *   - `tone="danger"` — pinta o VALOR (ex.: KPI "Em risco"), vinda do CardKpi
 *     do EstoqueView.
 * `tabular-nums` no valor é o default correto de KPI (números não pulam ao
 * atualizar) — já era o comportamento das cópias de plataforma e estoque.
 *
 * A11y: label e valor são texto legível; o agrupamento de KPIs recebe o
 * `aria-label` na `<section>` do consumidor (padrão do painel). Born-responsive:
 * o card é fluido (flex-col, sem largura fixa) e ocupa a célula do grid do
 * consumidor — não impõe grade própria.
 */

import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface KpiCardProps {
  /** Rótulo do indicador (ex.: "Inscritos"). */
  label: string;
  /** Valor formatado (ex.: "1.284", "R$ 42.180,00", "—"). */
  value: string;
  /** Legenda opcional abaixo do valor (ex.: "vs. 7 dias"). */
  hint?: string;
  /**
   * Realce do card. `critico` acende a borda-esquerda Vulcão — única exceção
   * ao flat §2.16 sancionada no épico. Default: sem borda (flat).
   */
  emphasis?: 'default' | 'critico';
  /**
   * Tom do valor. `danger` pinta o número (ex.: KPI "Em risco" > 0).
   * Default: `text-primary`.
   */
  tone?: 'default' | 'danger';
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function KpiCard({
  label,
  value,
  hint,
  emphasis = 'default',
  tone = 'default',
  className,
}: KpiCardProps): JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col gap-[var(--spacing-1)]',
        'rounded-[var(--card-radius)] bg-[var(--surface-raised)]',
        '[backdrop-filter:var(--card-blur)]',
        'p-[var(--spacing-5)]',
        emphasis === 'critico' &&
          'border-l-4 border-l-[var(--border-danger)] pl-[var(--spacing-4)]',
        className,
      )}
    >
      <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
        {label}
      </span>
      <span
        className={cn(
          'text-[length:var(--font-size-xl)] font-[var(--font-weight-bold)]',
          '[font-variant-numeric:tabular-nums]',
          tone === 'danger' ? 'text-[var(--text-danger)]' : 'text-[var(--text-primary)]',
        )}
      >
        {value}
      </span>
      {hint ? (
        <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

KpiCard.displayName = 'KpiCard';
