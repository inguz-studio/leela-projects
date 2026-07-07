// =============================================================================
// Field — casca de campo: label + descrição + mensagem de erro + estados
// required/invalid/disabled, com o aria correto ligado automaticamente. Os
// forms repetiam à mão o bloco `<label><span>…</span><input/><span erro/></label>`
// (NovoClubePage 6×, ConfiguracoesView, EventoForm) com wiring de aria
// inconsistente. Field é o wrapper reusável p/ QUALQUER controle cru (um
// `<input>`, `<textarea>`, `<select>` nativo) — Input/Select/Textarea já trazem
// a própria casca embutida, então NÃO precisam de Field.
//
// COMO FUNCIONA: recebe um único filho (o controle) e injeta por cloneElement
// `id`, `aria-describedby` (descrição + erro), `aria-invalid` e `required` —
// zero wiring manual, a11y correta de fábrica. Um `id` já posto no filho é
// preservado. A label aponta p/ o id do controle (htmlFor); erro tem role=alert.
//
// NASCE RESPONSIVO (L-004): `w-full`, empilhamento vertical mobile-first, sem
// largura fixa nem overflow em 390px.
// =============================================================================

import * as React from 'react';
import { cn } from '../../utils/cn';

export interface FieldProps {
  /** Label visível acima do controle. */
  label?: React.ReactNode;
  /** Texto de apoio abaixo da label. */
  description?: React.ReactNode;
  /** Mensagem de erro; liga aria-invalid + role=alert. */
  errorMessage?: string;
  /** Marca o campo como obrigatório (asterisco + required no controle). */
  required?: boolean;
  /** Propaga o estado desabilitado ao controle e esmaece a label. */
  disabled?: boolean;
  /** id do controle; se ausente, é gerado e o filho já existente é preservado. */
  htmlFor?: string;
  className?: string;
  /** O controle (um único elemento: input/textarea/select cru ou custom). */
  children: React.ReactElement;
}

/** Propriedades de a11y que Field injeta no controle filho. */
interface InjectedControlProps {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  required?: boolean;
  disabled?: boolean;
}

function Field({
  label,
  description,
  errorMessage,
  required = false,
  disabled = false,
  htmlFor,
  className,
  children,
}: FieldProps): JSX.Element {
  const generatedId = React.useId();
  const childProps = children.props as InjectedControlProps;
  const controlId = htmlFor ?? childProps.id ?? generatedId;

  const hasError = Boolean(errorMessage);
  const descId = description ? `${controlId}-desc` : undefined;
  const errorId = hasError ? `${controlId}-error` : undefined;

  // Preserva um aria-describedby que o filho já tenha e soma descrição + erro.
  const existingDescribedBy =
    typeof childProps['aria-describedby'] === 'string' ? childProps['aria-describedby'] : undefined;
  const describedBy =
    [existingDescribedBy, descId, errorId].filter(Boolean).join(' ') || undefined;

  const control = React.cloneElement(children, {
    id: controlId,
    'aria-describedby': describedBy,
    'aria-invalid': hasError ? true : undefined,
    required: required || childProps.required,
    disabled: disabled || childProps.disabled,
  } as InjectedControlProps);

  return (
    <div className={cn('flex w-full flex-col gap-1', className)}>
      {label ? (
        <label
          htmlFor={controlId}
          className={cn(
            'text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)]',
            disabled ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-primary)]',
          )}
        >
          {label}
          {required ? (
            <span aria-hidden="true" className="ml-[var(--spacing-0-5)] text-[var(--text-danger)]">
              *
            </span>
          ) : null}
        </label>
      ) : null}

      {description ? (
        <span id={descId} className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          {description}
        </span>
      ) : null}

      {control}

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
}
Field.displayName = 'Field';

export { Field };
