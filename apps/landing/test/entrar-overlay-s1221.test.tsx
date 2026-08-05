/**
 * entrar-overlay-s1221.test.tsx — LEELA-S1221-T1
 *
 * A entrada da Leela virou overlay no meio da landing. O que trava aqui:
 *
 *   1. o header abre o overlay em vez de navegar para outra origem — se
 *      alguém devolver o `href` do painel, o caso morre;
 *   2. credencial errada e conta inexistente produzem a MESMA frase
 *      (anti-enumeração), e o overlay não oferece nenhum caminho que
 *      distinga os dois;
 *   3. autenticar FECHA o overlay e devolve a pessoa à página — não há
 *      navegação, não há dado de conta em URL;
 *   4. sessão ANÔNIMA (a que o checkout cria) não é sessão de conta: o
 *      header continua oferecendo "Entrar" (RN-451, primeira linha);
 *   5. sessão nomeada troca o slot por conta + "Sair";
 *   6. fechar o overlay descarta a senha digitada.
 *
 * O SDK é mockado — o teste não sobe Firebase.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// O primeiro render puxa o barrel do DS (o mesmo custo que a suíte do checkout
// já paga); com o teto default de 5s o caso inaugural do arquivo estoura por
// IMPORT, não por comportamento.
vi.setConfig({ testTimeout: 20_000 });

type UsuarioFake = {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
} | null;

let usuarioAtual: UsuarioFake = null;
let emitir: (u: UsuarioFake) => void = () => undefined;

const loginComEmail = vi.fn();
const logout = vi.fn(async () => {
  emitir(null);
});
const ensureLeela = vi.fn();

vi.mock('@leela/api-client', () => ({
  onSessionChange: (cb: (u: UsuarioFake) => void) => {
    emitir = (u) => {
      usuarioAtual = u;
      cb(u);
    };
    cb(usuarioAtual);
    return () => undefined;
  },
  loginComEmail: (...a: unknown[]) => loginComEmail(...a),
  logout: (...a: unknown[]) => logout(...(a as [])),
  emailValido: (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim()),
  // A tabela real vive em `@leela/api-client/authMensagens` e tem prova
  // própria no pacote; aqui interessa que a TELA use uma frase só.
  mensagemErroLogin: () => 'E-mail ou senha inválidos.',
}));

vi.mock('@/lib/leelaClient', () => ({ ensureLeela: (...a: unknown[]) => ensureLeela(...a) }));

async function renderConta(): Promise<void> {
  const { ContaHeader } = await import('@/app/components/ContaHeader');
  render(<ContaHeader />);
}

/**
 * O ABRIDOR do overlay. Com o modal aberto existem dois botões "Entrar" no
 * documento (este e o submit do formulário), o que é correto na tela — o modal
 * é `aria-modal` e o header fica inerte atrás dele — mas ambíguo para uma
 * query por papel + nome.
 */
function abridor(): HTMLElement {
  const alvo = document.querySelector('[data-slot="abrir-entrar"]');
  if (alvo === null) throw new Error('abridor do overlay ausente no header');
  return alvo as HTMLElement;
}

function anonimo(): UsuarioFake {
  return {
    uid: 'anon-1',
    email: null,
    displayName: null,
    emailVerified: false,
    isAnonymous: true,
  };
}

function nomeado(): UsuarioFake {
  return {
    uid: 'uid-ana',
    email: 'ana@exemplo.dev',
    displayName: 'Ana Ribeiro',
    emailVerified: true,
    isAnonymous: false,
  };
}

async function abrirOverlay(): Promise<void> {
  fireEvent.click(abridor());
  await waitFor(() => expect(screen.getByRole('dialog')).not.toBeNull());
}

function preencher(email: string, senha: string): void {
  fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/^senha$/i), { target: { value: senha } });
}

beforeEach(() => {
  usuarioAtual = null;
  loginComEmail.mockReset();
  logout.mockClear();
  ensureLeela.mockClear();
});

afterEach(() => {
  // A suíte da landing roda sem `globals`: o auto-cleanup do RTL não se
  // registra sozinho.
  cleanup();
});

