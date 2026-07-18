// =============================================================================
// ContaPage (S020-T4) — perfil (nome/e-mail), troca de senha com reauth
// obrigatória e estado honesto para anônimo. ContaRoutes registra /conta.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { ContaPage } from '../ContaPage';
import { ContaRoutes } from '../ContaRoutes';

const mocks = vi.hoisted(() => ({
  onSessionChange: vi.fn(),
  atualizarNomeExibicao: vi.fn(),
  atualizarFotoPerfil: vi.fn(),
  trocarSenha: vi.fn(),
  logout: vi.fn(),
  uploadFotoPerfilConta: vi.fn(),
  problemaDoArquivoImagem: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  onSessionChange: mocks.onSessionChange,
  atualizarNomeExibicao: mocks.atualizarNomeExibicao,
  atualizarFotoPerfil: mocks.atualizarFotoPerfil,
  trocarSenha: mocks.trocarSenha,
  logout: mocks.logout,
  uploadFotoPerfilConta: mocks.uploadFotoPerfilConta,
  problemaDoArquivoImagem: mocks.problemaDoArquivoImagem,
}));

type FakeUser = { uid: string; displayName: string | null; email: string | null };

function comSessao(user: FakeUser | null): void {
  mocks.onSessionChange.mockImplementation((cb: (u: FakeUser | null) => void) => {
    cb(user);
    return () => {};
  });
}

function renderPage(): void {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/conta']}>
        <ContaPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  comSessao({ uid: 'u1', displayName: 'Marina Castelo', email: 'marina@demo.dev' });
  mocks.atualizarNomeExibicao.mockResolvedValue(undefined);
  mocks.atualizarFotoPerfil.mockResolvedValue(undefined);
  mocks.trocarSenha.mockResolvedValue(undefined);
  mocks.logout.mockResolvedValue(undefined);
  mocks.uploadFotoPerfilConta.mockResolvedValue('https://storage.leela.dev/users/u1/foto-perfil');
  mocks.problemaDoArquivoImagem.mockReturnValue(null);
});

describe('ContaPage — perfil', () => {
  it('mostra nome e e-mail (read-only) do usuário logado', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Sua conta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome')).toHaveValue('Marina Castelo');
    const email = screen.getByLabelText('E-mail');
    expect(email).toHaveValue('marina@demo.dev');
    expect(email).toHaveAttribute('readonly');
  });

  it('salvar só habilita quando o nome muda; persiste via atualizarNomeExibicao', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Sua conta' });
    const salvar = screen.getByRole('button', { name: 'Salvar' });
    expect(salvar).toBeDisabled(); // igual ao original

    await userEvent.clear(screen.getByLabelText('Nome'));
    await userEvent.type(screen.getByLabelText('Nome'), 'Marina C. Souza');
    expect(salvar).toBeEnabled();
    await userEvent.click(salvar);
    await waitFor(() => expect(mocks.atualizarNomeExibicao).toHaveBeenCalledWith('Marina C. Souza'));
    expect(await screen.findByText('Nome atualizado')).toBeInTheDocument();
  });

  it('anônimo → estado honesto com caminho para o login', async () => {
    comSessao(null);
    renderPage();
    expect(await screen.findByText(/não está autenticado/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para o login' })).toHaveAttribute('href', '/entrar');
  });
});

