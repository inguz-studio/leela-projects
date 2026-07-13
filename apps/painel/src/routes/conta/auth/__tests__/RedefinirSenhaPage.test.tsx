// =============================================================================
// RedefinirSenhaPage (S020-T2) — valida oobCode, redefine a senha e trata link
// inválido/expirado com estado honesto.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RedefinirSenhaPage } from '../RedefinirSenhaPage';

const mocks = vi.hoisted(() => ({
  verificarCodigoResetSenha: vi.fn(),
  confirmarResetSenha: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  verificarCodigoResetSenha: mocks.verificarCodigoResetSenha,
  confirmarResetSenha: mocks.confirmarResetSenha,
}));

function renderAt(search: string): void {
  render(
    <MemoryRouter initialEntries={[`/redefinir-senha${search}`]}>
      <RedefinirSenhaPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RedefinirSenhaPage', () => {
  it('sem oobCode → estado honesto de link inválido', async () => {
    renderAt('');
    expect(await screen.findByRole('heading', { name: 'Link inválido' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Solicitar nova redefinição/ })).toHaveAttribute(
      'href',
      '/recuperar-senha',
    );
    expect(mocks.verificarCodigoResetSenha).not.toHaveBeenCalled();
  });

  it('oobCode inválido/expirado → mensagem honesta + caminho de nova solicitação', async () => {
    mocks.verificarCodigoResetSenha.mockRejectedValue({ code: 'auth/expired-action-code' });
    renderAt('?oobCode=xpto');
    expect(await screen.findByText(/Este link expirou/)).toBeInTheDocument();
  });

  it('oobCode válido → redefine e mostra sucesso', async () => {
    mocks.verificarCodigoResetSenha.mockResolvedValue('marina@demo.dev');
    mocks.confirmarResetSenha.mockResolvedValue(undefined);
    renderAt('?oobCode=valido123');

    // Espera a validação do código resolver e o form aparecer.
    expect(await screen.findByRole('heading', { name: 'Criar nova senha' })).toBeInTheDocument();
    expect(screen.getByText(/marina@demo\.dev/)).toBeInTheDocument();

    const botao = screen.getByRole('button', { name: 'Redefinir senha' });
    expect(botao).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Nova senha'), 'novaSenha1');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'novaSenha1');
    expect(botao).toBeEnabled();
    await userEvent.click(botao);

    expect(await screen.findByRole('heading', { name: 'Senha redefinida' })).toBeInTheDocument();
    expect(mocks.confirmarResetSenha).toHaveBeenCalledWith('valido123', 'novaSenha1');
  });

  it('senhas que não conferem mantêm o submit travado', async () => {
    mocks.verificarCodigoResetSenha.mockResolvedValue('marina@demo.dev');
    renderAt('?oobCode=valido123');
    await screen.findByRole('heading', { name: 'Criar nova senha' });

    await userEvent.type(screen.getByLabelText('Nova senha'), 'novaSenha1');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'outraCoisa9');
    expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redefinir senha' })).toBeDisabled();
  });
});
