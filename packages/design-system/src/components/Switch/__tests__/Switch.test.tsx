import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '../Switch';

describe('Switch', () => {
  it('exposes the switch role (announces on/off, not checked)', () => {
    render(<Switch aria-label="Inscrições abertas" />);
    expect(screen.getByRole('switch', { name: 'Inscrições abertas' })).toBeInTheDocument();
  });

  it('reflects the on state', () => {
    render(<Switch aria-label="Público" checked readOnly />);
    expect(screen.getByRole('switch')).toBeChecked();
  });

  it('fires onCheckedChange with the new state on toggle', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Público" checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole('switch'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('toggles with the keyboard (Space)', async () => {
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Público" checked={false} onCheckedChange={onCheckedChange} />);
    await userEvent.tab();
    expect(screen.getByRole('switch')).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('wires the visible label and description via aria', () => {
    render(<Switch id="pub" label="Evento público" description="Aparece na busca" checked readOnly />);
    const sw = screen.getByRole('switch', { name: 'Evento público' });
    expect(sw).toHaveAttribute('aria-describedby', 'pub-desc');
    expect(screen.getByText('Aparece na busca')).toHaveAttribute('id', 'pub-desc');
  });

  it('is disabled when disabled prop is set', () => {
    render(<Switch aria-label="Público" disabled />);
    expect(screen.getByRole('switch')).toBeDisabled();
  });
});
