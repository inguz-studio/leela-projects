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

  // ── aria-describedby estável (bug do showroom: s/ id) ───────────────────
  it('associates the error via aria-describedby even WITHOUT an explicit id', () => {
    render(<Input aria-label="Email" errorMessage="Inválido" />);
    const input = screen.getByRole('textbox');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(screen.getByRole('alert')).toHaveAttribute('id', describedBy as string);
  });

  it('preserves a caller aria-describedby and APPENDS the error id', () => {
    render(
      <Input id="cpf" aria-label="CPF" aria-describedby="cpf-hint" errorMessage="Inválido" />,
    );
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'cpf-hint cpf-error');
  });

  it('keeps only the caller aria-describedby when there is no error', () => {
    render(<Input aria-label="CPF" aria-describedby="cpf-hint" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'cpf-hint');
  });

  // ── Flat por DEFAULT (LEELA-FLAT-DEFAULT) ───────────────────────────────
  it('default (no variant) is flat: drops the resting border and fills with surface-sunken', () => {
    render(<Input aria-label="Nome" />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveClass('border-input');
    expect(input).toHaveClass('border-[color:var(--input-border-flat)]');
    expect(input).toHaveClass('bg-[var(--surface-sunken)]');
  });

  it('explicit variant="flat" is a no-op (same as default)', () => {
    render(<Input aria-label="Nome" variant="flat" />);
    const input = screen.getByRole('textbox');
    expect(input).not.toHaveClass('border-input');
    expect(input).toHaveClass('border-[color:var(--input-border-flat)]');
    expect(input).toHaveClass('bg-[var(--surface-sunken)]');
  });

  it('variant="bordered" opts back into the §2.16 border + surface-raised', () => {
    render(<Input aria-label="Nome" variant="bordered" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-input');
    expect(input).toHaveClass('bg-[var(--surface-raised)]');
    expect(input).not.toHaveClass('border-[color:var(--input-border-flat)]');
  });

  it('flat default preserves the focus ring (a11y não regride)', () => {
    render(<Input aria-label="Nome" />);
    expect(screen.getByRole('textbox')).toHaveClass('focus:ring-2');
  });

  it('flat default reignites the danger border on error (erro não depende só do fill)', () => {
    render(<Input aria-label="Nome" errorMessage="Obrigatório" />);
    expect(screen.getByRole('textbox')).toHaveClass('border-[var(--border-danger)]');
  });

  // ── hint: a régua permanente do campo (PARSE-1) ─────────────────────────
  describe('hint', () => {
    it('não existe no DOM quando não é passado (o campo de sempre não muda)', () => {
      render(<Input id="n" aria-label="Nome" />);
      expect(document.getElementById('n-hint')).toBeNull();
      expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby');
    });

    it('aparece embaixo do campo e é anunciado por aria-describedby', () => {
      render(<Input id="preco" aria-label="Preço" hint="O ponto separa o milhar." />);
      const dica = document.getElementById('preco-hint');
      expect(dica).toHaveTextContent('O ponto separa o milhar.');
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'preco-hint');
    });

    it('convive com o erro: a régua fica, o erro entra depois dela', () => {
      render(
        <Input id="preco" aria-label="Preço" hint="A régua." errorMessage="Valor inválido." />,
      );
      const campo = screen.getByRole('textbox');
      expect(campo).toHaveAttribute('aria-describedby', 'preco-hint preco-error');
      expect(campo).toHaveAttribute('aria-invalid', 'true');
      // A ordem no DOM importa: a dica não se move quando a recusa aparece.
      const dica = document.getElementById('preco-hint')!;
      const erro = document.getElementById('preco-error')!;
      expect(dica.compareDocumentPosition(erro) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('preserva o aria-describedby que o consumidor já tinha', () => {
      render(
        <>
          <span id="externo">dica de fora</span>
          <Input id="preco" aria-label="Preço" aria-describedby="externo" hint="A régua." />
        </>,
      );
      expect(screen.getByRole('textbox')).toHaveAttribute(
        'aria-describedby',
        'externo preco-hint',
      );
    });

    it('a cor sai de token, nunca de valor cravado (AA por estado)', () => {
      render(<Input id="preco" aria-label="Preço" hint="A régua." />);
      expect(document.getElementById('preco-hint')).toHaveClass('text-[var(--text-tertiary)]');
    });
  });
});
