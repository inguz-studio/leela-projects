/**
 * MetricGrid — a grade de indicadores: a fileira de KPIs que quebra em 2×2 no
 * celular e vira coluna única no aparelho estreito.
 *
 * POR QUE EXISTE. Inventário de 2026-08-11, §7.1: **sete receitas** para a
 * mesma família — `grid-cols-2 lg:grid-cols-4` (12×), `grid-cols-2
 * md:grid-cols-4` (6×), `grid-cols-1 xs:grid-cols-2 lg:grid-cols-4` (4×) e
 * mais quatro. A diferença entre `md:` e `lg:` na quarta coluna é gosto; a
 * diferença entre começar em 1 ou em 2 colunas NÃO é, e tem decisão escrita.
 *
 * A ESCADA É FIXA, E A RAZÃO ESTÁ NO PRESET. `xs` (480px) entrou na escala em
 * REDESIGN-V2 · item 6 exatamente por causa deste bloco: abaixo de 480 o
 * rótulo do KPI corta, então a fileira vira coluna única e as divisórias
 * verticais saem junto (sem coluna vizinha elas não separam nada). O
 * comentário está em `tailwind-preset.ts`, e é ele que este componente
 * executa. Oferecer `grid-cols-2` desde 0px seria republicar a receita que a
 * decisão aposentou.
 *
 * O QUE SOBRA DE PROP. Só `columns` — 2, 3 ou 4 — porque isso é conteúdo (o
 * número de indicadores), não gosto.
 *
 * AA: nenhum par de cor novo — o componente não pinta nada.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

// Classes literais por braço — ver a nota do `FormGrid` sobre o JIT.
const metricGridVariants = cva('grid grid-cols-1 xs:grid-cols-2', {
  variants: {
    columns: {
      2: '',
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
    },
    gap: {
      sm: 'gap-[var(--layout-list-gap)]',
      md: 'gap-[var(--layout-grid-gap)]',
      lg: 'gap-[var(--layout-main-gap)]',
    },
  },
  defaultVariants: { columns: 4, gap: 'md' },
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type MetricGridElement = 'div' | 'section' | 'ul';

export interface MetricGridProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof metricGridVariants> {
  /** Elemento renderizado (default `div`). Layout não decide semântica. */
  as?: MetricGridElement;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MetricGrid = React.forwardRef<HTMLDivElement, MetricGridProps>(
  ({ as = 'div', columns, gap, className, ...props }, ref) => {
    // Ver a nota do `Stack` sobre o cast.
    const Element = as as 'div';
    return (
      <Element
        ref={ref}
        className={cn(metricGridVariants({ columns, gap }), className)}
        {...props}
      />
    );
  },
);
MetricGrid.displayName = 'MetricGrid';

export { MetricGrid, metricGridVariants };
