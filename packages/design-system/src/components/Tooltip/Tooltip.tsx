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
 * AA: par popover-foreground/popover = text-primary/surface-overlay-opaque
 * (DELTA-UX/D-1008-R4: painel flutuante nunca pinta o filme do vidro) — coberto
 * pela matriz de contraste (contrast.test.ts) e re-provado no nível de alias
 * (shadcn-aliases.test.ts). Nenhum par novo introduzido.
 *
 * A11y (Radix Tooltip): role="tooltip", abre em focus/hover, fecha em Esc,
 * conteúdo associado ao trigger — WAI-APG tooltip pattern.
 *
 * PORTAL (UI-ACOES-MOTION · T1, 2026-08-17). O conteúdo sai em
 * `TooltipPrimitive.Portal`, ancorado no `document.body`. Sem ele o Radix
 * renderiza a dica NO LUGAR, como irmã do gatilho — e aí QUALQUER ancestral que
 * estabeleça retângulo de recorte a corta. Não é hipótese: no rail recolhido a
 * dica media 99px de largura com 0px visível, 100% recortada, porque o
 * contêiner dos itens carrega `SCROLL_Y_ONLY` (`overflow-y:auto` +
 * `overflow-x:hidden`) e a dica é posicionada FORA da largura de 84px do rail.
 * O `<nav>` não recortava nada (`overflow-x: visible`) — o recorte era do
 * contêiner de rolagem, e por isso nenhum conserto de `z-index` resolveria:
 * `z-index` não vence recorte de overflow, só sair da caixa vence.
 *
 * O conserto mora AQUI, uma vez, e não em cada tela: toda dica do sistema passa
 * a nascer acima de qualquer overflow. É pré-requisito das ações de tabela por
 * ícone (T2) — a `Table` densa rola dentro do próprio card, então uma dica sem
 * portal seria recortada exatamente igual na primeira linha estreita.
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
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md border border-border bg-popover',
        'px-[var(--spacing-3)] py-[var(--spacing-1)]',
        'text-[length:var(--font-size-base)] text-popover-foreground',
        'shadow-elev-2',
        // Motion atrás de `motion-safe:` (governança §3: "Motion sempre atrás de
        // motion-safe:/prefers-reduced-motion"). As classes vinham stock do
        // shadcn SEM o gate, e a dica era a última superfície flutuante do DS a
        // animar para quem pediu menos movimento — Dialog, Modal, Drawer e
        // DropdownMenu já gateavam desde a BUILD-MOTION (04/08).
        'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=closed]:zoom-out-95 motion-safe:data-[side=bottom]:slide-in-from-top-2 motion-safe:data-[side=left]:slide-in-from-right-2 motion-safe:data-[side=right]:slide-in-from-left-2 motion-safe:data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
