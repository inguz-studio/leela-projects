import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Radio, RadioGroup } from '../Radio';

function Grupo(props: { value?: string; onValueChange?: (v: string) => void; disabled?: boolean }) {
  return (
    <RadioGroup name="origem" label="Origem" {...props}>
      <Radio value="organizador" label="Organizador" />
      <Radio value="patrocinador" label="Patrocinador" />
    </RadioGroup>
  );
}

describe('RadioGroup / Radio', () => {
  it('renders a fieldset labelled by its legend with the radios', () => {
    render(<Grupo value="organizador" />);
    expect(screen.getByRole('group', { name: 'Origem' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });

  it('reflects the selected value', () => {
    render(<Grupo value="organizador" />);
    expect(screen.getByRole('radio', { name: 'Organizador' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Patrocinador' })).not.toBeChecked();
  });

  it('fires onValueChange with the chosen value', async () => {
    const onValueChange = vi.fn();
    render(<Grupo value="organizador" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Patrocinador' }));
    expect(onValueChange).toHaveBeenCalledWith('patrocinador');
  });

  it('moves selection with arrow keys (native radio semantics)', async () => {
    const onValueChange = vi.fn();
    render(<Grupo value="organizador" onValueChange={onValueChange} />);
    screen.getByRole('radio', { name: 'Organizador' }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onValueChange).toHaveBeenCalledWith('patrocinador');
  });

  it('disables every radio when the group is disabled', () => {
    render(<Grupo value="organizador" disabled />);
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
  });

  it('marks radios aria-invalid and shows the group error', () => {
    render(
      <RadioGroup name="origem" label="Origem" value="" errorMessage="Escolha uma origem">
        <Radio value="organizador" label="Organizador" />
      </RadioGroup>,
    );
    expect(screen.getByRole('radio', { name: 'Organizador' })).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Escolha uma origem');
  });

  it('throws if a Radio is used outside a RadioGroup', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Radio value="x" label="X" />)).toThrow(/RadioGroup/);
    spy.mockRestore();
  });
});
