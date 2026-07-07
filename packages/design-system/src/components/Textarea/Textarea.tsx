// =============================================================================
// Textarea — texto longo multi-linha (descrição de evento/club, comunicado,
// regulamento). Os forms de criar/editar usavam `<textarea>` cru com a mesma
// casca do Input copiada à mão (EventoForm, NovoClubePage, DesafioEditor,
// ComunicadoEditor, ConviteModal, AddPatrocinadorModal, ConfiguracoesView) —
// entra como primitivo reusável com a mesma casca do Input.
//
// ENGINE: `<textarea>` nativo restilizado ao brasa. A11y de teclado/foco/leitor
// de tela de fábrica; a casca (label + mensagem de erro + aria-describedby) é o
// valor da NOSSA API por cima do nativo — idêntica ao Input (§2.16 borda
// permitida: bg raised ≈ bg da página, a borda border-input é o único
// identificador visual e cumpre WCAG 1.4.11 ≥3:1).
//
// NASCE RESPONSIVO (L-004): `w-full` mobile-first, sem largura fixa, sem
// overflow em 390px; a altura cresce por `rows` e `resize-y` (nunca `resize-x`,
// que estouraria o container no mobile).
// =============================================================================

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Mensagem de erro abaixo do campo; também liga aria-invalid. */
  errorMessage?: string;
  /** Label visível acima do campo (sem ele, passe `aria-label`). */
  label?: string;
  /** Classe do wrapper (label + campo). */
  wrapperClassName?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, errorMessage, label, wrapperClassName, id, disabled, rows = 3, ...props }, ref) => {
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

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          disabled={disabled}
          aria-invalid={hasError ? true : undefined}
          aria-describedby={hasError && errorId ? errorId : undefined}
          className={cn(
            // Base layout — largura fluida, altura por rows, cresce só na vertical.
            'block w-full resize-y',
            'min-h-[var(--input-height)] px-[var(--input-px)] py-[var(--spacing-2)]',
            'rounded-[var(--input-radius)]',
            'text-[length:var(--input-font-size)]',
            // Cores & borda (exceção ao flat §2.16, igual ao Input).
            'bg-[var(--surface-raised)] text-[var(--text-primary)]',
            'border-[length:var(--input-border-width)] border-input',
            // Placeholder — alias muted-foreground = text-tertiary
            'placeholder:text-muted-foreground',
            // Foco — glow ring via alias ring (border-focus).
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
Textarea.displayName = 'Textarea';

export { Textarea };
