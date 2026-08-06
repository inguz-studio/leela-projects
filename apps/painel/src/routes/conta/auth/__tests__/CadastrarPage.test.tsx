// =============================================================================
// CadastrarPage (S020-T3 · estendida pela S030-T1 — RN-411/412).
//
// O que esta suíte trava:
//   - o formulário exige os dados do organizador (nome, e-mail, telefone,
//     organização) e o consentimento LGPD EXPLÍCITO;
//   - o checkbox de LGPD nasce DESMARCADO e sem ele o submit não vai;
//   - o pós-cadastro ATERRISSA LOGADO na home (RN-411), não num beco;
//   - erro de e-mail em uso orienta sem afirmar existência categórica;
//   - (FRONTEIRA-AUTH) o gate da senha é a política do core, o medidor só
//     aparece no campo onde a senha nasce e o olho não submete o formulário.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouter from 'react-router-dom';
import { CadastrarPage } from '../CadastrarPage';

const mocks = vi.hoisted(() => ({
  criarContaComEmail: vi.fn(),
  atualizarNomeExibicao: vi.fn(),
  criarPerfilOrganizador: vi.fn(),
  getLeelaDb: vi.fn(() => ({}) as unknown),
  navigate: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  criarContaComEmail: mocks.criarContaComEmail,
  atualizarNomeExibicao: mocks.atualizarNomeExibicao,
  criarPerfilOrganizador: mocks.criarPerfilOrganizador,
  getLeelaDb: mocks.getLeelaDb,
}));

vi.mock('react-router-dom', async () => {
  const real = await vi.importActual<typeof ReactRouter>('react-router-dom');
  return { ...real, useNavigate: () => mocks.navigate };
});

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/cadastrar']}>
      <CadastrarPage />
    </MemoryRouter>,
  );
}

/**
 * Senha que passa na política da casa (`@leela/core` · politicaDeSenha): 14
 * caracteres, um número e um caractere especial. O `segredo123` que este
 * arquivo usava antes só atendia ao piso velho de 6 e hoje reprova no campo —
 * é a mudança de régua, não uma quebra de teste.
 */
const SENHA_QUE_PASSA = 'trilha-longa9!';

