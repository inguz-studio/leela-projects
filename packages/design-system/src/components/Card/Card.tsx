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
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-card text-card-foreground shadow-elev-1',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-[var(--spacing-1)] p-[var(--spacing-6)]', className)}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-[length:var(--font-size-lg)] font-[var(--font-weight-semibold)] leading-none tracking-tight',
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-[length:var(--font-size-sm)] text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-[var(--spacing-6)] pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
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
