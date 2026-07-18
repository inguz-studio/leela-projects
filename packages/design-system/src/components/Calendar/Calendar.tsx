/**
 * Calendar / DatePicker / DateRangePicker — seleção de data shadcn (S-R9-05 · governança §8).
 *
 * `Calendar` é o `DayPicker` do `react-day-picker` (v9) vestido com os tokens do
 * DS: nunca a caixa do sistema operacional. Fornece a grade acessível (role=grid,
 * navegação por teclado e ARIA do próprio react-day-picker — não reinventada).
 *
 * `DatePicker` (single) e `DateRangePicker` (range) montam o `Calendar` dentro do
 * `Popover` do DS — o mesmo primitivo de âncora que o `Combobox` usa —, com um
 * trigger na anatomia do campo flat (fill sunken + `--input-border-flat`, ícone de
 * calendário) que resume a seleção. É o date-picker que a Análise (S-R9-01) e todo
 * filtro temporal do painel consomem.
 *
 * A11y: react-day-picker entrega a grade WAI-APG (teclado/ARIA); o trigger é
 * button com focus ring de 2px; o painel é o Popover (foco gerido, Esc/click-fora).
 */

import * as React from 'react';
import { DayPicker, getDefaultClassNames, type DateRange } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Popover, PopoverTrigger, PopoverContent } from '../Popover';

export type { DateRange };

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Grade de datas do DS. Envolve o DayPicker (v9) — `getDefaultClassNames()` dá a
 * estrutura, os overrides abaixo trocam a pele por tokens semantic do DS. Sem CSS
 * de terceiros: só utilitários do preset + tokens.
 */
