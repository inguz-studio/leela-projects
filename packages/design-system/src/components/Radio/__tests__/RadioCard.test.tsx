import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioCard, RadioGroup } from '../Radio';

function Grupo(props: { value?: string; onValueChange?: (v: string) => void; disabled?: boolean }) {
  return (
    <RadioGroup name="modelo" label="Modelo" {...props}>
      <RadioCard value="A" title="Meta por ação" description="Cada ação tem sua meta." />
      <RadioCard
        value="C"
        title="Equilíbrio mínimo"
        description="Meta total + mínimo por pilar."
        aria-label="Modelo C · Equilíbrio mínimo"
      >
        <span>Sub-seletor revelado</span>
      </RadioCard>
    </RadioGroup>
  );
}

describe('RadioCard', () => {
  it('renders rich radio-cards inside the group (native radio semantics)', () => {
    render(<Grupo value="A" />);
    expect(screen.getByRole('group', { name: 'Modelo' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: 'Meta por ação' })).toBeChecked();
  });

  it('honours aria-label as the accessible name (description stays out of the name)', () => {
    render(<Grupo value="A" />);
    expect(screen.getByRole('radio', { name: 'Modelo C · Equilíbrio mínimo' })).toBeInTheDocument();
  });

  it('links the description via aria-describedby', () => {
    render(<Grupo value="A" />);
    const radio = screen.getByRole('radio', { name: 'Meta por ação' });
    const describedBy = radio.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent('Cada ação tem sua meta.');
  });

  it('fires onValueChange with the chosen value', async () => {
    const onValueChange = vi.fn();
    render(<Grupo value="A" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Modelo C · Equilíbrio mínimo' }));
    expect(onValueChange).toHaveBeenCalledWith('C');
  });

  it('reveals children only when the card is selected', () => {
    const { rerender } = render(<Grupo value="A" />);
    expect(screen.queryByText('Sub-seletor revelado')).not.toBeInTheDocument();
    rerender(<Grupo value="C" />);
    expect(screen.getByText('Sub-seletor revelado')).toBeInTheDocument();
  });

  it('moves selection with arrow keys (native radio semantics)', async () => {
    const onValueChange = vi.fn();
    render(<Grupo value="A" onValueChange={onValueChange} />);
    screen.getByRole('radio', { name: 'Meta por ação' }).focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(onValueChange).toHaveBeenCalledWith('C');
  });

  it('disables every card when the group is disabled', () => {
    render(<Grupo value="A" disabled />);
    for (const radio of screen.getAllByRole('radio')) expect(radio).toBeDisabled();
  });

  it('throws if used outside a RadioGroup', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<RadioCard value="x" title="X" />)).toThrow(/RadioGroup/);
    spy.mockRestore();
  });
});
