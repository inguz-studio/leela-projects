/**
 * Input — §2.16 borda permitida (excepção explícita ao flat).
 *
 * PROVENIÊNCIA: campo interno = shadcn stock `input` restilizado ao brasa; a
 * casca (label + mensagem de erro + aria-describedby) é o valor da NOSSA API e
 * fica por cima do primitivo stock. Diff vs stock (esteira shadcn→brasa):
 *   - API pública PRESERVADA: props errorMessage, label, wrapperClassName;
 *   - borda por alias `border-input` (= border-strong): é o ÚNICO identificador
 *     visual do campo (bg raised ≈ bg da página) e WCAG 1.4.11 exige ≥3:1 —
 *     border-default ficava em 2.4–1.5:1; input/background está provado
 *     (shadcn-aliases.test.ts) e border-strong/surface-raised na matriz (L130);
 *   - placeholder por alias `text-muted-foreground` (= text-tertiary);
 *   - foco por `focus:ring-2 ring-ring` (ring = border-focus) — mantido `focus:`
 *     (glow ao clique também), não o `focus-visible:` do stock;
 *   - dimensões/tipo/radius por token de componente (--input-*), motion tokenizado.
 *
 * Estados: default | hover | focus (glow via ring) | invalid (border-danger +
 * erro inline) | disabled. A11y: aria-invalid, aria-describedby, focus ring.
 */

import * as React from 'react';
import { cn } from '../../utils/cn';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Error message shown below the field; also sets aria-invalid. */
  errorMessage?: string;
  /** Label visible above the field (for compact inline usage pass label via aria-label). */
  label?: string;
  /** Extra wrapper class. */
  wrapperClassName?: string;
  /**
   * Aparência do campo (experimento do Vitor — LEELA-DS-FLAT-INPUTS):
   *   - `default` (§2.16) — fill `surface-raised` + borda `border-input`, o
   *     identificador visual atual (WCAG 1.4.11 ≥3:1);
   *   - `flat` — SEM borda em repouso; o identificador passa a ser o FILL
   *     `surface-sunken` (inset, contrasta com a página) e o foco segue por
   *     glow ring. Estado inválido reacende a borda-danger (a11y do erro nunca
   *     depende só da cor). NÃO é o default global — variante opt-in.
   */
  variant?: 'default' | 'flat';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      errorMessage,
      label,
      wrapperClassName,
      variant = 'default',
      id,
      disabled,
      'aria-describedby': ariaDescribedBy,
      ...props
    },
    ref,
  ) => {
    const flat = variant === 'flat';
    // id ESTÁVEL mesmo sem `id` do consumidor: a mensagem de erro precisa de um
    // alvo real senão o aria-describedby fica sem id e o erro não é associado
    // (bug do showroom: aria-describedby s/ id). useId dá um id determinístico.
    const reactId = React.useId();
    const fieldId = id ?? reactId;
    const errorId = `${fieldId}-error`;
    const hasError = Boolean(errorMessage);
    // Preserva o aria-describedby do consumidor (ex.: uma dica) e ANEXA o erro,
    // em vez de um sobrescrever o outro.
    const describedBy =
      [ariaDescribedBy, hasError ? errorId : null].filter(Boolean).join(' ') || undefined;

    return (
      <div className={cn('flex flex-col gap-1', wrapperClassName)}>
        {label ? (
          <label
            htmlFor={fieldId}
            className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]"
          >
            {label}
          </label>
        ) : null}

        <input
          ref={ref}
          id={fieldId}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            // Base layout
            'block w-full',
            'h-[var(--input-height)] px-[var(--input-px)]',
            'rounded-[var(--input-radius)]',
            'text-[length:var(--input-font-size)]',
            // Colors & border. Default (§2.16): bg raised ≈ bg da página → a
            // borda (border-input = border-strong) é o identificador visual
            // (WCAG 1.4.11 ≥3:1). Flat (experimento): sem borda em repouso, o
            // fill sunken passa a ser o identificador; borda transparente
            // preserva a caixa (mesma altura/reflow) e o foco segue por ring.
            'text-[var(--text-primary)]',
            flat
              ? 'bg-[var(--surface-sunken)] border-[length:var(--input-border-width)] border-transparent'
              : 'bg-[var(--surface-raised)] border-[length:var(--input-border-width)] border-input',
            // Placeholder — alias muted-foreground = text-tertiary
            'placeholder:text-muted-foreground',
            // Focus — glow ring via alias ring (border-focus), não border
            'focus:outline-none',
            'focus:ring-2 focus:ring-ring focus:ring-offset-0',
            // Invalid
            hasError && 'border-[var(--border-danger)] focus:ring-[color:var(--border-danger)]',
            // Disabled
            'disabled:cursor-not-allowed disabled:opacity-40',
            // Transition
            'transition-[border-color,box-shadow] duration-[var(--motion-duration-fast)] ease-[var(--motion-easing-default)]',
            className,
          )}
          {...props}
        />

        {hasError && errorMessage ? (
          <span
            id={errorId}
            role="alert"
            className="text-[length:var(--font-size-sm)] text-[var(--text-danger)]"
          >
            {errorMessage}
          </span>
        ) : null}
      </div>
    );
  },
);
Input.displayName = 'Input';

export { Input };