export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps): JSX.Element {
  const base = getDefaultClassNames();
  return (
    <DayPicker
      locale={ptBR}
      showOutsideDays={showOutsideDays}
      className={cn('p-[var(--spacing-3)] text-[var(--text-primary)]', className)}
      classNames={{
        ...base,
        months: cn(base.months, 'relative flex flex-col gap-[var(--spacing-4)]'),
        month: cn(base.month, 'flex flex-col gap-[var(--spacing-3)]'),
        month_caption: cn(base.month_caption, 'flex h-[var(--spacing-8)] items-center justify-center'),
        caption_label: cn(
          base.caption_label,
          'text-[length:var(--font-size-base)] font-[var(--font-weight-semibold)] capitalize',
        ),
        nav: cn(base.nav, 'absolute inset-x-0 top-0 flex items-center justify-between'),
        button_previous: cn(
          base.button_previous,
          'inline-flex h-[var(--spacing-8)] w-[var(--spacing-8)] items-center justify-center rounded-[var(--radius-sm)]',
          'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
          'disabled:opacity-40 disabled:pointer-events-none',
        ),
        button_next: cn(
          base.button_next,
          'inline-flex h-[var(--spacing-8)] w-[var(--spacing-8)] items-center justify-center rounded-[var(--radius-sm)]',
          'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
          'disabled:opacity-40 disabled:pointer-events-none',
        ),
        month_grid: cn(base.month_grid, 'w-full border-collapse'),
        weekdays: cn(base.weekdays, 'flex'),
        weekday: cn(
          base.weekday,
          'w-[var(--spacing-8)] text-[length:var(--font-size-sm)] font-[var(--font-weight-regular)] text-[var(--text-tertiary)]',
        ),
        week: cn(base.week, 'mt-[var(--spacing-1)] flex w-full'),
        day: cn(
          base.day,
          'h-[var(--spacing-8)] w-[var(--spacing-8)] p-0 text-center',
          // Extremos do range: cantos e fundo contínuo.
          '[&.rdp-range_middle]:bg-[var(--surface-raised)]',
        ),
        day_button: cn(
          base.day_button,
          'inline-flex h-[var(--spacing-8)] w-[var(--spacing-8)] items-center justify-center rounded-[var(--radius-sm)]',
          'text-[length:var(--font-size-base)] text-[var(--text-primary)]',
          'hover:bg-[var(--surface-raised)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--border-focus)]',
          'disabled:opacity-40 disabled:pointer-events-none',
        ),
        selected: cn(
          base.selected,
          '[&_button]:bg-[var(--action-primary)] [&_button]:text-[var(--action-primary-fg)]',
          '[&_button:hover]:bg-[var(--action-primary-hover)]',
        ),
        today: cn(base.today, '[&_button]:font-[var(--font-weight-semibold)] [&_button]:text-[var(--text-brand)]'),
        outside: cn(base.outside, '[&_button]:text-[var(--text-tertiary)] [&_button]:opacity-50'),
        disabled: cn(base.disabled, 'opacity-40'),
        range_start: cn(base.range_start, '[&_button]:bg-[var(--action-primary)] [&_button]:text-[var(--action-primary-fg)]'),
        range_end: cn(base.range_end, '[&_button]:bg-[var(--action-primary)] [&_button]:text-[var(--action-primary-fg)]'),
        range_middle: cn(
          base.range_middle,
          'bg-[var(--surface-raised)] [&_button]:bg-transparent [&_button]:text-[var(--text-primary)] [&_button:hover]:bg-transparent',
        ),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === 'left' ? (
            <ChevronLeft aria-hidden className="h-[var(--spacing-4)] w-[var(--spacing-4)]" {...rest} />
          ) : (
            <ChevronRight aria-hidden className="h-[var(--spacing-4)] w-[var(--spacing-4)]" {...rest} />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

// ---------------------------------------------------------------------------
// Trigger compartilhado (anatomia do campo flat, igual ao Combobox)
// ---------------------------------------------------------------------------

interface DateTriggerProps {
  id?: string;
  disabled?: boolean;
  'aria-label'?: string;
  hasValue: boolean;
  label: string;
  className?: string;
}

function DateTrigger({ id, disabled, 'aria-label': ariaLabel, hasValue, label, className }: DateTriggerProps): JSX.Element {
  return (
    <PopoverTrigger
      id={id}
      type="button"
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'flex w-full items-center justify-between gap-[var(--spacing-2)]',
        'h-[var(--input-height)] px-[var(--input-px)] rounded-[var(--input-radius)]',
        'text-[length:var(--input-font-size)] text-left',
        'bg-[var(--surface-sunken)]',
        'border-[length:var(--input-border-width)] border-[color:var(--input-border-flat)]',
        hasValue ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-40',
        'transition-[border-color,box-shadow] duration-[var(--motion-duration-fast)]',
        className,
      )}
    >
      <span className="truncate">{label}</span>
      <CalendarIcon aria-hidden className="h-[var(--spacing-4)] w-[var(--spacing-4)] shrink-0 text-[var(--text-tertiary)]" />
    </PopoverTrigger>
  );
}

// ---------------------------------------------------------------------------
// DatePicker (single)
// ---------------------------------------------------------------------------

export interface DatePickerProps {
  value?: Date | undefined;
  onValueChange: (date: Date | undefined) => void;
  placeholder?: string;
  /** Formato date-fns do rótulo do trigger. Default: `dd/MM/yyyy`. */
  displayFormat?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

export function DatePicker({
  value,
  onValueChange,
  placeholder = 'Selecione a data',
  displayFormat = 'dd/MM/yyyy',
  disabled = false,
  id,
  'aria-label': ariaLabel,
  className,
}: DatePickerProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const label = value ? format(value, displayFormat, { locale: ptBR }) : placeholder;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <DateTrigger
        {...(id ? { id } : {})}
        disabled={disabled}
        {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
        hasValue={value !== undefined}
        label={label}
        {...(className ? { className } : {})}
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(date) => {
            onValueChange(date);
            if (date) setOpen(false);
          }}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
DatePicker.displayName = 'DatePicker';

// ---------------------------------------------------------------------------
// DateRangePicker (range)
// ---------------------------------------------------------------------------

export interface DateRangePickerProps {
  value?: DateRange | undefined;
  onValueChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  displayFormat?: string;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
  className?: string;
}

export function DateRangePicker({
  value,
  onValueChange,
  placeholder = 'Selecione o intervalo',
  displayFormat = 'dd/MM/yyyy',
  disabled = false,
  id,
  'aria-label': ariaLabel,
  className,
}: DateRangePickerProps): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const label = value?.from
    ? value.to
      ? `${format(value.from, displayFormat, { locale: ptBR })} – ${format(value.to, displayFormat, { locale: ptBR })}`
      : format(value.from, displayFormat, { locale: ptBR })
    : placeholder;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <DateTrigger
        {...(id ? { id } : {})}
        disabled={disabled}
        {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
        hasValue={value?.from !== undefined}
        label={label}
        {...(className ? { className } : {})}
      />
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={value} onSelect={(range) => onValueChange(range)} autoFocus />
      </PopoverContent>
    </Popover>
  );
}
DateRangePicker.displayName = 'DateRangePicker';
