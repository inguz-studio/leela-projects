// =============================================================================
// RedefinirSenhaPage (S020-T2) — valida oobCode, redefine a senha e trata link
// inválido/expirado com estado honesto.
//
// FRONTEIRA-AUTH: a senha NASCE aqui, então o gate é a política do core
// (`senhaValida`) e não o piso de 6 que a tela mantinha por conta própria. O
// medidor fica só no campo da senha nova; a confirmação não repete.
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

/**
 * Senha que passa na política da casa (14 caracteres, número e especial). O
 * `novaSenha1` usado antes só atendia ao piso velho de 6 e hoje reprova no
 * campo — mudou a régua, não o teste.
 */
const SENHA_QUE_PASSA = 'trilha-longa9!';

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

    await userEvent.type(screen.getByLabelText('Nova senha'), SENHA_QUE_PASSA);
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), SENHA_QUE_PASSA);
    expect(botao).toBeEnabled();
    await userEvent.click(botao);

    expect(await screen.findByRole('heading', { name: 'Senha redefinida' })).toBeInTheDocument();
    expect(mocks.confirmarResetSenha).toHaveBeenCalledWith('valido123', SENHA_QUE_PASSA);
  });

  it('senhas que não conferem mantêm o submit travado', async () => {
    mocks.verificarCodigoResetSenha.mockResolvedValue('marina@demo.dev');
    renderAt('?oobCode=valido123');
    await screen.findByRole('heading', { name: 'Criar nova senha' });

    await userEvent.type(screen.getByLabelText('Nova senha'), SENHA_QUE_PASSA);
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'outra-trilha8!');
    expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redefinir senha' })).toBeDisabled();
  });
});

describe('RedefinirSenhaPage — a política da casa', () => {
  beforeEach(() => {
    mocks.verificarCodigoResetSenha.mockResolvedValue('marina@demo.dev');
  });

  it('o submit fica travado enquanto a regra não é atendida, mesmo com as duas iguais', async () => {
    renderAt('?oobCode=valido123');
    await screen.findByRole('heading', { name: 'Criar nova senha' });
    const botao = screen.getByRole('button', { name: 'Redefinir senha' });

    // 12 caracteres e um número: comprimento de sobra, sem caractere especial.
    await userEvent.type(screen.getByLabelText('Nova senha'), 'abcdefghij12');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'abcdefghij12');
    expect(screen.getByText(/Falta um caractere especial/)).toBeInTheDocument();
    expect(botao).toBeDisabled();

    // O caractere que falta destrava — e nada mais.
    await userEvent.type(screen.getByLabelText('Nova senha'), '!');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), '!');
    expect(botao).toBeEnabled();
    expect(mocks.confirmarResetSenha).not.toHaveBeenCalled();
  });

  it('a dica nomeia a exigência e descreve o campo da senha nova', async () => {
    renderAt('?oobCode=valido123');
    await screen.findByRole('heading', { name: 'Criar nova senha' });
    const dica = screen.getByText(/Use pelo menos 8 caracteres/);
    expect(dica).toHaveTextContent('um número');
    expect(dica).toHaveTextContent('um caractere especial');
    expect(screen.getByLabelText('Nova senha').getAttribute('aria-describedby')).toContain(dica.id);
  });

  it('só a senha nova tem medidor — a confirmação não repete o diagnóstico', async () => {
    renderAt('?oobCode=valido123');
    await screen.findByRole('heading', { name: 'Criar nova senha' });
    await userEvent.type(screen.getByLabelText('Nova senha'), 'abc');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'abc');
    expect(screen.getAllByText('Senha fraca')).toHaveLength(1);
  });

  it('o olho revela a senha e NÃO submete o formulário', async () => {
    renderAt('?oobCode=valido123');
    await screen.findByRole('heading', { name: 'Criar nova senha' });
    await userEvent.type(screen.getByLabelText('Nova senha'), SENHA_QUE_PASSA);
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), SENHA_QUE_PASSA);
    // Formulário VÁLIDO: se o botão do olho submetesse, a senha teria sido
    // redefinida no clique.
    const campo = screen.getByLabelText('Nova senha');
    await userEvent.click(screen.getAllByRole('button', { name: 'Mostrar a senha' })[0]!);
    expect(campo).toHaveAttribute('type', 'text');
    expect(mocks.confirmarResetSenha).not.toHaveBeenCalled();
  });
});