describe('S1221-T1 · a entrada acontece na própria página', () => {
  it('"Entrar" é botão e abre o overlay — não navega para outra origem', async () => {
    await renderConta();
    expect(abridor().tagName).toBe('BUTTON');
    expect(abridor().getAttribute('href')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
    await abrirOverlay();
    expect(screen.getByRole('dialog')).not.toBeNull();
  });

  it('autenticar fecha o overlay e a pessoa continua onde estava', async () => {
    loginComEmail.mockImplementation(async () => {
      emitir(nomeado());
      return { user: nomeado() };
    });
    await renderConta();
    await abrirOverlay();
    preencher('ana@exemplo.dev', 'senha-boa');
    await act(async () => {
      fireEvent.submit(screen.getByRole('form', { name: 'Entrar na Leela' }));
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(loginComEmail).toHaveBeenCalledWith('ana@exemplo.dev', 'senha-boa');
  });
});

describe('S1221-T1 · a tela não vira oráculo de quem tem conta', () => {
  it('conta inexistente e senha errada dão a MESMA mensagem', async () => {
    const mensagens: string[] = [];
    for (const codigo of ['auth/user-not-found', 'auth/wrong-password']) {
      loginComEmail.mockRejectedValueOnce(Object.assign(new Error('x'), { code: codigo }));
      await renderConta();
      await abrirOverlay();
      preencher('quem@exemplo.dev', 'seja-la');
      await act(async () => {
        fireEvent.submit(screen.getByRole('form', { name: 'Entrar na Leela' }));
      });
      await waitFor(() => expect(screen.getByRole('alert')).not.toBeNull());
      mensagens.push(screen.getByRole('alert').textContent ?? '');
      cleanup();
    }
    expect(mensagens[0]).toBe(mensagens[1]);
    expect(mensagens[0]).not.toContain('não encontrada');
  });

  it('o overlay não expõe o e-mail digitado em nenhum atributo de URL', async () => {
    await renderConta();
    await abrirOverlay();
    preencher('ana@exemplo.dev', 'x');
    const comHref = Array.from(document.querySelectorAll('[href]')).map((n) =>
      n.getAttribute('href'),
    );
    expect(comHref.some((h) => (h ?? '').includes('ana@exemplo.dev'))).toBe(false);
  });
});

describe('S1221-T1 · sessão anônima não é sessão de conta (RN-451)', () => {
  it('com uid anônimo do checkout o header continua oferecendo Entrar', async () => {
    usuarioAtual = anonimo();
    await renderConta();
    expect(abridor()).not.toBeNull();
    expect(screen.queryByText('Ana')).toBeNull();
  });

  it('sessão nomeada troca o slot por conta e Sair', async () => {
    usuarioAtual = nomeado();
    await renderConta();
    expect(document.querySelector('[data-slot="abrir-entrar"]')).toBeNull();
    expect(screen.getByText('Ana')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }));
    expect(logout).toHaveBeenCalled();
  });
});

// ⚔ REV-AREACLIENTE — os dois buracos de NAVEGAÇÃO da área do cliente. Os dois
// são invisíveis para quem lê o diff de cada task isolada: a área foi
// construída inteira, o CTA do checkout aponta para ela e o fim do
// `/definir-senha` também — mas quem simplesmente VOLTA ao site no dia seguinte
// não tinha porta, e quem não sabe a senha não tinha saída.
describe('⚔ REV-AREACLIENTE · a área do cliente é alcançável e a entrada tem saída', () => {
  it('sessão nomeada: o rótulo da conta LEVA à área do cliente', async () => {
    const { ROTA_AREA_CLIENTE } = await import('@/lib/areaDoCliente');
    usuarioAtual = nomeado();
    await renderConta();
    const rotulo = document.querySelector('[data-slot="conta-rotulo"]');
    expect(rotulo).not.toBeNull();
    // Um `<span>` aqui é o defeito: a área existiria sem caminho até ela para
    // quem já está logado e não acabou de comprar.
    expect((rotulo as HTMLElement).tagName).toBe('A');
    expect((rotulo as HTMLAnchorElement).getAttribute('href')).toBe(ROTA_AREA_CLIENTE);
  });

  it('o destino sai da MESMA trava das outras jornadas, e não de uma rota escrita à mão', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const fonte = readFileSync(
      resolve(__dirname, '../app/components/ContaHeader.tsx'),
      'utf8',
    );
    // Se `AREA_CLIENTE_NO_AR` voltar a `false`, o rótulo tem de voltar a ser
    // texto junto com o CTA do checkout e o fim do `/definir-senha` — três
    // jornadas, uma decisão.
    expect(fonte).toContain('ctaMeusPedidos()');
    expect(fonte).not.toContain("'/minha-conta'");
    expect(fonte).not.toContain('"/minha-conta"');
  });

  it('o overlay oferece caminho para quem NÃO sabe a senha', async () => {
    // A conta do comprador nasce SEM senha (`contaSemFriccao`) e o link vai por
    // e-mail. Quando o e-mail falha — o incidente de 04/08 — esta é a única
    // porta que resta, e sem este link ela é parede.
    await renderConta();
    await abrirOverlay();
    const saida = document.querySelector('[data-slot="esqueci-minha-senha"]');
    expect(saida).not.toBeNull();
    expect((saida as HTMLAnchorElement).getAttribute('href')).toBe('/definir-senha');
    // E ela vive DENTRO do modal — quem está com o foco preso no diálogo tem
    // de alcançá-la sem fechar nada.
    expect(screen.getByRole('dialog').contains(saida)).toBe(true);
  });
});

describe('S1221-T1 · a credencial não sobrevive ao fechamento', () => {
  it('fechar e reabrir o overlay devolve o campo de senha vazio', async () => {
    await renderConta();
    await abrirOverlay();
    preencher('ana@exemplo.dev', 'segredo');
    expect((screen.getByLabelText(/^senha$/i) as HTMLInputElement).value).toBe('segredo');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await abrirOverlay();
    expect((screen.getByLabelText(/^senha$/i) as HTMLInputElement).value).toBe('');
  });
});
