/**
 * Input — §2.16 borda permitida (excepção explícita ao flat).
 *
 * Estados: default | hover | focus (glow via ring) | invalid (border-danger + erro inline) | disabled
 * A11y: aria-invalid, aria-describedby para erros, focus-visible ring.
 *
 * Tokens consumidos: apenas semantic/component.
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
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const errorId = id ? `${id}-error` : undefined;
    const hasError = Boolean(errorMessage);

    return (
      <div className={cn('flex flex-col gap-1', wrapperClassName)}>
        {label ? (
          <label
            htmlFor={id}
            className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]"
          >
            {label}
          </label>
        ) : null}

        <input
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={hasError && errorId ? errorId : undefined}
          className={cn(
            // Base layout
            'block w-full',
            'h-[var(--input-height)] px-[var(--input-px)]',
            'rounded-[var(--input-radius)]',
            'text-[length:var(--input-font-size)]',
            // Colors & border (input is an exception to flat §2.16).
            // Borda de repouso usa border-strong: é o ÚNICO identificador
            // visual do campo (bg raised ≈ bg da página) e WCAG 1.4.11 exige
            // ≥3:1 — border-default ficava em 2.4–1.5:1 nos temas.
            'bg-[var(--surface-raised)] text-[var(--text-primary)]',
            'border-[length:var(--input-border-width)] border-[var(--border-strong)]',
            // Placeholder
            'placeholder:text-[var(--text-tertiary)]',
            // Focus — glow ring via outline (not border)
            'focus:outline-none',
            'focus:ring-2 focus:ring-[color:var(--border-focus)] focus:ring-offset-0',
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
