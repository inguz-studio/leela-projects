/**
 * IconButton — botão de ícone 36×36 da toolbar (mockup be-hero `.icon-btn`).
 *
 * PROVENIÊNCIA: shape do shadcn stock `button` size icon (quadrado, p-0)
 * como componente próprio: o Button do DS carrega tríade de cor por variant;
 * o `.icon-btn` do mockup é sempre ghost (transparente → hover surface-raised)
 * e adiciona o `pip` de notificação — API distinta justifica átomo distinto.
 *   - dimensões por token (--iconbtn-size/icon-size), radius sm do mockup;
 *   - pip 7px na cor da marca com anel na cor do fundo (--iconbtn-pip-*),
 *     aria-hidden: o SIGNIFICADO (ex.: "notificações não lidas") é descrito
 *     pelo consumidor no aria-label;
 *   - foco visível com o mesmo anel do Button (ring alias + --btn-focus-ring);
 *   - disabled opacity-40 (padrão do Button).
 *
 * A11y: `aria-label` OBRIGATÓRIO na tipagem — o conteúdo é só ícone.
 * AA: text-secondary/primary sobre base/raised — pares na matriz; pip é
 * não-texto brand sobre surface-base (par action-primary×base na matriz).
 * §2.16 flat — sem borda decorativa.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Nome acessível do botão (obrigatório — o conteúdo visível é só ícone). */
  'aria-label': string;
  /** Pip de notificação (decorativo; descreva o estado no aria-label). */
  pip?: boolean;
  /** Ícone (ex.: lucide) — dimensionado por token via seletor de svg. */
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, pip = false, type = 'button', disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        aria-disabled={disabled}
        className={cn(
          'relative inline-flex items-center justify-center shrink-0',
          'w-[var(--iconbtn-size)] h-[var(--iconbtn-size)]',
          'rounded-[var(--radius-sm)]',
          'bg-transparent text-[var(--text-secondary)]',
          'hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]',
          'transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
          'focus-visible:outline-none',
          'focus-visible:ring-[length:var(--btn-focus-ring)]',
          'focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background',
          'disabled:pointer-events-none disabled:opacity-40',
          '[&_svg]:w-[var(--iconbtn-icon-size)] [&_svg]:h-[var(--iconbtn-icon-size)] [&_svg]:shrink-0',
          className,
        )}
        {...props}
      >
        {children}
        {pip && (
          <span
            aria-hidden
            data-testid="iconbutton-pip"
            className={cn(
              'absolute rounded-full',
              'top-[var(--iconbtn-pip-inset)] right-[var(--iconbtn-pip-inset)]',
              'w-[var(--iconbtn-pip-size)] h-[var(--iconbtn-pip-size)]',
              'bg-[var(--border-brand)]',
              'border-solid border-[length:var(--iconbtn-pip-border)] border-[color:var(--surface-base)]',
            )}
          />
        )}
      </button>
    );
  },
);
IconButton.displayName = 'IconButton';

export { IconButton };
