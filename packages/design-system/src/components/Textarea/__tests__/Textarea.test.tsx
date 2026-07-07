import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from '../Textarea';

describe('Textarea', () => {
  it('renders a textbox with its label wired via htmlFor', () => {
    render(<Textarea id="desc" label="Descrição" />);
    expect(screen.getByLabelText('Descrição')).toBe(screen.getByRole('textbox'));
  });

  it('types multi-line text and fires onChange', async () => {
    const onChange = vi.fn();
    render(<Textarea aria-label="Descrição" onChange={onChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'linha');
    expect(onChange).toHaveBeenCalled();
  });

  it('sets aria-invalid and shows the error with role=alert', () => {
    render(<Textarea id="desc" label="Descrição" errorMessage="Campo obrigatório" />);
    const box = screen.getByRole('textbox');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAttribute('aria-describedby', 'desc-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Campo obrigatório');
  });

  it('is disabled when disabled prop is set', () => {
    render(<Textarea aria-label="Descrição" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('receives focus by keyboard', async () => {
    render(<Textarea aria-label="Descrição" />);
    await userEvent.tab();
    expect(screen.getByRole('textbox')).toHaveFocus();
  });
});
