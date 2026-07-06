import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { Modal } from '../Modal';

/** Harness controlado — as 4 vias de fechamento mudam estado real. */
function Controlled({
  children,
  ...props
}: Partial<React.ComponentProps<typeof Modal>> & { children?: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  return (
    <Modal
      open={open}
      onOpenChange={setOpen}
      title={props.title ?? 'Título do modal'}
      {...props}
    >
      {children}
    </Modal>
  );
}

describe('Modal', () => {
  it('renders dialog with accessible title when open', () => {
    render(<Controlled title="Editar evento" />);
    expect(screen.getByRole('dialog', { name: 'Editar evento' })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} onOpenChange={vi.fn()} title="Oculto">
        conteúdo
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders children and description', () => {
    render(
      <Controlled title="Título" description="Descrição do contexto">
        <p>Corpo do modal</p>
      </Controlled>,
    );
    expect(screen.getByText('Corpo do modal')).toBeInTheDocument();
    expect(screen.getByText('Descrição do contexto')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Descrição do contexto');
  });

  it('via 1 — closes on X button', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('via 2 — closes on Esc', async () => {
    render(<Controlled />);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('via 3 — closes on overlay click', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByTestId('modal-overlay'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('via 4 — closes via footer cancel calling onOpenChange', async () => {
    function WithFooter() {
      const [open, setOpen] = React.useState(true);
      return (
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Com footer"
          footer={
            <button type="button" onClick={() => setOpen(false)}>
              Cancelar
            </button>
          }
        />
      );
    }
    render(<WithFooter />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('applies width token per size', () => {
    render(<Controlled size="lg" />);
    expect(screen.getByRole('dialog').className).toContain('w-[var(--modal-width-lg)]');
  });

  it('defaults to md width', () => {
    render(<Controlled />);
    expect(screen.getByRole('dialog').className).toContain('w-[var(--modal-width-md)]');
  });

  it('overlay uses blur tokens', () => {
    render(<Controlled />);
    const overlay = screen.getByTestId('modal-overlay');
    expect(overlay.className).toContain('bg-[var(--modal-overlay-bg)]');
    expect(overlay.className).toContain('backdrop-blur-[var(--modal-overlay-blur)]');
  });

  it('adota o frame shadcn via aliases (bg-card) com motion tokenizado', () => {
    render(<Controlled />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('bg-card');
    expect(dialog.className).toContain('data-[state=open]:animate-in');
    expect(dialog.className).toContain('data-[state=open]:zoom-in-95');
    const overlay = screen.getByTestId('modal-overlay');
    expect(overlay.className).toContain('data-[state=open]:fade-in-0');
    const close = screen.getByRole('button', { name: 'Fechar' });
    expect(close.className).toContain('focus-visible:ring-ring');
    expect(close.className).toContain('ring-offset-background');
  });

  it('traps initial focus inside the dialog', () => {
    render(<Controlled />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});
