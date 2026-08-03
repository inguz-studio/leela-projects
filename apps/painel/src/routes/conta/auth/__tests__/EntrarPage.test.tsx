// =============================================================================
// EntrarPage (S020-T1) — login, erros honestos sem enumeração e redirect
// pós-login para a rota de origem (state.from).
//
// Estendida pelo item 57 do painel de decisões: o pós-login roteia POR PAPEL
// quando não há origem guardada, e a conta órfã não passa da porta. A decisão
// pura vive em `_lib/destinoPosLogin` (suíte própria); aqui se prova a FIAÇÃO —
// que a página coleta claims com refresh forçado, consulta o doc só quando
// precisa, derruba a sessão da conta órfã e navega para onde a decisão mandou.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EntrarPage } from '../EntrarPage';

const mocks = vi.hoisted(() => ({
  loginComEmail: vi.fn(),
  getClaims: vi.fn(),
  getProfissional: vi.fn(),
  getLeelaDb: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  loginComEmail: mocks.loginComEmail,
  getClaims: mocks.getClaims,
  getProfissional: mocks.getProfissional,
  getLeelaDb: mocks.getLeelaDb,
  logout: mocks.logout,
}));

function renderEntrar(from?: string): void {
  const entry = from ? { pathname: '/entrar', state: { from } } : '/entrar';
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/entrar" element={<EntrarPage />} />
        <Route path="/" element={<div>Visão Geral</div>} />
        <Route path="/plataforma" element={<div>Plataforma</div>} />
        <Route path="/eventos/e1/inscritos" element={<div>Inscritos do e1</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function submeter(): Promise<void> {
  await userEvent.type(screen.getByLabelText('E-mail'), 'marina@demo.dev');
  await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default do ambiente: organizador com tenant. Cada teste do item 57
  // sobrescreve o que precisa.
  mocks.getClaims.mockResolvedValue({ role: 'tenant_owner', tenantId: 't1' });
  mocks.getProfissional.mockResolvedValue({ id: 'u1' });
  mocks.logout.mockResolvedValue(undefined);
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

  it('from externo/protocol-relative é neutralizado → cai na raiz `/` (anti open-redirect)', async () => {
    mocks.loginComEmail.mockResolvedValue({ user: { uid: 'u1' } });
    // `//evil.com` navegaria para origem externa se confiado cegamente.
    renderEntrar('//evil.com');
    await userEvent.type(screen.getByLabelText('E-mail'), 'marina@demo.dev');
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));
    // Redireciona para a raiz interna, NÃO para o destino externo.
    expect(await screen.findByText('Visão Geral')).toBeInTheDocument();
  });

  it('oferece caminhos de recuperação e cadastro', () => {
    renderEntrar();
    expect(screen.getByRole('link', { name: 'Esqueci minha senha' })).toHaveAttribute('href', '/recuperar-senha');
    expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/cadastrar');
  });
});

describe('EntrarPage — roteamento por papel (item 57)', () => {
  beforeEach(() => {
    mocks.loginComEmail.mockResolvedValue({ user: { uid: 'u1' } });
  });

  it('platform_admin sem origem aterrissa em /plataforma', async () => {
    mocks.getClaims.mockResolvedValue({ role: 'platform_admin' });
    renderEntrar();
    await submeter();
    expect(await screen.findByText('Plataforma')).toBeInTheDocument();
  });

  it('organizador com tenant sem origem aterrissa na Visão Geral', async () => {
    renderEntrar();
    await submeter();
    expect(await screen.findByText('Visão Geral')).toBeInTheDocument();
  });

  it('a claim é lida com refresh FORÇADO (token em cache pode ser pré-resgate)', async () => {
    renderEntrar();
    await submeter();
    await waitFor(() => expect(mocks.getClaims).toHaveBeenCalledWith(true));
  });

  it('quem já tem tenant não paga round-trip no doc do profissional', async () => {
    renderEntrar();
    await submeter();
    await screen.findByText('Visão Geral');
    expect(mocks.getProfissional).not.toHaveBeenCalled();
  });

  it('conta travada (sem tenant, COM doc) ENTRA e vai encontrar o overlay', async () => {
    // Regressão da colisão que a premissa 9 resolveu: o item 57 não pode
    // barrar quem a RN-411 manda entrar.
    mocks.getClaims.mockResolvedValue({ role: 'athlete' });
    mocks.getProfissional.mockResolvedValue({ id: 'u1', statusOnboarding: 'aguardando_convite' });
    renderEntrar();
    await submeter();
    expect(await screen.findByText('Visão Geral')).toBeInTheDocument();
    expect(mocks.logout).not.toHaveBeenCalled();
  });

  it('conta órfã (sem tenant, SEM doc) fica na porta, e a sessão cai', async () => {
    mocks.getClaims.mockResolvedValue({ role: 'athlete' });
    mocks.getProfissional.mockResolvedValue(null);
    renderEntrar();
    await submeter();

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/não tem acesso ao painel do organizador/i);
    // Deixar a conta órfã autenticada seria acesso sem tela.
    await waitFor(() => expect(mocks.logout).toHaveBeenCalled());
    expect(screen.queryByText('Visão Geral')).not.toBeInTheDocument();
  });

  it('falha ao ler claims NÃO tranca ninguém do lado de fora', async () => {
    // Erro de rede não pode virar veredito de "conta órfã".
    mocks.getClaims.mockRejectedValue(new Error('offline'));
    renderEntrar();
    await submeter();
    expect(await screen.findByText('Visão Geral')).toBeInTheDocument();
    expect(mocks.logout).not.toHaveBeenCalled();
  });
});
