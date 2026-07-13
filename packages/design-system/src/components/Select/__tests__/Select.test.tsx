import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '../Select';

const options = [
  { value: '', label: 'Todos' },
  { value: 'kit_ouro', label: 'Kit Ouro' },
  { value: 'kit_prata', label: 'Kit Prata' },
];

describe('Select', () => {
  it('renders a combobox (native select) with its options', () => {
    render(<Select aria-label="Kit" options={options} />);
    const select = screen.getByRole('combobox', { name: 'Kit' });
    expect(select).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Kit Ouro' })).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('renders with a visible label wired to the field', () => {
    render(<Select id="kit" label="Kit" options={options} />);
    expect(screen.getByLabelText('Kit')).toBeInTheDocument();
  });

  it('fires onChange with the chosen value when an option is selected', async () => {
    const onChange = vi.fn();
    render(<Select aria-label="Kit" options={options} defaultValue="" onChange={onChange} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    await userEvent.selectOptions(select, 'kit_prata');
    expect(onChange).toHaveBeenCalled();
    expect(select.value).toBe('kit_prata');
  });

  it('is disabled when disabled prop is set', () => {
    render(<Select aria-label="Kit" options={options} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('receives focus', async () => {
    render(<Select aria-label="Kit" options={options} />);
    await userEvent.tab();
    expect(screen.getByRole('combobox')).toHaveFocus();
  });

  it('flat variant drops the resting border and fills with surface-sunken', () => {
    render(<Select aria-label="Kit" options={options} variant="flat" />);
    const select = screen.getByRole('combobox');
    expect(select).not.toHaveClass('border-input');
    expect(select).toHaveClass('border-transparent');
    expect(select).toHaveClass('bg-[var(--surface-sunken)]');
    expect(select).toHaveClass('focus:ring-2');
  });
});
