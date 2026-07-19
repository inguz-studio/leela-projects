// =============================================================================
// DateField — adaptador de consumo do `DatePicker` do DS para os formulários do
// painel (governança §8: calendário abre um Popover do DS, nunca o do SO).
//
// Substitui os `<Input type="date">` crus (F-01 do GATE-DS-W1) preservando a
// forma do estado existente: o valor entra e sai como a MESMA string nativa
// `yyyy-MM-dd`, então os reducers/handlers das telas não mudam — só a casca
// visual passa a ser o painel do DS. A conversão string↔Date é wall-clock
// (sem fuso): monta e lê o Date por componentes locais, nunca por UTC, para não
// deslocar a data em fusos a oeste/leste.
// =============================================================================

import * as React from 'react';
import { DatePicker } from '@leela/design-system';

export interface DateFieldProps {
  /** Rótulo visível acima do campo. */
  label: string;
  /** Valor no formato nativo `yyyy-MM-dd` (string vazia = sem data). */
  value: string;
  /** Recebe a string `yyyy-MM-dd` (ou `''` ao limpar). */
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  placeholder?: string;
  errorMessage?: string;
  /** Classe extra do wrapper. */
  wrapperClassName?: string;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** `yyyy-MM-dd` → Date (wall-clock local, sem fuso). */
export function parseDateValue(value: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Date → `yyyy-MM-dd` (wall-clock local, sem fuso). */
export function formatDateValue(date: Date | undefined): string {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function DateField({
  label,
  value,
  onChange,
  id,
  disabled = false,
  placeholder,
  errorMessage,
  wrapperClassName,
}: DateFieldProps): JSX.Element {
  const reactId = React.useId();
  const controlId = id ?? reactId;
  const hasError = Boolean(errorMessage);

  return (
    <div
      className={
        wrapperClassName ??
        'flex flex-col gap-[var(--spacing-1)]'
      }
    >
      <label
        htmlFor={controlId}
        className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]"
      >
        {label}
      </label>
      <DatePicker
        id={controlId}
        value={parseDateValue(value)}
        onValueChange={(date) => onChange(formatDateValue(date))}
        disabled={disabled}
        aria-label={label}
        {...(placeholder ? { placeholder } : {})}
      />
      {hasError ? (
        <span
          role="alert"
          className="text-[length:var(--font-size-sm)] text-[var(--feedback-danger-fg)]"
        >
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
}

DateField.displayName = 'DateField';
