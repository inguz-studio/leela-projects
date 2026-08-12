/**
 * Card — contêiner genérico de superfície (Lote A restante).
 *
 * PROVENIÊNCIA: shadcn stock `card` (composicional: Card/CardHeader/CardTitle/
 * CardDescription/CardContent/CardFooter) restilizado ao brasa. Diff vs stock:
 *   - cores por ALIAS shadcn→brasa: bg-card (= surface-raised),
 *     text-card-foreground (= text-primary), text-muted-foreground
 *     (= text-tertiary) na descrição, border-border (= border-default);
 *   - spacing por token (p-6 stock → var(--spacing-6); space-y-1.5 →
 *     gap var(--spacing-1)); tipografia por token de papel
 *     (--font-size-lg / --font-weight-semibold);
 *   - shadow-sm stock → shadow-elev-1 (token de elevação).
 *
 * É o alvo genérico da substituição "Card" do E01 (decisão 1 do brief
 * ds-consolidacao). CardEvento/CardDesafio são composições de DOMÍNIO
 * (kind domain) e permanecem — podem migrar para compor este Card em lote
 * futuro sem quebra (mesmos tokens de superfície).
 *
 * AA: card-foreground/card = text-primary/surface-raised ✓ e
 * muted-foreground/card = text-tertiary/surface-raised ✓ — ambos já na
 * matriz de contraste (contrast.test.ts) e na tabela de aliases
 * (shadcn-aliases.test.ts). Nenhum par novo. border-border é decorativa
 * (frame shadcn), fora do gate 1.4.11.
 *
 * `as` (Onda 0 Parte B · CANONE-1). O handoff da Onda 1 nomeou a lacuna: o
 * `Card` renderiza `<div>` sempre, então converter um `<article>` de lista ou
 * uma `<section aria-label>` para o canônico APAGAVA a semântica — `<div>`
 * filho direto de `<ul>` quebra a lista, e `aria-label` sem `role` não é
 * landmark nenhum. `asChild` do Radix resolveria e está barrado na landing
 * pelo ADR-017 (a entrada `/server` é Radix-free). A polimorfia fechada abaixo
 * resolve os dois casos sem dependência nova e sem custo de bundle público.
 * Ela é de SEMÂNTICA, não de visual: o `className` é byte a byte o mesmo em
 * qualquer tag.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

/**
 * Tags permitidas no `Card`. Lista fechada e não-interativa de propósito:
 * cartão navegável é `<a>`/`<button>` POR FORA (ou `CardEvento`, que já trata
 * os dois), e abrir a lista para elementos interativos traria `href`/`type`
 * para dentro de um componente que não sabe nada sobre navegação.
 */
export type CardElement = 'div' | 'article' | 'section' | 'li' | 'aside';

// Tipos de props exportados (bug do showroom: o Card não expunha tipos). São
// aliases das props nativas HTML de cada subcomponente — a única prop própria
// é `as`, e ela só troca a tag.
export type CardProps = React.HTMLAttributes<HTMLDivElement> & { as?: CardElement };
export type CardHeaderProps = React.HTMLAttributes<HTMLDivElement>;
export type CardTitleProps = React.HTMLAttributes<HTMLHeadingElement> & {
  /** Nível do heading. Navegação de leitor de tela, não tamanho de letra. */
  as?: 'h2' | 'h3' | 'h4';
};
export type CardDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>;
export type CardContentProps = React.HTMLAttributes<HTMLDivElement>;
export type CardFooterProps = React.HTMLAttributes<HTMLDivElement>;

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ as = 'div', className, ...props }, ref) => {
    // O cast fixa a TIPAGEM das props em `div` enquanto o runtime renderiza a
    // tag pedida. Sem ele, `HTMLAttributes<HTMLDivElement>` num `<article>`
    // reprova por contravariância dos handlers de evento — e generalizar as
    // props para `HTMLElement` quebraria todo consumidor que hoje passa um
    // handler tipado em div.
    const Element = as as 'div';
    return (
      <Element
        ref={ref}
        className={cn(
          'rounded-lg border border-border bg-card text-card-foreground shadow-elev-1',
          '[backdrop-filter:var(--card-blur)]',
          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-[var(--spacing-1)] p-[var(--spacing-6)]', className)}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ as = 'h3', className, children, ...props }, ref) => {
    // Mesma polimorfia fechada do `Card`, e pela mesma razão: o cartão de
    // domínio dentro de um bloco que já tem `h2` precisa de `h3`/`h4`, e
    // heading fora de ordem é um defeito de navegação por leitor de tela que
    // nenhum gate de cor pega.
    const Heading = as as 'h3';
    return (
      <Heading
        ref={ref}
        className={cn(
          'text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] leading-none tracking-tight',
          className,
        )}
        {...props}
      >
        {children}
      </Heading>
    );
  },
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-[length:var(--font-size-sm)] text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-[var(--spacing-6)] pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center p-[var(--spacing-6)] pt-0', className)}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
