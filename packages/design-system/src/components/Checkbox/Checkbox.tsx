// =============================================================================
// Checkbox — seleção por linha e "selecionar todos" na tabela densa.
//
// MOTIVAÇÃO (brief FID-EVT-INSCRITOS · design-principles: seleção em massa via
// checkbox): o Organizador seleciona inscritos e age em lote (enviar mensagem /
// exportar) — "gerenciar a operação em tempo real" (JTBD S203). O DS não tinha
// equivalente; entra como primitivo reusável.
//
// ENGINE: `<input type="checkbox">` nativo (a11y de fábrica: teclado, foco,
// role, estado indeterminate p/ o "selecionar todos" parcial) com uma marca
// visual restilizada ao brasa por cima (accent-color não cobre o marcador em
// todos os browsers, então desenhamos o check e escondemos o box nativo via
// `appearance-none`, mantendo o input como fonte de eventos/foco/teclado).
//
// §2.16 borda permitida (identificador visual do controle vazio). Cores/estado
// marcado por token de ação (--action-primary). Suporta `indeterminate` via
// prop — o React não tem atributo nativo, aplicamos por ref.
// =============================================================================

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Estado parcial (nem todos, nem nenhum) — usado no "selecionar todos". */
  indeterminate?: boolean;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate = false, disabled, checked, ...props }, forwardedRef) => {
    const innerRef = React.useRef<HTMLInputElement>(null);

    // Expõe o ref interno ao chamador sem perder o controle do indeterminate.
    React.useImperativeHandle(forwardedRef, () => innerRef.current as HTMLInputElement);

    React.useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    return (
      <span className="relative inline-flex h-[var(--spacing-5)] w-[var(--spacing-5)] shrink-0 items-center justify-center">
        <input
          ref={innerRef}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className={cn(
            'peer h-[var(--spacing-5)] w-[var(--spacing-5)] appearance-none',
            'rounded-[var(--radius-sm)]',
            'bg-[var(--surface-raised)]',
            'border-[length:var(--input-border-width)] border-input',
            'cursor-pointer',
            'checked:bg-[var(--action-primary)] checked:border-[color:var(--action-primary)]',
            'indeterminate:bg-[var(--action-primary)] indeterminate:border-[color:var(--action-primary)]',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-40',
            'transition-[background-color,border-color] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
            className,
          )}
          {...props}
        />
        {/* Marca de check — visível só quando marcado (não indeterminado). */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute hidden h-[var(--spacing-3)] w-[var(--spacing-3)] text-[var(--action-primary-fg)] peer-checked:block peer-indeterminate:hidden"
        >
          <path d="m5 12 5 5L20 7" />
        </svg>
        {/* Traço de indeterminado. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute hidden h-[var(--spacing-1)] w-[var(--spacing-3)] rounded-[var(--radius-pill)] bg-[var(--action-primary-fg)] peer-indeterminate:block"
        />
      </span>
    );
  },
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };
