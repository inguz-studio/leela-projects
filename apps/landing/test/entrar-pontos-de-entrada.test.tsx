/**
 * entrar-pontos-de-entrada.test.tsx — BUILD-MOTION · unificação do "Entrar"
 *
 * A ordem do dono, verbatim: "O botão de entrar nao deve direcionar para outra
 * página e sim para este modal overlay que abre e fecha." E a decisão que
 * fecha a fronteira, também dele: "acho que podemos deixar separado o acesso de
 * cliente e o acesso admin mesmo."
 *
 * As duas frases juntas dão a regra que este arquivo trava, ponto a ponto:
 *
 *   A LANDING É A CASA DO CLIENTE. Todo ponto de entrada de PARTICIPANTE abre o
 *   overlay e NÃO navega. Todo ponto de acesso PROFISSIONAL (organizador)
 *   continua sendo link para o painel — é outra casa, e converter tiraria do
 *   organizador a porta dele.
 *
 * A prova de "não navega" é sempre a mesma e é falsificável: o controle é um
 * `button` sem `href`, e clicar nele faz aparecer um `role="dialog"`. Se
 * alguém devolver um `<a href>` em qualquer um destes pontos, o caso morre
 * antes do deploy — que é exatamente o defeito que o dono viu em produção.
 *
 * O SDK é mockado; nada sobe Firebase.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

// O primeiro render puxa o barrel do DS — com o teto default de 5s o caso
// inaugural estoura por IMPORT, não por comportamento.
vi.setConfig({ testTimeout: 20_000 });

const loginComEmail = vi.fn();
const getClaims = vi.fn();

vi.mock('@leela/api-client', () => ({
  onSessionChange: (cb: (u: unknown) => void) => {
    cb(null);
    return () => undefined;
  },
  logout: async () => undefined,
  loginComEmail: (...a: unknown[]) => loginComEmail(...a),
  getClaims: (...a: unknown[]) => getClaims(...a),
  enviarVerificacaoEmail: async () => undefined,
  emailValido: (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()),
  mensagemErroLogin: () => 'E-mail ou senha inválidos.',
  verificarCodigoResetSenha: async () => 'ana@exemplo.dev',
  confirmarResetSenha: async () => undefined,
  enviarResetSenha: async () => undefined,
  // FRONTEIRA-AUTH · `senhaAtendeMinimo`/`SENHA_MIN` saíram do mock junto com a
  // dependência: a régua da senha nova agora é a política de `@leela/core`,
  // que NÃO é mockada aqui — é ela mesma que roda, e é por isso que a senha
  // usada abaixo precisa atender de verdade.
  mensagemErroRedefinicao: () => 'Não foi possível redefinir a senha.',
}));

vi.mock('@/lib/leelaClient', () => ({ ensureLeela: () => undefined }));

const ENV_PAINEL = 'NEXT_PUBLIC_PAINEL_URL';
const envOriginal = process.env[ENV_PAINEL];

beforeEach(() => {
  process.env[ENV_PAINEL] = 'https://painel.exemplo.dev';
  window.localStorage.clear();
  loginComEmail.mockReset();
  getClaims.mockReset();
});

afterEach(() => {
  // A suíte da landing roda sem `globals`: o auto-cleanup do RTL não se
  // registra sozinho e o DOM anterior sobreviveria à próxima query.
  cleanup();
  if (envOriginal === undefined) delete process.env[ENV_PAINEL];
  else process.env[ENV_PAINEL] = envOriginal;
});

/**
 * O contrato do ponto CONVERTIDO, num lugar só: é botão (nunca link), e o
 * clique abre o diálogo em vez de trocar de página.
 */
function abreOverlayESemNavegar(abridor: HTMLElement): void {
  expect(abridor.tagName).toBe('BUTTON');
  expect(abridor.getAttribute('href')).toBeNull();
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(abridor);
  const dialogo = screen.getByRole('dialog');
  expect(within(dialogo).getByRole('heading', { name: 'Entrar na Leela' })).not.toBeNull();
}

function porSlot(slot: string): HTMLElement {
  const alvo = document.querySelector(`[data-slot="${slot}"]`);
  if (alvo === null) throw new Error(`ponto de entrada "${slot}" ausente na tela`);
  return alvo as HTMLElement;
}

// ---------------------------------------------------------------------------
// CONVERTIDOS — acesso de cliente
// ---------------------------------------------------------------------------