describe('ContaPage — foto de perfil por UPLOAD (LEELA-R5)', () => {
  const arquivo = new File(['x'], 'foto.png', { type: 'image/png' });

  it('upload feliz: sobe o arquivo, persiste a downloadURL e preenche o campo', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Sua conta' });
    await userEvent.upload(screen.getByLabelText('Enviar foto'), arquivo);
    await waitFor(() => expect(mocks.uploadFotoPerfilConta).toHaveBeenCalledWith(arquivo));
    await waitFor(() =>
      expect(mocks.atualizarFotoPerfil).toHaveBeenCalledWith(
        'https://storage.leela.dev/users/u1/foto-perfil',
      ),
    );
    expect(await screen.findByText('Foto atualizada')).toBeInTheDocument();
    expect(screen.getByLabelText('Ou cole uma URL')).toHaveValue(
      'https://storage.leela.dev/users/u1/foto-perfil',
    );
  });

  it('arquivo inválido: erro inline SEM roundtrip de upload', async () => {
    mocks.problemaDoArquivoImagem.mockReturnValue('A imagem deve ter no máximo 5MB.');
    renderPage();
    await screen.findByRole('heading', { name: 'Sua conta' });
    await userEvent.upload(screen.getByLabelText('Enviar foto'), arquivo);
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('A imagem deve ter no máximo 5MB.');
    expect(mocks.uploadFotoPerfilConta).not.toHaveBeenCalled();
    expect(mocks.atualizarFotoPerfil).not.toHaveBeenCalled();
  });

  it('falha no upload: toast honesto, sem persistir URL', async () => {
    mocks.uploadFotoPerfilConta.mockRejectedValue(new Error('storage/unauthorized'));
    renderPage();
    await screen.findByRole('heading', { name: 'Sua conta' });
    await userEvent.upload(screen.getByLabelText('Enviar foto'), arquivo);
    expect(await screen.findByText('Não foi possível enviar a foto')).toBeInTheDocument();
    expect(mocks.atualizarFotoPerfil).not.toHaveBeenCalled();
  });
});

describe('ContaPage — troca de senha (reauth obrigatória)', () => {
  it('troca a senha reautenticando com a senha atual', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Sua conta' });

    const trocar = screen.getByRole('button', { name: 'Trocar senha' });
    expect(trocar).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Senha atual'), 'antiga123');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'novaSenha1');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'novaSenha1');
    expect(trocar).toBeEnabled();
    await userEvent.click(trocar);

    await waitFor(() => expect(mocks.trocarSenha).toHaveBeenCalledWith('antiga123', 'novaSenha1'));
    expect(await screen.findByText('Senha atualizada')).toBeInTheDocument();
    // Campos limpos após sucesso (não retém senha).
    expect(screen.getByLabelText('Senha atual')).toHaveValue('');
    expect(screen.getByLabelText('Nova senha')).toHaveValue('');
  });

  it('senha atual incorreta (falha na reauth) → mensagem específica, sem trocar', async () => {
    mocks.trocarSenha.mockRejectedValue({ code: 'auth/wrong-password' });
    renderPage();
    await screen.findByRole('heading', { name: 'Sua conta' });

    await userEvent.type(screen.getByLabelText('Senha atual'), 'chuteERrada');
    await userEvent.type(screen.getByLabelText('Nova senha'), 'novaSenha1');
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), 'novaSenha1');
    await userEvent.click(screen.getByRole('button', { name: 'Trocar senha' }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Senha atual incorreta.');
  });

  it('nova senha curta e confirmação divergente travam o submit', async () => {
    renderPage();
    await screen.findByRole('heading', { name: 'Sua conta' });
    await userEvent.type(screen.getByLabelText('Senha atual'), 'antiga123');
    await userEvent.type(screen.getByLabelText('Nova senha'), '123');
    expect(screen.getByText(/pelo menos 6 caracteres/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Confirmar nova senha'), '999');
    expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Trocar senha' })).toBeDisabled();
  });
});

describe('ContaPage — sessão (logout)', () => {
  it('sair encerra a sessão (logout) e leva ao login', async () => {
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/conta']}>
          <Routes>
            <Route path="/conta" element={<ContaPage />} />
            <Route path="/entrar" element={<div>Tela de login</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );
    await screen.findByRole('heading', { name: 'Sua conta' });

    await userEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));
    await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
  });

  it('mesmo se o logout falhar, encaminha para o login (fail-safe)', async () => {
    mocks.logout.mockRejectedValue(new Error('rede'));
    render(
      <ToastProvider>
        <MemoryRouter initialEntries={['/conta']}>
          <Routes>
            <Route path="/conta" element={<ContaPage />} />
            <Route path="/entrar" element={<div>Tela de login</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>,
    );
    await screen.findByRole('heading', { name: 'Sua conta' });

    await userEvent.click(screen.getByRole('button', { name: 'Sair da conta' }));
    expect(await screen.findByText('Tela de login')).toBeInTheDocument();
  });
});

describe('ContaRoutes', () => {
  it('registra a rota /conta apontando para a ContaPage', async () => {
    render(
      <MemoryRouter initialEntries={['/conta']}>
        <Routes>
          <Route path="/conta/*" element={<ContaRoutes />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Sua conta' })).toBeInTheDocument();
  });
});
