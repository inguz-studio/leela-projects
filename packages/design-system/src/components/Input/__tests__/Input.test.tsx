import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input', () => {
  // ── Render padrão ───────────────────────────────────────────────────────
  it('renders an input element', () => {
    render(<Input aria-label="Nome" />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input id="nome" label="Nome completo" />);
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument();
  });

  // ── Estado default / hover / focus (interação) ──────────────────────────
  it('accepts text input', async () => {
    render(<Input aria-label="Email" defaultValue="" />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'test@leela.io');
    expect(input).toHaveValue('test@leela.io');
  });

  it('receives focus', async () => {
    render(<Input aria-label="Busca" />);
    const input = screen.getByRole('textbox');
    await userEvent.click(input);
    expect(input).toHaveFocus();
  });

  // ── Estado inválido ─────────────────────────────────────────────────────
  it('shows error message when errorMessage is provided', () => {
    render(
      <Input
        id="email"
        aria-label="Email"
        errorMessage="Email inválido"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Email inválido');
  });

  it('sets aria-invalid when errorMessage is provided', () => {
    render(
      <Input
        id="email"
        aria-label="Email"
        errorMessage="Obrigatório"
      />,
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sets aria-describedby pointing to error element', () => {
    render(
      <Input
        id="cpf"
        aria-label="CPF"
        errorMessage="CPF inválido"
      />,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby', 'cpf-error');
    expect(screen.getByRole('alert')).toHaveAttribute('id', 'cpf-error');
  });

  it('does NOT render alert when errorMessage is absent', () => {
    render(<Input aria-label="Nome" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  // ── Estado disabled ─────────────────────────────────────────────────────
  it('is disabled when disabled prop is set', () => {
    render(<Input aria-label="Bloqueado" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  // ── Custom className ────────────────────────────────────────────────────
  it('accepts custom className', () => {
    render(<Input aria-label="X" className="test-custom" />);
    expect(screen.getByRole('textbox')).toHaveClass('test-custom');
  });
});