describe('pontos de entrada do CLIENTE — abrem o overlay, não navegam', () => {
  it('cabeçalho: "Entrar" é botão e abre o diálogo', async () => {
    const { ContaHeader } = await import('@/app/components/ContaHeader');
    render(<ContaHeader />);
    abreOverlayESemNavegar(porSlot('abrir-entrar'));
  });

  it('área do cliente deslogada: "Entrar" é botão e abre o diálogo', async () => {
    const { PortaDeEntrada } = await import('@/app/(public)/minha-conta/EstadosDaArea');
    render(<PortaDeEntrada />);
    const botao = screen.getByRole('button', { name: 'Entrar' });
    abreOverlayESemNavegar(botao);
  });

  it('definir-senha (link já usado): entra na PRÓPRIA tela, sem ir para a home', async () => {
    // A marca de código usado é local — gravá-la direto põe a tela na fase
    // `usado` sem precisar rodar o primeiro acesso inteiro de novo (isso já
    // tem prova própria em definir-senha-s1223).
    const { DefinirSenhaFlow } = await import('@/app/(public)/definir-senha/DefinirSenhaFlow');
    const primeiro = await act(async () =>
      render(<DefinirSenhaFlow oobCode="codigo-para-queimar" />),
    );
    // Percorre o caminho curto: define a senha e volta ao MESMO código.
    await waitFor(() => expect(screen.getByLabelText(/nova senha/i)).not.toBeNull());
    // A senha atende à política da casa (8+, número, caractere especial) —
    // sem isso o botão nem libera e a fase `usado` nunca chega. O especial é
    // `!` de propósito: hífen NÃO está no conjunto do Identity Platform que a
    // política copia, e um fixture com `-` quebraria sem avisar por quê.
    fireEvent.change(screen.getByLabelText(/nova senha/i), { target: { value: 'novasenha9!' } });
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Definir senha' }));
    });
    primeiro.unmount();

    await act(async () => {
      render(<DefinirSenhaFlow oobCode="codigo-para-queimar" />);
    });
    await waitFor(() => expect(screen.getByText(/sua senha já foi definida/i)).not.toBeNull());

    // A saída da tela é ENTRAR, aqui mesmo — não "ir para a página inicial".
    expect(screen.queryByRole('link', { name: /página inicial/i })).toBeNull();
    abreOverlayESemNavegar(porSlot('abrir-entrar-definir-senha'));
  });
});

// ---------------------------------------------------------------------------
// MANTIDOS — acesso profissional (outra casa)
// ---------------------------------------------------------------------------

describe('pontos de acesso PROFISSIONAL — seguem apontando para o painel', () => {
  it('rodapé: a porta do organizador continua link, e diz o nome dela', async () => {
    const { PublicFooter } = await import('@/app/components/PublicFooter');
    render(<PublicFooter />);
    const porta = porSlot('entrar-organizador');
    expect(porta.tagName).toBe('A');
    expect(porta.getAttribute('href')).toBe('https://painel.exemplo.dev/entrar');
    // ⛔ O rótulo NÃO pode voltar a ser o "Entrar" nu do cliente.
    expect(porta.textContent).toContain('organizador');
    expect(screen.queryByRole('link', { name: 'Entrar' })).toBeNull();
  });

  it('cabeçalho: "Criar conta de organizador" não virou overlay', async () => {
    const { PublicHeader } = await import('@/app/components/PublicHeader');
    render(<PublicHeader />);
    const criar = screen.getByRole('link', { name: 'Criar conta de organizador' });
    expect(criar.getAttribute('href')).toBe('https://painel.exemplo.dev/cadastrar');
  });

  it('área do cliente: "Ir para o painel" de quem TAMBÉM organiza segue link', async () => {
    // `tenant_owner` é o papel que `portaDaConta` (RN-449/ADR-008) traduz em
    // "esta conta também organiza" — a regra tem prova própria em
    // minha-conta-portas-s1222; aqui só interessa o DESTINO da porta.
    getClaims.mockResolvedValue({ role: 'tenant_owner', tenantId: 'tenant-1' });
    const { PortasDaConta } = await import('@/app/(public)/minha-conta/PortasDaConta');
    await act(async () => {
      render(<PortasDaConta />);
    });
    await waitFor(() => expect(document.querySelector('[data-slot="ir-para-painel"]')).not.toBeNull());
    const porta = porSlot('ir-para-painel');
    expect(porta.tagName).toBe('A');
    expect(porta.getAttribute('href')).toBe('https://painel.exemplo.dev/entrar');
  });
});
