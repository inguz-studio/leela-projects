import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '../Checkbox';

describe('Checkbox', () => {
  it('renders a checkbox input', () => {
    render(<Checkbox aria-label="Selecionar" />);
    expect(screen.getByRole('checkbox', { name: 'Selecionar' })).toBeInTheDocument();
  });

  it('fires onChange when toggled', async () => {
    const onChange = vi.fn();
    render(<Checkbox aria-label="Selecionar" checked={false} onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalled();
  });

  it('reflects the checked state', () => {
    render(<Checkbox aria-label="Selecionar" checked readOnly />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('applies the indeterminate DOM property via ref', () => {
    render(<Checkbox aria-label="Selecionar todos" indeterminate checked={false} readOnly />);
    const box = screen.getByRole('checkbox') as HTMLInputElement;
    expect(box.indeterminate).toBe(true);
  });

  it('is disabled when disabled prop is set', () => {
    render(<Checkbox aria-label="Selecionar" disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('receives focus by keyboard', async () => {
    render(<Checkbox aria-label="Selecionar" />);
    await userEvent.tab();
    expect(screen.getByRole('checkbox')).toHaveFocus();
  });
});
