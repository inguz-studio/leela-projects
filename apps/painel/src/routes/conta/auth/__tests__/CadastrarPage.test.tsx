// =============================================================================
// CadastrarPage (S020-T3) — cria a conta + nome, pós-cadastro honesto (sem
// tenant), erros mapeados sem afirmar existência categórica da conta.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CadastrarPage } from '../CadastrarPage';

const mocks = vi.hoisted(() => ({
  criarContaComEmail: vi.fn(),
  atualizarNomeExibicao: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  criarContaComEmail: mocks.criarContaComEmail,
  atualizarNomeExibicao: mocks.atualizarNomeExibicao,
}));

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/cadastrar']}>
      <CadastrarPage />
    </MemoryRouter>,
  );
}

async function preencher(nome = 'Marina Castelo', email = 'marina@demo.dev', senha = 'segredo123'): Promise<void> {
  await userEvent.type(screen.getByLabelText('Nome'), nome);
  await userEvent.type(screen.getByLabelText('E-mail'), email);
  await userEvent.type(screen.getByLabelText('Senha'), senha);
  await userEvent.type(screen.getByLabelText('Confirmar senha'), senha);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CadastrarPage', () => {
  it('cria a conta, grava o nome e cai no estado honesto (sem tenant)', async () => {
    mocks.criarContaComEmail.mockResolvedValue({ user: { uid: 'novo' } });
    mocks.atualizarNomeExibicao.mockResolvedValue(undefined);
    renderPage();
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => expect(mocks.criarContaComEmail).toHaveBeenCalledWith('marina@demo.dev', 'segredo123'));
    expect(mocks.atualizarNomeExibicao).toHaveBeenCalledWith('Marina Castelo');
    expect(await screen.findByRole('heading', { name: 'Conta criada' })).toBeInTheDocument();
    expect(screen.getByText(/convite da equipe ou por provisionamento/i)).toBeInTheDocument();
  });

  it('senha curta e confirmação divergente travam o submit', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Nome'), 'Marina');
    await userEvent.type(screen.getByLabelText('E-mail'), 'marina@demo.dev');
    await userEvent.type(screen.getByLabelText('Senha'), '123');
    expect(screen.getByText(/pelo menos 6 caracteres/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Confirmar senha'), '999');
    expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
  });

  it('e-mail em uso: erro orienta sem afirmar existência categórica', async () => {
    mocks.criarContaComEmail.mockRejectedValue({ code: 'auth/email-already-in-use' });
    renderPage();
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/já tem uma conta/i);
    expect(screen.queryByRole('heading', { name: 'Conta criada' })).not.toBeInTheDocument();
  });
});
