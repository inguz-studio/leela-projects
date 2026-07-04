import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@leela/design-system';
import { ConviteModal } from '../ConviteModal';
import { mkClube } from '../../../_test/fixtures';

function renderModal(over = {}) {
  return render(
    <ToastProvider>
      <ConviteModal open onOpenChange={() => {}} clube={mkClube({ codigoConvite: '8A3K9' })} {...over} />
    </ToastProvider>,
  );
}

describe('ConviteModal', () => {
  it('abre com as 3 tabs e a tab Link ativa por padrão', () => {
    renderModal();
    expect(screen.getByRole('tab', { name: 'Link público' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Por código' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Por email' })).toBeInTheDocument();
    expect(screen.getByText(/be-hero\.com\.br\/c\/corrida-perfeita-sul\/convite\/8A3K9/)).toBeInTheDocument();
  });

  it('tab Por código mostra o código 8A3K9', async () => {
    renderModal();
    await userEvent.click(screen.getByRole('tab', { name: 'Por código' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('8A3K9')).toBeInTheDocument();
  });

  it('tab Email: envio desabilitado com 0 emails, habilita com email válido (RN-106)', async () => {
    const onEnviar = vi.fn();
    renderModal({ onEnviar });
    await userEvent.click(screen.getByRole('tab', { name: 'Por email' }));
    const enviar = screen.getByRole('button', { name: 'Enviar convites' });
    expect(enviar).toBeDisabled();
    await userEvent.type(screen.getByLabelText('Emails dos convidados'), 'pedro@gmail.com, ana@gmail.com');
    expect(enviar).toBeEnabled();
    await userEvent.click(enviar);
    expect(onEnviar).toHaveBeenCalledWith(['pedro@gmail.com', 'ana@gmail.com']);
  });

  it('tab Email: email inválido mantém o envio desabilitado e mostra erro', async () => {
    renderModal();
    await userEvent.click(screen.getByRole('tab', { name: 'Por email' }));
    await userEvent.type(screen.getByLabelText('Emails dos convidados'), 'quebrado');
    expect(screen.getByRole('button', { name: 'Enviar convites' })).toBeDisabled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('oferece as vias de fechamento (botão X, Cancelar) — C10', async () => {
    const onOpenChange = vi.fn();
    renderModal({ onOpenChange });
    // via 1: botão X do Modal
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeInTheDocument();
    // via 4: botão Cancelar no rodapé
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
