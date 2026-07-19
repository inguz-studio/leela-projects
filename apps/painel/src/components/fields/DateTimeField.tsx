// =============================================================================
// DateTimeField — adaptador de consumo do DS para os campos data+hora do painel
// (janela de lote/cupom, validade de condição). Governança §8: o CALENDÁRIO
// abre um Popover do DS (nunca o do SO). O DS não tem um datetime picker único,
// então compõe os dois primitivos do DS: `DatePicker` (data) + `Input type=time`
// (hora — spinner nativo, NÃO é o calendário/listbox do SO que a §8 proíbe).
//
// Substitui os `<Input type="datetime-local">` crus (F-01 do GATE-DS-W1)
// preservando a forma do estado: entra e sai a MESMA string nativa
// `yyyy-MM-ddTHH:mm`, wall-clock (SEM fuso) — a janela de lote é interpretada no
// FUSO_EVENTO pinado a jusante, então a UI trata o texto como relógio de parede
// e nunca converte por UTC. Hora só é editável com data escolhida (datetime sem
// data não é representável); sem hora, assume `00:00`.
// =============================================================================

import * as React from 'react';
import { DatePicker, Input } from '@leela/design-system';
import { formatDateValue, parseDateValue } from './DateField';

export interface DateTimeFieldProps {
  /** Rótulo visível acima do campo. */
  label: string;
  /** Valor no formato nativo `yyyy-MM-ddTHH:mm` (string vazia = sem valor). */
  value: string;
  /** Recebe a string `yyyy-MM-ddTHH:mm` (ou `''` ao limpar a data). */
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  errorMessage?: string;
  /** Classe extra do wrapper. */
  wrapperClassName?: string;
}

/** Separa `yyyy-MM-ddTHH:mm` em partes de data e hora (texto puro). */
export function splitDateTimeValue(value: string): { date: string; time: string } {
  const both = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/.exec(value);
  if (both) return { date: both[1] ?? '', time: both[2] ?? '' };
  const dateOnly = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  if (dateOnly) return { date: dateOnly[1] ?? '', time: '' };
  return { date: '', time: '' };
}

export function DateTimeField({
  label,
  value,
  onChange,
  id,
  disabled = false,
  errorMessage,
  wrapperClassName,
}: DateTimeFieldProps): JSX.Element {
  const reactId = React.useId();
  const controlId = id ?? reactId;
  const timeId = `${controlId}-hora`;
  const hasError = Boolean(errorMessage);
  const { date, time } = splitDateTimeValue(value);

  const handleDateChange = (next: Date | undefined): void => {
    const nextDate = formatDateValue(next);
    if (!nextDate) {
      onChange('');
      return;
    }
    onChange(`${nextDate}T${time || '00:00'}`);
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    if (!date) return; // hora sem data não é representável
    const nextTime = event.target.value || '00:00';
    onChange(`${date}T${nextTime}`);
  };

  return (
    <div className={wrapperClassName ?? 'flex flex-col gap-[var(--spacing-1)]'}>
      <label
        htmlFor={controlId}
        className="text-[length:var(--font-size-sm)] font-[var(--font-weight-semibold)] text-[var(--text-primary)]"
      >
        {label}
      </label>
      <div className="flex items-start gap-[var(--spacing-2)]">
        <div className="min-w-0 flex-1">
          <DatePicker
            id={controlId}
            value={parseDateValue(date)}
            onValueChange={handleDateChange}
            disabled={disabled}
            aria-label={`${label} — data`}
          />
        </div>
        <Input
          id={timeId}
          type="time"
          aria-label={`${label} — hora`}
          value={time}
          onChange={handleTimeChange}
          disabled={disabled || !date}
          className="w-auto"
          wrapperClassName="shrink-0"
        />
      </div>
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

DateTimeField.displayName = 'DateTimeField';
