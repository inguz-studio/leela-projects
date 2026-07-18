/**
 * Calendar / DatePicker / DateRangePicker (S-R9-05) — date picker shadcn do DS.
 * Cobre o contrato: grade acessível do react-day-picker, abertura do painel DO DS
 * (Popover, não a caixa do SO), seleção que resume no trigger e fecha, e o rótulo
 * de intervalo. A a11y de teclado/ARIA da grade é do react-day-picker (não retestada).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Calendar, DatePicker, DateRangePicker } from '../index';

const MARCO_2025 = new Date(2025, 2, 10); // 10/03/2025

describe('Calendar', () => {
  it('renderiza a grade acessível com cabeçalho de mês', () => {
    render(<Calendar mode="single" defaultMonth={MARCO_2025} />);
    expect(screen.getByRole('grid')).toBeInTheDocument();
    // caption do mês em ptBR (capitalize é só visual).
    expect(screen.getByText(/mar/i)).toBeInTheDocument();
  });

  it('chama onSelect com a data clicada', async () => {
    const onSelect = vi.fn();
    render(<Calendar mode="single" defaultMonth={MARCO_2025} onSelect={onSelect} />);
    const grid = screen.getByRole('grid');
    await userEvent.click(within(grid).getByText('15'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    const arg = onSelect.mock.calls[0]![0] as Date;
    expect(arg.getDate()).toBe(15);
    expect(arg.getMonth()).toBe(2);
  });
});

describe('DatePicker (single)', () => {
  it('mostra o placeholder quando vazio e não abre o painel de início', () => {
    render(<DatePicker onValueChange={vi.fn()} placeholder="Selecione a data" aria-label="Data" />);
    expect(screen.getByRole('button', { name: 'Data' })).toHaveTextContent('Selecione a data');
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('abre o painel DO DS (Popover) ao clicar no trigger', async () => {
    render(<DatePicker onValueChange={vi.fn()} aria-label="Data" />);
    await userEvent.click(screen.getByRole('button', { name: 'Data' }));
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('resume a data selecionada no trigger (dd/MM/yyyy)', () => {
    render(<DatePicker value={new Date(2025, 2, 15)} onValueChange={vi.fn()} aria-label="Data" />);
    expect(screen.getByRole('button', { name: 'Data' })).toHaveTextContent('15/03/2025');
  });
});

describe('DateRangePicker (range)', () => {
  it('mostra o placeholder quando vazio', () => {
    render(<DateRangePicker onValueChange={vi.fn()} placeholder="Selecione o intervalo" aria-label="Intervalo" />);
    expect(screen.getByRole('button', { name: 'Intervalo' })).toHaveTextContent('Selecione o intervalo');
  });

  it('resume o intervalo from–to no trigger', () => {
    render(
      <DateRangePicker
        value={{ from: new Date(2025, 2, 1), to: new Date(2025, 2, 10) }}
        onValueChange={vi.fn()}
        aria-label="Intervalo"
      />,
    );
    expect(screen.getByRole('button', { name: 'Intervalo' })).toHaveTextContent('01/03/2025 – 10/03/2025');
  });
});
