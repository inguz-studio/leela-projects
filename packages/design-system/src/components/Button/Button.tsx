/**
 * Button — §2.16 flat, sem borda decorativa.
 *
 * PROVENIÊNCIA: miolo shadcn stock `button` (Slot + cva) restilizado ao brasa.
 * O stock JÁ é a nossa arquitetura (Radix Slot + class-variance-authority). Diff
 * vs stock (esteira shadcn→brasa, mesma receita do Tooltip):
 *   - API pública PRESERVADA: variantes primary|secondary|ghost|destructive e
 *     sizes sm|md|lg (NÃO os nomes stock default/outline/link/icon) — as ~33
 *     telas do painel importam por estes nomes;
 *   - cores de estado por TOKEN semântico (bg-[var(--action-*)] /
 *     text-[var(--action-*-fg)] + hover/active em --action-*-hover|-pressed): a
 *     matriz de contraste referencia esses tokens DIRETO e outros componentes
 *     compõem sobre eles (ex.: ConfirmModal afirma o botão destrutivo pelo token),
 *     então ficam token (não alias) — o stock usaria `bg-primary/90`, modificador
 *     de alpha PROIBIDO com var() hex, trocado por token de estado do brasa;
 *   - focus ring por ALIAS shadcn→brasa: ring-ring (= border-focus) +
 *     ring-offset-background (= surface-base), com largura por token
 *     (--btn-focus-ring) — prova a ponte de aliases no anel de foco;
 *   - dimensões (altura/px/font) por token de componente (--btn-*), motion
 *     tokenizado, borda estrutural transparente (mockup `.btn`) e opacity de
 *     disabled do brasa (40);
 *   - secondary é OUTLINE + brand-tint (congruência mockup 2026-07-06): borda
 *     border-strong em repouso, hover com --action-brand-tint + borda brand e
 *     texto --action-brand-tint-fg (brasa-400 — o "hover da marca" para TEXTO;
 *     desacoplado de --action-primary-hover, que desde o D-PATCH é o bg do
 *     botão primário escurecido para AA com fg branco, D4);
 *   - primary tem fg BRANCO (D4, decisão Vitor): a tríade default/hover/pressed
 *     usa laranja escurecido (#D63500/#DC3700/#B82D00) — branco ≥ 4.5:1 nos 3
 *     estados, provado na matriz. Hover clareia e pressed escurece (direção do
 *     mockup preservada).
 *
 * AA: pares fg/bg dos variants cheios caem na matriz já provada — cada
 * action-*-fg sobre a própria superfície de ação e seus estados hover/pressed
 * (contrast.test.ts) e ring/offset por alias (shadcn-aliases.test.ts). O hover
 * do secondary (texto brand sobre tint alpha) é provado por composição
 * alpha-sobre-surface no bloco brand-tint do contrast.test.ts.
 *
 * A11y: type="button" por padrão (evita submit acidental); foco via ring;
 * `aria-disabled` reflete o estado disabled; contraste WCAG AA em todos os pares.
 */

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import type { VariantProps } from 'class-variance-authority';
import { buttonVariants } from './variants';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * When true, renders the Radix Slot — passes all props to the immediate child.
   * Useful for wrapping <Link> elements.
   */
  asChild?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      type = 'button',
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    return (
      <Comp
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled}
        aria-disabled={disabled}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
