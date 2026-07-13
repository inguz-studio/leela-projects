// =============================================================================
// EntrarPage (S020-T1) — login, erros honestos sem enumeração e redirect
// pós-login para a rota de origem (state.from).
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EntrarPage } from '../EntrarPage';

const mocks = vi.hoisted(() => ({ loginComEmail: vi.fn() }));

vi.mock('@leela/api-client', () => ({
  loginComEmail: mocks.loginComEmail,
}));

function renderEntrar(from?: string): void {
  const entry = from ? { pathname: '/entrar', state: { from } } : '/entrar';
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/entrar" element={<EntrarPage />} />
        <Route path="/" element={<div>Visão Geral</div>} />
        <Route path="/eventos/e1/inscritos" element={<div>Inscritos do e1</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('EntrarPage', () => {
  it('botão desabilitado sem credenciais válidas; habilita com e-mail + senha', async () => {
    renderEntrar();
    const botao = screen.getByRole('button', { name: 'Entrar' });
    expect(botao).toBeDisabled();

    await userEvent.type(screen.getByLabelText('E-mail'), 'marina@demo.dev');
    expect(botao).toBeDisabled(); // ainda sem senha
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
    expect(botao).toBeEnabled();
  });

  it('login OK → redireciona para state.from (fecha o ciclo do E07)', async () => {
    mocks.loginComEmail.mockResolvedValue({ user: { uid: 'u1' } });
    renderEntrar('/eventos/e1/inscritos');

    await userEvent.type(screen.getByLabelText('E-mail'), 'marina@demo.dev');
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(mocks.loginComEmail).toHaveBeenCalledWith('marina@demo.dev', 'segredo123'));
    expect(await screen.findByText('Inscritos do e1')).toBeInTheDocument();
  });

  it('sem state.from → cai na raiz `/`', async () => {
    mocks.loginComEmail.mockResolvedValue({ user: { uid: 'u1' } });
    renderEntrar();
    await userEvent.type(screen.getByLabelText('E-mail'), 'marina@demo.dev');
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByText('Visão Geral')).toBeInTheDocument();
  });

  it('conta inexistente e senha errada mostram a MESMA mensagem (não enumera)', async () => {
    renderEntrar();
    await userEvent.type(screen.getByLabelText('E-mail'), 'quem@demo.dev');
    await userEvent.type(screen.getByLabelText('Senha'), 'errada123');

    mocks.loginComEmail.mockRejectedValueOnce({ code: 'auth/user-not-found' });
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    const alerta1 = await screen.findByRole('alert');
    expect(alerta1).toHaveTextContent('E-mail ou senha inválidos.');

    mocks.loginComEmail.mockRejectedValueOnce({ code: 'auth/wrong-password' });
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    const alerta2 = await screen.findByRole('alert');
    expect(alerta2).toHaveTextContent('E-mail ou senha inválidos.');

    // Não navegou para lugar nenhum.
    expect(screen.queryByText('Visão Geral')).not.toBeInTheDocument();
  });

  it('oferece caminhos de recuperação e cadastro', () => {
    renderEntrar();
    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute('href', '/recuperar-senha');
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastrar');
  });
});
