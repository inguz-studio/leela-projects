import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { ConfirmModal } from '../ConfirmModal';

const baseProps = {
  title: 'Desativar patrocinador?',
  target: <p>Suplementos XPTO — patrocinador Ouro</p>,
  loses: ['Logo sai das páginas dos eventos', 'Cupons ativos são cancelados'],
  keeps: ['Histórico de campanhas', 'Relatórios já gerados'],
  confirmLabel: 'Desativar patrocinador',
  onConfirm: vi.fn(),
};

function Controlled(props: Partial<React.ComponentProps<typeof ConfirmModal>>) {
  const [open, setOpen] = React.useState(true);
  return <ConfirmModal {...baseProps} open={open} onOpenChange={setOpen} {...props} />;
}

describe('ConfirmModal', () => {
  it('renders target card with critical border tokens', () => {
    render(<Controlled />);
    const card = screen.getByText(/Suplementos XPTO/).parentElement!;
    expect(card.className).toContain('border-l-[length:var(--card-critical-border)]');
    expect(card.className).toContain('border-l-[color:var(--feedback-danger)]');
  });

  it('shows "perde" list with danger tone', () => {
    render(<Controlled />);
    expect(screen.getByText('O que você perde')).toBeInTheDocument();
    expect(screen.getByText('Logo sai das páginas dos eventos')).toBeInTheDocument();
    expect(screen.getByText('O que você perde').className).toContain(
      'text-[var(--text-danger)]',
    );
  });

  it('shows "mantém" list with success tone', () => {
    render(<Controlled />);
    expect(screen.getByText('O que se mantém')).toBeInTheDocument();
    expect(screen.getByText('Histórico de campanhas')).toBeInTheDocument();
    expect(screen.getByText('O que se mantém').className).toContain(
      'text-[var(--text-success)]',
    );
  });

  it('confirm button is destructive (Vulcão) and fires onConfirm', async () => {
    const onConfirm = vi.fn();
    render(<Controlled onConfirm={onConfirm} />);
    const confirm = screen.getByRole('button', { name: 'Desativar patrocinador' });
    expect(confirm.className).toContain('bg-[var(--action-destructive)]');
    await userEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith({ reason: '', notify: false });
  });

  it('collects optional reason and notify checkbox', async () => {
    const onConfirm = vi.fn();
    render(
      <Controlled
        onConfirm={onConfirm}
        reasonLabel="Motivo (opcional)"
        notifyLabel="Notificar patrocinador por e-mail"
      />,
    );
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Motivo (opcional)' }),
      'Contrato encerrado',
    );
    await userEvent.click(
      screen.getByRole('checkbox', { name: 'Notificar patrocinador por e-mail' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Desativar patrocinador' }));
    expect(onConfirm).toHaveBeenCalledWith({
      reason: 'Contrato encerrado',
      notify: true,
    });
  });

  it('does not render reason/notify when labels are absent', () => {
    render(<Controlled />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('cancel button closes the modal', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes via X, overlay and Esc (herda as 4 vias)', async () => {
    const { unmount } = render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    unmount();

    const second = render(<Controlled />);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    second.unmount();

    render(<Controlled />);
    await userEvent.click(screen.getByTestId('modal-overlay'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables actions while loading', () => {
    render(<Controlled loading />);
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Desativar patrocinador' })).toBeDisabled();
  });

  it('onConfirm does not close the modal by itself (consumidor decide)', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: 'Desativar patrocinador' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
