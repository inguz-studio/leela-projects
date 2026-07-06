import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Bell } from 'lucide-react';
import { IconButton } from '../IconButton';

describe('IconButton', () => {
  it('renderiza botão com nome acessível (aria-label obrigatório)', () => {
    render(
      <IconButton aria-label="Notificações">
        <Bell />
      </IconButton>,
    );
    expect(screen.getByRole('button', { name: 'Notificações' })).toBeInTheDocument();
  });

  it('dimensões e radius por token (mockup .icon-btn 36×36 radius sm)', () => {
    render(
      <IconButton aria-label="Ajuda">
        <Bell />
      </IconButton>,
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('w-[var(--iconbtn-size)]');
    expect(btn.className).toContain('h-[var(--iconbtn-size)]');
    expect(btn.className).toContain('rounded-[var(--radius-sm)]');
  });

  it('pip renderiza decorativo (aria-hidden) na cor da marca', () => {
    render(
      <IconButton aria-label="Notificações (não lidas)" pip>
        <Bell />
      </IconButton>,
    );
    const pip = screen.getByTestId('iconbutton-pip');
    expect(pip).toHaveAttribute('aria-hidden');
    expect(pip.className).toContain('bg-[var(--border-brand)]');
  });

  it('sem pip por default', () => {
    render(
      <IconButton aria-label="Notificações">
        <Bell />
      </IconButton>,
    );
    expect(screen.queryByTestId('iconbutton-pip')).not.toBeInTheDocument();
  });

  it('dispara onClick; type="button" por default', async () => {
    const onClick = vi.fn();
    render(
      <IconButton aria-label="Ajuda" onClick={onClick}>
        <Bell />
      </IconButton>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('type', 'button');
    await userEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('disabled aplica opacity-40 e aria-disabled', () => {
    render(
      <IconButton aria-label="Ajuda" disabled>
        <Bell />
      </IconButton>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-disabled', 'true');
    expect(btn.className).toContain('disabled:opacity-40');
  });
});
