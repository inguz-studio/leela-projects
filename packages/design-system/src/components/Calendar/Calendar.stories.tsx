import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Calendar, DatePicker, DateRangePicker } from './index';
import type { DateRange } from './index';

/**
 * `Calendar` / `DatePicker` / `DateRangePicker` (S-R9-05 · governança §8) — data
 * shadcn do DS sobre `react-day-picker` (v9), vestida com tokens semantic. Abre um
 * painel DO DS (Popover), nunca o date-picker do sistema operacional. Confira os
 * dois temas pelo toggle da toolbar do Storybook.
 */
const meta: Meta<typeof Calendar> = {
  title: 'Primitivos/Calendar',
  component: Calendar,
};

export default meta;
type Story = StoryObj<typeof Calendar>;

function CalendarDemo(): React.JSX.Element {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  return <Calendar mode="single" selected={date} onSelect={setDate} />;
}

function DatePickerDemo(): React.JSX.Element {
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  return (
    <div className="max-w-xs">
      <DatePicker value={date} onValueChange={setDate} aria-label="Data" placeholder="Selecione a data" />
    </div>
  );
}

function DateRangePickerDemo(): React.JSX.Element {
  const [range, setRange] = React.useState<DateRange | undefined>(undefined);
  return (
    <div className="max-w-xs">
      <DateRangePicker value={range} onValueChange={setRange} aria-label="Intervalo" placeholder="Selecione o intervalo" />
    </div>
  );
}

/** Grade nua (single). */
export const Grade: Story = { render: () => <CalendarDemo /> };

/** DatePicker: campo flat que abre o calendário do DS. */
export const Data: Story = { render: () => <DatePickerDemo /> };

/** DateRangePicker: intervalo from–to num único painel. */
export const Intervalo: Story = { render: () => <DateRangePickerDemo /> };
