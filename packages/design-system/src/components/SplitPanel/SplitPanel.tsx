/**
 * SplitPanel — o bento assimétrico de dois painéis: empilhado no estreito,
 * lado a lado em proporção declarada a partir de `lg`.
 *
 * POR QUE EXISTE. Inventário de 2026-08-11, §7.1: **cinco receitas** para dois
 * painéis lado a lado — `lg:grid-cols-[3fr_2fr]` (4×), `[7fr_3fr]` (3×),
 * `[1fr_3fr]` (1×) e mais duas. "Bento" é uma das palavras que o dono usou ao
 * abrir a CANONE-1, e era exatamente a família sem componente.
 *
 * A PROPORÇÃO É TOKEN, NÃO CLASSE. `--layout-split-3-2`, `--layout-split-7-3`
 * e `--layout-split-1-3` moram em `tokens/component.json` e saem nos três
 * temas. A fração deixa de ser escolha de cada tela e passa a ser um degrau do
 * sistema, com nome — que é o pedido do dono na CANONE-1 escrito em CSS.
 *
 * O CONJUNTO É FECHADO nas três proporções medidas. Uma quarta entra por
 * token novo e linha no cânone, no mesmo commit — nunca por `className` de
 * tela, que é como as cinco receitas nasceram.
 *
 * `lg` É O DEGRAU E NÃO É PROP. As cinco receitas medidas usam `lg:` sem
 * exceção, e `lg` é o ponto de colapso do shell declarado no preset: abaixo
 * dele o conteúdo tem menos de 784px e dois painéis lado a lado não cabem.
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
const splitPanelVariants = cva('grid grid-cols-1', {
  variants: {
    /** Painel principal : painel de apoio, na ordem em que os filhos entram. */
    ratio: {
      '3:2': 'lg:grid-cols-[var(--layout-split-3-2)]',
      '7:3': 'lg:grid-cols-[var(--layout-split-7-3)]',
      '1:3': 'lg:grid-cols-[var(--layout-split-1-3)]',
    },
    gap: {
      sm: 'gap-[var(--layout-list-gap)]',
      md: 'gap-[var(--layout-grid-gap)]',
      lg: 'gap-[var(--layout-main-gap)]',
    },
  },
  defaultVariants: { ratio: '3:2', gap: 'md' },
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type SplitPanelElement = 'div' | 'section';

export interface SplitPanelProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof splitPanelVariants> {
  /** Elemento renderizado (default `div`). Layout não decide semântica. */
  as?: SplitPanelElement;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SplitPanel = React.forwardRef<HTMLDivElement, SplitPanelProps>(
  ({ as = 'div', ratio, gap, className, ...props }, ref) => {
    // Ver a nota do `Stack` sobre o cast.
    const Element = as as 'div';
    return (
      <Element
        ref={ref}
        className={cn(splitPanelVariants({ ratio, gap }), className)}
        {...props}
      />
    );
  },
);
SplitPanel.displayName = 'SplitPanel';

export { SplitPanel, splitPanelVariants };
