/**
 * Tooltip — dica flutuante acessível (PoC da esteira shadcn+brasa, Lote A).
 *
 * PROVENIÊNCIA: gerado por `pnpm dlx shadcn@latest add tooltip` (stock) e
 * adaptado às regras do DS. Diff vs stock:
 *   - import de `cn` relativo (padrão dos componentes do DS);
 *   - `border-border` explícito (o DS não usa o reset global `* { border-border }`);
 *   - spacing/tipografia via tokens: px-3→var(--spacing-3), py-1.5→var(--spacing-1),
 *     text-sm (0.875rem stock) → var(--font-size-base) (0.875rem brasa);
 *   - shadow-md → shadow-elev-2 (token de elevação);
 *   - classes animate-in/out DEVOLVIDAS stock (A2): tailwindcss-animate agora é
 *     dependency do DS e entra no preset via `plugins: [animate]`; o motion sai
 *     tokenizado — animate-in sem modificador roda em var(--motion-duration-fast)
 *     + var(--motion-easing-default) (animationDuration/TimingFunction.DEFAULT no preset).
 * As classes de ALIAS (bg-popover, text-popover-foreground, rounded-md, border)
 * ficam stock de propósito: são a prova de que a ponte shadcn→brasa funciona.
 *
 * AA: par popover-foreground/popover = text-primary/surface-overlay — coberto
 * pela matriz de contraste (contrast.test.ts) e re-provado no nível de alias
 * (shadcn-aliases.test.ts). Nenhum par novo introduzido.
 *
 * A11y (Radix Tooltip): role="tooltip", abre em focus/hover, fecha em Esc,
 * conteúdo associado ao trigger — WAI-APG tooltip pattern.
 */

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '../../utils/cn';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border border-border bg-popover',
      'px-[var(--spacing-3)] py-[var(--spacing-1)]',
      'text-[length:var(--font-size-base)] text-popover-foreground',
      'shadow-elev-2',
      'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className,
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
