/**
 * Popover — painel flutuante ancorado (S-R9-05 · governança §8).
 *
 * Primitivo de ANCORAGEM shadcn/Radix (`@radix-ui/react-popover`): posiciona um
 * painel do DS junto a um trigger, em portal, com colisão/flip automáticos, foco
 * gerido e dismiss por Esc/click-fora (a11y WAI-APG do Radix, não reinventada).
 * É a âncora que o `Combobox` e o `Calendar`/`DateRangePicker` usam para abrir um
 * painel DO DS — nunca a caixa do sistema operacional (a queixa do Vitor).
 *
 * NÃO confundir com o antigo `Popover` do E01 (menu de ações), que virou
 * `DropdownMenu`. Este é o primitivo de âncora genérico.
 *
 * Painel: tokens shadcn→brasa (bg-popover = surface-overlay-opaque desde a
 * DELTA-UX/D-1008-R4 — painel flutuante nunca pinta o filme translúcido do
 * vidro; text-popover-foreground, border-border, shadow-elev-2, rounded-md),
 * focus ring de 2px herdado dos filhos. Animações animate-in stock.
 */

import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../../utils/cn';

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;
const PopoverClose = PopoverPrimitive.Close;

export interface PopoverContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> {}

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, align = 'start', sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[var(--popover-min-width)] w-max',
        'overflow-hidden rounded-md border border-border',
        'bg-popover text-popover-foreground',
        'shadow-elev-2 p-[var(--spacing-1)]',
        'animate-in fade-in-0 zoom-in-95',
        'origin-[--radix-popover-content-transform-origin]',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverAnchor, PopoverClose, PopoverContent };
