import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Textarea } from '../Textarea';

describe('Textarea', () => {
  it('renders a textbox with its label wired via htmlFor', () => {
    render(<Textarea id="desc" label="Descrição" />);
    expect(screen.getByLabelText('Descrição')).toBe(screen.getByRole('textbox'));
  });

  it('has an accessible name from the label without a consumer id (generated id wires the label)', async () => {
    render(<Textarea label="Descrição" />);
    // Sem id: a casca gera um via useId e o <label htmlFor> aponta pra ele.
    const box = screen.getByRole('textbox', { name: 'Descrição' });
    expect(box).toBeInTheDocument();
    // Clicar no label foca o campo → prova que htmlFor casa com o id do textarea.
    await userEvent.click(screen.getByText('Descrição'));
    expect(box).toHaveFocus();
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

  it('default (no variant) is flat: drops the resting border and fills with surface-sunken', () => {
    render(<Textarea aria-label="Descrição" />);
    const box = screen.getByRole('textbox');
    expect(box).not.toHaveClass('border-input');
    expect(box).toHaveClass('border-[color:var(--input-border-flat)]');
    expect(box).toHaveClass('bg-[var(--surface-sunken)]');
    expect(box).toHaveClass('focus:ring-2');
  });

  it('explicit variant="flat" is a no-op (same as default)', () => {
    render(<Textarea aria-label="Descrição" variant="flat" />);
    const box = screen.getByRole('textbox');
    expect(box).not.toHaveClass('border-input');
    expect(box).toHaveClass('border-[color:var(--input-border-flat)]');
    expect(box).toHaveClass('bg-[var(--surface-sunken)]');
  });

  it('variant="bordered" opts back into the §2.16 border + surface-raised', () => {
    render(<Textarea aria-label="Descrição" variant="bordered" />);
    const box = screen.getByRole('textbox');
    expect(box).toHaveClass('border-input');
    expect(box).toHaveClass('bg-[var(--surface-raised)]');
    expect(box).not.toHaveClass('border-[color:var(--input-border-flat)]');
  });
});
