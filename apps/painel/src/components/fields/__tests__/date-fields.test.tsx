import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DateField, formatDateValue, parseDateValue } from '../DateField';
import { DateTimeField, splitDateTimeValue } from '../DateTimeField';

// Estes adaptadores substituem os `<Input type="date|datetime-local">` crus do
// painel (F-01 do GATE-DS-W1) reusando o DatePicker do DS. O contrato que os 10
// call-sites dependem: a string nativa entra e sai igual, wall-clock, sem fuso.
// A a11y/teclado da grade é do react-day-picker (coberta na suíte do DS) — aqui
// testamos o adaptador: conversão de valor, abertura do painel DO DS e a hora.

describe('conversão wall-clock (sem fuso)', () => {
  it('parse/format de yyyy-MM-dd faz round-trip sem deslocar a data', () => {
    const d = parseDateValue('2026-03-15');
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(2); // março = 2
    expect(d?.getDate()).toBe(15);
    expect(formatDateValue(d)).toBe('2026-03-15');
  });

  it('parseDateValue devolve undefined para string vazia/inválida', () => {
    expect(parseDateValue('')).toBeUndefined();
    expect(parseDateValue('xx')).toBeUndefined();
    expect(formatDateValue(undefined)).toBe('');
  });

  it('splitDateTimeValue separa data e hora, tolera valor parcial/vazio', () => {
    expect(splitDateTimeValue('2026-03-15T09:30')).toEqual({ date: '2026-03-15', time: '09:30' });
    expect(splitDateTimeValue('2026-03-15')).toEqual({ date: '2026-03-15', time: '' });
    expect(splitDateTimeValue('')).toEqual({ date: '', time: '' });
  });
});

describe('DateField', () => {
  it('renderiza o rótulo e abre o calendário do DS (não o do SO)', async () => {
    render(<DateField label="Data da prova" value="" onChange={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: 'Data da prova' });
    expect(trigger).toBeInTheDocument();
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
    await userEvent.click(trigger);
    // grid do react-day-picker = painel do DS ancorado em Popover (§8)
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('resume a data do valor no trigger (dd/MM/yyyy)', () => {
    render(<DateField label="Início" value="2026-03-20" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Início' })).toHaveTextContent('20/03/2026');
  });
});

describe('DateTimeField', () => {
  it('a hora fica desabilitada sem data e habilita quando há data', () => {
    const { rerender } = render(
      <DateTimeField label="Início da venda" value="" onChange={vi.fn()} />,
    );
    expect(screen.getByLabelText('Início da venda — hora')).toBeDisabled();
    rerender(<DateTimeField label="Início da venda" value="2026-03-10T08:00" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Início da venda — hora')).not.toBeDisabled();
  });

  it('separa data (trigger do DS) e hora do valor nativo', () => {
    render(<DateTimeField label="Validade" value="2026-03-10T14:30" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Validade — data' })).toHaveTextContent('10/03/2026');
    expect(screen.getByLabelText('Validade — hora')).toHaveValue('14:30');
  });

  it('preserva a data ao trocar a hora', async () => {
    const onChange = vi.fn();
    render(<DateTimeField label="Validade" value="2026-03-10T14:30" onChange={onChange} />);
    const hora = screen.getByLabelText('Validade — hora');
    fireEvent.change(hora, { target: { value: '09:15' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-03-10T09:15');
  });
});
