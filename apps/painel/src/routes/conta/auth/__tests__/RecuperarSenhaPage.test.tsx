// =============================================================================
// RecuperarSenhaPage (S020-T2) — confirmação NEUTRA (anti-enumeração): a mesma
// mensagem exista ou não a conta; só falha técnica vira aviso de retry.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RecuperarSenhaPage } from '../RecuperarSenhaPage';

const mocks = vi.hoisted(() => ({ enviarResetSenha: vi.fn() }));

vi.mock('@leela/api-client', () => ({
  enviarResetSenha: mocks.enviarResetSenha,
}));

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/recuperar-senha']}>
      <RecuperarSenhaPage />
    </MemoryRouter>,
  );
}

const MSG_NEUTRA = /se houver uma conta com esse e-mail/i;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RecuperarSenhaPage (confirmação neutra)', () => {
  it('e-mail existente → confirmação neutra', async () => {
    mocks.enviarResetSenha.mockResolvedValue(undefined);
    renderPage();
    await userEvent.type(screen.getByLabelText('E-mail'), 'marina@demo.dev');
    await userEvent.click(screen.getByRole('button', { name: /Enviar link/ }));
    expect(await screen.findByText(MSG_NEUTRA)).toBeInTheDocument();
  });

  it('e-mail INEXISTENTE → MESMA confirmação neutra (não enumera)', async () => {
    mocks.enviarResetSenha.mockRejectedValue({ code: 'auth/user-not-found' });
    renderPage();
    await userEvent.type(screen.getByLabelText('E-mail'), 'ninguem@demo.dev');
    await userEvent.click(screen.getByRole('button', { name: /Enviar link/ }));
    expect(await screen.findByText(MSG_NEUTRA)).toBeInTheDocument();
    // Nada que revele inexistência da conta.
    expect(screen.queryByText(/não (está )?cadastrad/i)).not.toBeInTheDocument();
  });

  it('falha técnica (rede) → aviso de retry, não confirma nem nega existência', async () => {
    mocks.enviarResetSenha.mockRejectedValue({ code: 'auth/network-request-failed' });
    renderPage();
    await userEvent.type(screen.getByLabelText('E-mail'), 'marina@demo.dev');
    await userEvent.click(screen.getByRole('button', { name: /Enviar link/ }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/tente de novo/i);
    expect(screen.queryByText(MSG_NEUTRA)).not.toBeInTheDocument();
  });

  it('botão desabilitado com e-mail inválido', async () => {
    renderPage();
    const botao = screen.getByRole('button', { name: /Enviar link/ });
    expect(botao).toBeDisabled();
    await userEvent.type(screen.getByLabelText('E-mail'), 'nao-e-email');
    expect(botao).toBeDisabled();
    await waitFor(() => expect(mocks.enviarResetSenha).not.toHaveBeenCalled());
  });
});
