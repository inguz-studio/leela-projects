import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  // ── Render por variante ─────────────────────────────────────────────────
  it('renders primary variant by default', () => {
    render(<Button>Salvar</Button>);
    const btn = screen.getByRole('button', { name: 'Salvar' });
    expect(btn).toBeInTheDocument();
  });

  it('renders secondary variant', () => {
    render(<Button variant="secondary">Cancelar</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders ghost variant', () => {
    render(<Button variant="ghost">Mais</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders destructive variant', () => {
    render(<Button variant="destructive">Deletar</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  // ── Tamanhos ────────────────────────────────────────────────────────────
  it('renders sm size', () => {
    render(<Button size="sm">Pequeno</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('renders lg size', () => {
    render(<Button size="lg">Grande</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  // ── type="button" padrão ────────────────────────────────────────────────
  it('has type="button" by default to avoid accidental form submit', () => {
    render(<Button>OK</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('accepts type="submit" override', () => {
    render(<Button type="submit">Enviar</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  // ── Disabled ────────────────────────────────────────────────────────────
  it('renders as disabled when disabled prop is set', () => {
    render(<Button disabled>Desabilitado</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-disabled', 'true');
  });

  it('does not trigger onClick when disabled', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Desabilitado
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  // ── Ação de clique ──────────────────────────────────────────────────────
  it('calls onClick when clicked', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Clique</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  // ── Navegação por teclado / foco ────────────────────────────────────────
  it('receives focus via keyboard Tab', async () => {
    render(<Button>Focável</Button>);
    const btn = screen.getByRole('button');
    await userEvent.tab();
    expect(btn).toHaveFocus();
  });

  it('activates via Enter key when focused', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Enter</Button>);
    screen.getByRole('button').focus();
    await userEvent.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('activates via Space key when focused', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Espaço</Button>);
    screen.getByRole('button').focus();
    await userEvent.keyboard(' ');
    expect(onClick).toHaveBeenCalledOnce();
  });

  // ── asChild ─────────────────────────────────────────────────────────────
  it('renders child element via asChild (Slot)', () => {
    render(
      <Button asChild>
        <a href="/destino">Link</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Link' });
    expect(link).toBeInTheDocument();
  });

  // ── Classe customizada ──────────────────────────────────────────────────
  it('accepts custom className', () => {
    render(<Button className="test-custom-class">OK</Button>);
    expect(screen.getByRole('button')).toHaveClass('test-custom-class');
  });
});
