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

// ⚔ FIX-OVERLAY-LOGIN (04/08, defeito reportado pelo DONO em produção) — o
// overlay abria colado no topo, cortado ao meio e sem cortina. Nada no
// comportamento estava errado: o `fixed inset-0` do diálogo resolvia contra a
// caixa do `<header>` (1920×64) em vez da viewport, porque `backdrop-filter`
// cria bloco de contenção para descendentes `position: fixed` — a mesma regra
// de `transform`/`filter`/`perspective`/`will-change`/`contain`.
//
// POR QUE A SUÍTE NÃO PEGOU: jsdom não calcula layout, então nenhum teste de
// posição encontraria isto — e, pior, os casos acima renderizam o `ContaHeader`
// SOZINHO, fora do header que o contém na página real. O defeito só existe na
// composição. Por isso os casos abaixo (a) montam o slot dentro de uma réplica
// do header e (b) provam que a réplica é fiel lendo a fonte do `PublicHeader`.
// A asserção é ESTRUTURAL (quem é pai de quem), não visual — é o que sobrevive
// à ausência de layout no jsdom.
describe('⚔ FIX-OVERLAY-LOGIN · o overlay não pode nascer preso ao header', () => {
  // Classes que criam bloco de contenção para `position: fixed`. Um ancestral
  // com qualquer uma delas rouba o overlay da viewport.
  const CLASSES_QUE_PRENDEM_FIXED = [
    'backdrop-blur',
    'backdrop-filter',
    'filter',
    'transform',
    'perspective',
    'will-change',
    'contain-',
  ];

  function ancestralQuePrende(no: Element): HTMLElement | null {
    let atual = no.parentElement;
    while (atual !== null) {
      const classes = atual.getAttribute('class') ?? '';
      if (CLASSES_QUE_PRENDEM_FIXED.some((c) => classes.includes(c))) return atual;
      atual = atual.parentElement;
    }
    return null;
  }

  /** Réplica do `PublicHeader` real — fidelidade provada pelo caso seguinte. */
  async function renderNoHeader(): Promise<HTMLElement> {
    const { ContaHeader } = await import('@/app/components/ContaHeader');
    const { container } = render(
      <header data-shell-publico className="sticky top-0 z-40 bg-surface-base/90 backdrop-blur">
        <div className="flex h-16 items-center justify-between">
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Ações">
            <ContaHeader />
          </nav>
        </div>
      </header>,
    );
    return container.querySelector('header') as HTMLElement;
  }

  it('aberto de dentro do header, o diálogo é filho do BODY — não do header', async () => {
    const header = await renderNoHeader();
    await abrirOverlay();
    const dialog = screen.getByRole('dialog');
    // O defeito em produção: o diálogo vivia dentro do `<nav>` do header.
    expect(header.contains(dialog)).toBe(false);
    expect(dialog.parentElement).toBe(document.body);
  });

  it('nenhum ancestral do diálogo cria bloco de contenção para `fixed`', async () => {
    await renderNoHeader();
    await abrirOverlay();
    const culpado = ancestralQuePrende(screen.getByRole('dialog'));
    // A mensagem entrega o ancestral culpado — o próximo a quebrar isto não
    // precisa medir nada no navegador para saber quem foi.
    expect(
      culpado === null ? null : `${culpado.tagName}.${culpado.getAttribute('class') ?? ''}`,
    ).toBeNull();
  });

  it('a réplica do header é fiel: o header REAL filtra e contém o slot de conta', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');
    const fonte = readFileSync(resolve(__dirname, '../app/components/PublicHeader.tsx'), 'utf8');
    // Se qualquer uma destas três deixar de valer, os dois casos acima viram
    // teatro: ou o header parou de filtrar, ou o slot saiu de dentro dele.
    expect(fonte).toContain('backdrop-blur');
    expect(fonte).toContain('sticky top-0 z-40');
    expect(fonte).toContain('<ContaHeader />');
  });

  it('o diálogo fica ACIMA do header (z-40) e da barra fixa de inscrição (z-40)', async () => {
    await renderNoHeader();
    await abrirOverlay();
    // No body os três disputam no contexto raiz; preso no header, o z-50 do
    // diálogo ficava capado dentro do z-40 dele e a barra do rodapé pintava
    // por cima. Asserção de classe, não de layout — jsdom não pinta.
    expect(screen.getByRole('dialog').getAttribute('class')).toContain('z-50');
  });

  it('Esc, clique fora e retorno de foco ao abridor sobrevivem ao portal', async () => {
    await renderNoHeader();
    const botao = abridor();
    botao.focus();
    await abrirOverlay();
    const dialog = screen.getByRole('dialog');

    // Clique na cortina (1ª via) — ela é o primeiro filho do container.
    fireEvent.click(dialog.firstElementChild as HTMLElement);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(botao);

    // Esc (2ª via) + retorno de foco, agora com o diálogo fora da árvore do
    // header: o `returnFocusRef` aponta para um nó que continua no header.
    await abrirOverlay();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.activeElement).toBe(botao);
  });

  it('a trava de rolagem do fundo continua valendo com o portal', async () => {
    await renderNoHeader();
    await abrirOverlay();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(document.body.style.overflow).toBe('');
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

describe('a marca dentro do modal (pedido do dono · 04/08)', () => {
  it('o wordmark é o MESMO asset do header, e é decorativo', async () => {
    await renderConta();
    await abrirOverlay();
    const dialogo = screen.getByRole('dialog');
    const marca = dialogo.querySelector<HTMLImageElement>('[data-slot="brand-logo"]');
    if (marca === null) throw new Error('wordmark ausente no modal de entrada');
    // Mesmo arquivo do PublicHeader — nenhuma variante nova de logo.
    expect(marca.getAttribute('src')).toBe('/leela-logo-brasa.svg');
    // Decorativa: o nome acessível do diálogo já diz "Entrar na Leela", então
    // um alt com a marca faria o leitor de tela repetir o nome duas vezes.
    expect(marca.getAttribute('alt')).toBe('');
    expect(marca.getAttribute('aria-hidden')).toBe('true');
    // Altura pela escala do DS — px cru aqui reprovaria no lint de tokens.
    expect(marca.className).toContain('h-8');
    expect(marca.className).not.toMatch(/\[\d+px\]/);
  });

  it('a marca não vira um segundo nome acessível do diálogo', async () => {
    await renderConta();
    await abrirOverlay();
    // Só UM elemento anuncia "Leela" como nome: o heading do título.
    expect(screen.getAllByRole('heading', { name: 'Entrar na Leela' })).toHaveLength(1);
    expect(screen.queryByRole('img', { name: /leela/i })).toBeNull();
  });
});
