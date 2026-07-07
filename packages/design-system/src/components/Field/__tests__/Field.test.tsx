import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Field } from '../Field';

describe('Field', () => {
  it('wires label to the control via a generated id', () => {
    render(
      <Field label="Categoria">
        <input />
      </Field>,
    );
    expect(screen.getByLabelText('Categoria').tagName).toBe('INPUT');
  });

  it('preserves an id the child already declares', () => {
    render(
      <Field label="Categoria">
        <input id="cat" />
      </Field>,
    );
    expect(screen.getByLabelText('Categoria')).toHaveAttribute('id', 'cat');
  });

  it('links description and error via aria-describedby', () => {
    render(
      <Field label="Categoria" htmlFor="cat" description="Livre" errorMessage="Obrigatório">
        <input />
      </Field>,
    );
    const control = screen.getByLabelText('Categoria');
    expect(control).toHaveAttribute('aria-invalid', 'true');
    expect(control).toHaveAttribute('aria-describedby', 'cat-desc cat-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Obrigatório');
  });

  it('applies required to the control and shows the marker', () => {
    render(
      <Field label="Nome" htmlFor="nome" required>
        <input />
      </Field>,
    );
    expect(screen.getByLabelText(/Nome/)).toBeRequired();
  });

  it('propagates disabled to the control', () => {
    render(
      <Field label="Nome" htmlFor="nome" disabled>
        <input />
      </Field>,
    );
    expect(screen.getByLabelText('Nome')).toBeDisabled();
  });

  it('keeps a describedby the child already had', () => {
    render(
      <Field label="Nome" htmlFor="nome" errorMessage="Erro">
        <input aria-describedby="hint" />
      </Field>,
    );
    expect(screen.getByLabelText('Nome')).toHaveAttribute('aria-describedby', 'hint nome-error');
  });
});