async function preencher(
  overrides: Partial<{
    nome: string;
    email: string;
    telefone: string;
    organizacao: string;
    senha: string;
    lgpd: boolean;
  }> = {},
): Promise<void> {
  const {
    nome = 'Marina Castelo',
    email = 'marina@demo.dev',
    telefone = '48999998888',
    organizacao = 'Castelo Produções',
    senha = SENHA_QUE_PASSA,
    lgpd = true,
  } = overrides;
  // `userEvent.type` recusa string vazia — campo deixado em branco de
  // propósito (caso "obrigatório") simplesmente não é digitado.
  const digitar = async (rotulo: string, valor: string): Promise<void> => {
    if (valor.length === 0) return;
    await userEvent.type(screen.getByLabelText(rotulo), valor);
  };
  await digitar('Nome', nome);
  await digitar('E-mail', email);
  await digitar('Telefone ou WhatsApp', telefone);
  await digitar('Nome da organização', organizacao);
  await digitar('Senha', senha);
  await digitar('Confirmar senha', senha);
  if (lgpd) await userEvent.click(screen.getByRole('checkbox'));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CadastrarPage', () => {
  it('cria a conta, grava o nome, o perfil e ATERRISSA LOGADO na home (RN-411)', async () => {
    mocks.criarContaComEmail.mockResolvedValue({ user: { uid: 'novo' } });
    mocks.atualizarNomeExibicao.mockResolvedValue(undefined);
    mocks.criarPerfilOrganizador.mockResolvedValue(undefined);
    renderPage();
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() =>
      expect(mocks.criarContaComEmail).toHaveBeenCalledWith('marina@demo.dev', SENHA_QUE_PASSA),
    );
    expect(mocks.atualizarNomeExibicao).toHaveBeenCalledWith('Marina Castelo');
    await waitFor(() =>
      expect(mocks.criarPerfilOrganizador).toHaveBeenCalledWith(expect.anything(), 'novo', {
        nome: 'Marina Castelo',
        email: 'marina@demo.dev',
        telefone: '48999998888',
        organizacao: 'Castelo Produções',
      }),
    );
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('falha ao gravar o perfil NÃO prende a pessoa fora da conta que já existe', async () => {
    mocks.criarContaComEmail.mockResolvedValue({ user: { uid: 'novo' } });
    mocks.atualizarNomeExibicao.mockResolvedValue(undefined);
    mocks.criarPerfilOrganizador.mockRejectedValue(new Error('permission-denied'));
    renderPage();
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('o consentimento LGPD nasce DESMARCADO (RN-412)', () => {
    renderPage();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('sem consentimento LGPD o submit não vai', async () => {
    renderPage();
    await preencher({ lgpd: false });
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(mocks.criarContaComEmail).not.toHaveBeenCalled();
  });

  it('telefone e organização são obrigatórios (RN-412 · P8)', async () => {
    renderPage();
    await preencher({ telefone: '', organizacao: '' });
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
  });

  // ── DEF-A (ONBOARD-REV) ────────────────────────────────────────────────
  // O gate da tela tem de ser o MESMO da Rule `shapeAutoCadastroValido`
  // (nome e organização de 2 a 80). Enquanto ele foi `length > 0` sem teto,
  // `nome: 'F'` e uma organização de 81 caracteres passavam pelo botão, o
  // servidor negava o `setDoc`, o `catch` vazio engolia — e a conta nascia
  // sem `profissionais/{uid}`. No login seguinte o item 57 barra essa conta
  // na porta e o e-mail já está em uso: beco sem saída.
  //
  // Falsificação: devolva o gate para `nome.trim().length > 0` e estes casos
  // morrem (o botão volta a habilitar).
  it('DEF-A: nome de 1 caractere NÃO passa do botão (a Rule exige 2)', async () => {
    renderPage();
    await preencher({ nome: 'F' });
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
    expect(screen.getByText('Use de 2 a 80 caracteres.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(mocks.criarContaComEmail).not.toHaveBeenCalled();
  });

  it('DEF-A: organização de 81 caracteres NÃO passa do botão (a Rule exige ≤ 80)', async () => {
    renderPage();
    await preencher({ organizacao: 'x'.repeat(81) });
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(mocks.criarContaComEmail).not.toHaveBeenCalled();
  });

  it('DEF-A: nome de 81 caracteres também é barrado', async () => {
    renderPage();
    await preencher({ nome: 'M'.repeat(81) });
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
  });

  it('DEF-A: o limite do servidor é o limite da tela — 2 e 80 passam', async () => {
    mocks.criarContaComEmail.mockResolvedValue({ user: { uid: 'novo' } });
    mocks.atualizarNomeExibicao.mockResolvedValue(undefined);
    mocks.criarPerfilOrganizador.mockResolvedValue(undefined);
    renderPage();
    await preencher({ nome: 'Fê', organizacao: 'y'.repeat(80) });
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled();
  });

  it('não pede CPF/CNPJ — KYC segue fora (Won\'t do E16)', () => {
    renderPage();
    expect(screen.queryByLabelText(/cpf/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/cnpj/i)).not.toBeInTheDocument();
  });

  it('senha curta e confirmação divergente travam o submit', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Nome'), 'Marina');
    await userEvent.type(screen.getByLabelText('E-mail'), 'marina@demo.dev');
    await userEvent.type(screen.getByLabelText('Senha'), '123');
    // Quem diz o que falta agora é o medidor, com a lista inteira de uma vez
    // (o piso E o caractere especial), não uma frase escrita à mão na tela.
    expect(
      screen.getByText(/Falta pelo menos 8 caracteres e um caractere especial/),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Confirmar senha'), '999');
    expect(screen.getByText('As senhas não conferem.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
  });

  // ── FRONTEIRA-AUTH ─────────────────────────────────────────────────────
  // A senha NASCE nesta tela, então aqui vale a política inteira do core — e
  // não o piso de 6 que a tela carregava por conta própria.
  it('o piso velho de 6 não passa mais: `abc12` fica de fora do botão', async () => {
    renderPage();
    await preencher({ senha: 'abc12' });
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    expect(mocks.criarContaComEmail).not.toHaveBeenCalled();
  });

  it('comprimento sozinho não compra o botão: falta o caractere especial', async () => {
    // 12 caracteres e um número — passaria em qualquer régua só de tamanho.
    renderPage();
    await preencher({ senha: 'abcdefghij12' });
    expect(screen.getByText(/Falta um caractere especial/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeDisabled();
  });

  it('atendida a regra, o botão libera', async () => {
    renderPage();
    await preencher();
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled();
  });

  it('a dica nomeia a exigência inteira ANTES da primeira tecla', async () => {
    // A frase é a de `exigenciaDeSenha()` — a MESMA que a Function devolve ao
    // recusar. Escrever uma variação à mão aqui é como tela e servidor voltam
    // a se contradizer.
    renderPage();
    const dica = screen.getByText(/Use pelo menos 8 caracteres/);
    expect(dica).toHaveTextContent('um número');
    expect(dica).toHaveTextContent('um caractere especial');
    // Descreve o campo de senha, não fica solta na tela.
    expect(screen.getByLabelText('Senha').getAttribute('aria-describedby')).toContain(dica.id);
  });

  it('só a senha nova tem medidor — a confirmação não repete o diagnóstico', async () => {
    renderPage();
    await preencher({ senha: 'abc' });
    // `abc` nos DOIS campos: se a confirmação também medisse, haveria duas
    // leituras do mesmo diagnóstico na tela.
    expect(screen.getAllByText('Senha fraca')).toHaveLength(1);
  });

  it('o olho revela a senha e NÃO submete o formulário', async () => {
    renderPage();
    await preencher(); // formulário VÁLIDO: se o clique submetesse, criaria a conta
    const campo = screen.getByLabelText('Senha');
    expect(campo).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getAllByRole('button', { name: 'Mostrar a senha' })[0]!);
    expect(campo).toHaveAttribute('type', 'text');
    expect(mocks.criarContaComEmail).not.toHaveBeenCalled();
  });

  it('e-mail em uso: erro orienta sem afirmar existência categórica', async () => {
    mocks.criarContaComEmail.mockRejectedValue({ code: 'auth/email-already-in-use' });
    renderPage();
    await preencher();
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent(/já tem uma conta/i);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
