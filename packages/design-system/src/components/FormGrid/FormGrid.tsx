/**
 * FormGrid — a grade de formulário: uma coluna no estreito, duas ou três a
 * partir de um degrau.
 *
 * POR QUE EXISTE. Inventário de 2026-08-11, §7.1: o painel tem 106 ocorrências
 * de `grid grid-cols-*` escritas com **23 assinaturas distintas** para o que
 * são três famílias. Esta é a maior delas — **oito receitas** para o mesmo
 * gesto: `grid-cols-1 sm:grid-cols-2` (30×), `grid-cols-1 sm:grid-cols-3`
 * (10×), `grid-cols-1 lg:grid-cols-2` (10×) e mais cinco. Ninguém errou; não
 * havia o que importar, e cada tela reinventou a fração e o breakpoint.
 *
 * O QUE ELE FECHA. Oito receitas viram duas perguntas com resposta fechada:
 * quantas colunas (2 ou 3) e a partir de qual degrau (`sm`, `md`, `lg`). A
 * coluna única embaixo NÃO é opção — é o contrato do sistema mobile-first, e a
 * tela que quisesse duas colunas em 390px estaria decidindo contra a escala
 * declarada no preset.
 *
 * CAMPO QUE OCUPA A LINHA INTEIRA. Use `className="col-span-full"` no filho.
 * `col-span-full` vale para qualquer contagem de coluna e qualquer degrau, o
 * que é justamente o motivo de não haver prop para isso: um `span` acoplado a
 * `columns` e a `from` seria uma quarta coisa para manter em sincronia.
 *
 * AA: nenhum par de cor novo — o componente não pinta nada.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

// As classes são LITERAIS e completas em cada braço, nunca concatenadas: o JIT
// do Tailwind varre o fonte por texto (`content` dos dois apps inclui
// `packages/design-system/src`), e uma classe montada em runtime não existe
// para ele — o CSS simplesmente não sai no bundle.
const formGridVariants = cva('grid grid-cols-1', {
  variants: {
    columns: { 2: '', 3: '' },
    from: { sm: '', md: '', lg: '' },
    gap: {
      sm: 'gap-[var(--layout-list-gap)]',
      md: 'gap-[var(--layout-grid-gap)]',
      lg: 'gap-[var(--layout-main-gap)]',
    },
  },
  compoundVariants: [
    { columns: 2, from: 'sm', class: 'sm:grid-cols-2' },
    { columns: 2, from: 'md', class: 'md:grid-cols-2' },
    { columns: 2, from: 'lg', class: 'lg:grid-cols-2' },
    { columns: 3, from: 'sm', class: 'sm:grid-cols-3' },
    { columns: 3, from: 'md', class: 'md:grid-cols-3' },
    { columns: 3, from: 'lg', class: 'lg:grid-cols-3' },
  ],
  defaultVariants: { columns: 2, from: 'sm', gap: 'md' },
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

// `dl` entrou na FIX-CANON-MAIN de 12/08: par rótulo/valor com `<dt>`/`<dd>`
// (agrupados em `<div>`, filho válido de `dl` pela spec) é a mesma anatomia de
// "grade de campos de largura parecida" que esta peça já serve — só que com
// outra tag semântica. "Layout não decide semântica" é o motivo do `as` prop
// existir; recusar `dl` forçaria a tela a reescrever a classe à mão de novo.
export type FormGridElement = 'div' | 'section' | 'fieldset' | 'form' | 'ul' | 'dl';

export interface FormGridProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'>,
    VariantProps<typeof formGridVariants> {
  /** Elemento renderizado (default `div`). Layout não decide semântica. */
  as?: FormGridElement;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const FormGrid = React.forwardRef<HTMLDivElement, FormGridProps>(
  ({ as = 'div', columns, from, gap, className, ...props }, ref) => {
    // Ver a nota do `Stack`: o cast fixa a tipagem em `div` e o runtime usa a
    // tag pedida.
    const Element = as as 'div';
    return (
      <Element
        ref={ref}
        className={cn(formGridVariants({ columns, from, gap }), className)}
        {...props}
      />
    );
  },
);
FormGrid.displayName = 'FormGrid';

export { FormGrid, formGridVariants };
