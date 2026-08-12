/**
 * Stack — empilhamento vertical com ritmo de token.
 *
 * POR QUE EXISTE. O design system publicava 50 componentes e nenhum de
 * moldura. A medição de 2026-08-11 (inventário §7.1) contou o custo disso na
 * grade; o custo no empilhamento é maior e estava fora do relatório:
 * `flex flex-col gap-*` aparece **448 vezes** só no painel, com sete espaços
 * diferentes (`--spacing-1`, `-2`, `-3`, `-4`, `-5`, `-6`, `-8`). Sete ritmos
 * para uma coisa só — e nenhum deles errado, porque não havia o que importar.
 *
 * O QUE ELE FECHA. A escala de `gap` aqui é FECHADA em seis degraus e o
 * `--spacing-5` ficou de fora de propósito: ele é o único que não tem papel
 * declarado na moldura (`--layout-*` usa 2, 4 e 6) e sobreviveu como escolha
 * de tela. Fechar a escala é o serviço que o primitivo presta; se ele
 * reexportasse a régua inteira do Tailwind, não teria feito nada.
 *
 * O QUE ELE NÃO É. `Stack` não é `Card` (não tem superfície, elevação nem
 * padding) e não é `FormGrid`/`MetricGrid`/`SplitPanel` (não tem colunas). Uma
 * pilha com fundo é `<Card>` com um `Stack` dentro, nessa ordem.
 *
 * AA: nenhum par de cor novo — o componente não pinta nada.
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Variants
// ---------------------------------------------------------------------------

const stackVariants = cva('flex flex-col', {
  variants: {
    /**
     * O degrau `lg` é o default porque é `--layout-stack-gap`, o ritmo que a
     * moldura da página já declarava — o primitivo herda a decisão que existia
     * em vez de inventar a sua.
     */
    gap: {
      none: 'gap-[var(--spacing-0)]',
      xs: 'gap-[var(--spacing-1)]',
      sm: 'gap-[var(--layout-list-gap)]',
      md: 'gap-[var(--spacing-3)]',
      lg: 'gap-[var(--layout-stack-gap)]',
      xl: 'gap-[var(--layout-main-gap)]',
      '2xl': 'gap-[var(--spacing-8)]',
    },
    align: {
      stretch: 'items-stretch',
      start: 'items-start',
      center: 'items-center',
      end: 'items-end',
    },
  },
  defaultVariants: {
    gap: 'lg',
    align: 'stretch',
  },
});

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

/**
 * Elementos permitidos. A lista é curta de propósito: empilhar é layout, e
 * layout não escolhe semântica de conteúdo por conta própria. Quem precisa de
 * `<ul>` diz `as="ul"` e assume os `<li>` filhos.
 */
export type StackElement = 'div' | 'section' | 'article' | 'aside' | 'ul' | 'ol' | 'li' | 'form' | 'fieldset';

export interface StackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {
  /** Elemento renderizado (default `div`). Layout não decide semântica. */
  as?: StackElement;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ as = 'div', gap, align, className, ...props }, ref) => {
    // O cast fixa a TIPAGEM das props em `div` enquanto o runtime renderiza a
    // tag pedida. Sem ele, `HTMLAttributes<HTMLDivElement>` num `<article>`
    // reprova por contravariância dos handlers de evento — e a alternativa
    // (props genéricas em HTMLElement) quebraria todo consumidor que hoje
    // passa um handler tipado em div.
    const Element = as as 'div';
    return <Element ref={ref} className={cn(stackVariants({ gap, align }), className)} {...props} />;
  },
);
Stack.displayName = 'Stack';

export { Stack, stackVariants };
