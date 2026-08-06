// =============================================================================
// "Ao tentar clicar em qualquer botão, ou aba de menu, sobe o aviso"
// (ONBOARD-VITRINE · RN-510) — a ordem do dono medida no painel REAL.
//
// Por que no `App` inteiro e não no gate isolado: a "aba de menu" da fala do
// dono é desenhada pelo `RootShell`, que fica ACIMA do gate. Um teste que
// montasse só o gate provaria a captura num lugar onde o gesto do dono não
// acontece — e passaria verde com o menu inteiro mudo.
//
// O caso do TECLADO tem arquivo próprio de propósito (é vetor declarado para a
// review): navegar por Tab e apertar Enter num item de menu é o mesmo gesto de
// quem não usa mouse, e um `onClick` sozinho não o cobriria em todo widget.
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, cleanup, within } from '@testing-library/react';
import { CONTATO_ONBOARDING_PADRAO } from '@leela/core';
import { usuario } from '@/test/usuario';

vi.mock('../../../lib/firebase', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isModoEmulador: () => false,
  initFirebase: () => undefined,
}));

vi.mock('@leela/api-client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  const espelho: Record<string, unknown> = {};
  for (const [nome, valor] of Object.entries(original)) {
    espelho[nome] = typeof valor === 'function' ? () => undefined : valor;
  }
  return {
    ...espelho,
    onSessionChange: (cb: (u: { uid: string } | null) => void) => {
      cb({ uid: 'u-vitrine' });
      return () => {};
    },
    getClaims: async () => ({}),
    getLeelaDb: () => ({}),
    getLeelaFunctions: () => ({}),
    getContatoOnboarding: async () => CONTATO_ONBOARDING_PADRAO,
  };
});

const { App } = await import('../../../App');

/** Monta o painel na vitrine, já com o crachá resolvido. */
async function abrirVitrine(url = '/'): Promise<void> {
  window.history.pushState({}, '', url);
  render(<App />);
  await act(async () => {
    await Promise.resolve();
  });
}

/** O item do menu lateral, que é o gesto que o dono descreveu. */
function itemDeMenu(nome: RegExp): HTMLElement {
  const nav = screen.getByRole('navigation', { name: /Navegação principal/i });
  return within(nav).getByRole('link', { name: nome });
}

function avisoNaTela(): HTMLElement | null {
  return screen.queryByRole('heading', { name: /Boas-vindas à Leela/i });
}

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('vitrine · o aviso sobe na primeira interação (RN-510)', () => {
  it('a pessoa entra e o aviso NÃO está na cara dela', async () => {
    // A parede antiga aparecia antes de qualquer gesto. A ordem do dono é o
    // contrário: primeiro ela entra e vê a plataforma.
    await abrirVitrine();
    expect(avisoNaTela()).toBeNull();
    expect(screen.getByText(/Esta área abre com o código Leela/i)).toBeInTheDocument();
  });

  it('clicar numa aba de menu sobe o aviso', async () => {
    await abrirVitrine();
    await usuario().click(itemDeMenu(/Eventos/i));
    expect(avisoNaTela()).toBeInTheDocument();
  });

  it('clicar num botão da tela sobe o aviso', async () => {
    await abrirVitrine();
    await usuario().click(screen.getByRole('button', { name: /Como receber o código Leela/i }));
    expect(avisoNaTela()).toBeInTheDocument();
  });

  it('o EQUIVALENTE POR TECLADO sobe o aviso (Enter no item de menu)', async () => {
    await abrirVitrine();
    const user = usuario();
    itemDeMenu(/Clubs/i).focus();
    await user.keyboard('{Enter}');
    expect(avisoNaTela()).toBeInTheDocument();
  });

  it('barra de espaço num botão também conta', async () => {
    await abrirVitrine();
    const user = usuario();
    screen.getByRole('button', { name: /Como receber o código Leela/i }).focus();
    await user.keyboard(' ');
    expect(avisoNaTela()).toBeInTheDocument();
  });

  it('clicar no vazio da moldura não sobe nada', async () => {
    // Só gesto sobre algo acionável conta. Clicar num parágrafo não é tentar
    // usar o painel, e trazer o aviso ali seria ruído.
    await abrirVitrine();
    await usuario().click(screen.getByText(/Esta área abre com o código Leela/i));
    expect(avisoNaTela()).toBeNull();
  });
});

describe('vitrine · o aviso fecha e REARMA (RN-510)', () => {
  it('fecha por botão e volta na interação seguinte', async () => {
    // Rearmar é o que impede o beco: sem isso, a pessoa fecharia o aviso e
    // passaria a clicar em botões inertes no silêncio.
    await abrirVitrine();
    const user = usuario();
    await user.click(itemDeMenu(/Eventos/i));
    expect(avisoNaTela()).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Continuar olhando/i }));
    expect(avisoNaTela()).toBeNull();

    await user.click(itemDeMenu(/CRM/i));
    expect(avisoNaTela()).toBeInTheDocument();
  });

  it('Esc fecha o aviso e devolve a vitrine', async () => {
    await abrirVitrine();
    const user = usuario();
    await user.click(itemDeMenu(/Marcas/i));
    expect(avisoNaTela()).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(avisoNaTela()).toBeNull();
    expect(screen.getByText(/Esta área abre com o código Leela/i)).toBeInTheDocument();
  });

  it('interagir DENTRO do aviso não o reabre nem o multiplica', async () => {
    await abrirVitrine();
    const user = usuario();
    await user.click(itemDeMenu(/Eventos/i));
    // A busca é ANCORADA no aviso de propósito. No painel inteiro o nome
    // "código Leela" aparece duas vezes por acessibilidade: no campo do aviso e
    // no `EmptyState` da vitrine por baixo, que o DS anuncia com
    // `role="status"` e `aria-label`. Uma busca solta acha as duas e falha —
    // foi o que a suíte desta lane pegou ao rodar do zero.
    const aviso = screen.getByRole('dialog');
    await user.type(within(aviso).getByLabelText(/código Leela/i), 'AB23');
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });
});

describe('vitrine · o menu continua navegando por baixo do aviso', () => {
  it('o endereço muda e o conteúdo acompanha depois de fechar', async () => {
    await abrirVitrine();
    const user = usuario();
    await user.click(itemDeMenu(/Marcas/i));
    expect(window.location.pathname).toBe('/marcas');

    await user.click(screen.getByRole('button', { name: /Continuar olhando/i }));
    expect(screen.getByRole('heading', { name: /^Marcas$/i })).toBeInTheDocument();
  });
});
