import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { Drawer } from '../Drawer';

/** Harness controlado — as vias de fechamento mudam estado real. */
function Controlled({
  children,
  ...props
}: Partial<React.ComponentProps<typeof Drawer>> & { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      title={props.title ?? 'Menu de navegação'}
      {...props}
    >
      {children ?? <nav aria-label="Navegação principal">itens</nav>}
    </Drawer>
  );
}

describe('Drawer', () => {
  it('renders dialog with accessible title when open', () => {
    render(<Controlled title="Menu do organizador" />);
    expect(screen.getByRole('dialog', { name: 'Menu do organizador' })).toBeInTheDocument();
  });

  it('title is present but visually hidden (sr-only)', () => {
    render(<Controlled title="Menu do organizador" />);
    // O nome acessível existe; o rótulo visual mora no conteúdo (marca).
    expect(screen.getByText('Menu do organizador').className).toContain('sr-only');
  });

  it('does not render when closed', () => {
    render(
      <Drawer open={false} onOpenChange={vi.fn()} title="Oculto">
        <nav aria-label="x">conteúdo</nav>
      </Drawer>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders children (the sidebar) inside the dialog', () => {
    render(<Controlled />);
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
  });

  it('closes on Esc', async () => {
    render(<Controlled />);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on overlay click', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByTestId('drawer-overlay'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('traps initial focus inside the dialog', () => {
    render(<Controlled />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it('overlay reusa a cortina do modal (tokens de bg + blur)', () => {
    render(<Controlled />);
    const overlay = screen.getByTestId('drawer-overlay');
    expect(overlay.className).toContain('bg-[var(--modal-overlay-bg)]');
    expect(overlay.className).toContain('backdrop-blur-[var(--modal-overlay-blur)]');
  });

  it('side=left (default) ancora à esquerda com slide da esquerda', () => {
    render(<Controlled />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('left-0');
    expect(dialog.className).toContain('slide-in-from-left');
  });

  it('side=right ancora à direita com slide da direita', () => {
    render(<Controlled side="right" />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('right-0');
    expect(dialog.className).toContain('slide-in-from-right');
  });

  it('respeita prefers-reduced-motion: animações gated por motion-safe', () => {
    render(<Controlled />);
    const dialog = screen.getByRole('dialog');
    // Toda classe de animação do painel é motion-safe: sob reduce = sem animação.
    expect(dialog.className).toContain('motion-safe:data-[state=open]:animate-in');
    expect(dialog.className).toContain('motion-safe:data-[state=open]:slide-in-from-left');
    const overlay = screen.getByTestId('drawer-overlay');
    expect(overlay.className).toContain('motion-safe:data-[state=open]:animate-in');
  });
});
