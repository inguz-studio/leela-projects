import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RootShell } from '../RootShell';
import { _resetEventosBadgeCache } from '../eventosBadge';

// Sessão do rodapé (B4) + fonte do nav-badge (T2): usuário nomeado, claims com
// tenant e 2 eventos ativos + 1 encerrado — sem Firebase real.
//
// O crachá virou VARIÁVEL (FRONTEIRA-AUTH) porque o shell passou a desenhar o
// alternador de painéis a partir dele. O default é o de sempre: uma conta de
// organizador, que não alterna nada — os casos existentes não mudam de resposta.
const cracha = vi.hoisted(() => ({
  atual: { tenantId: 'castelo', role: 'tenant_admin' } as Record<string, unknown>,
}));

vi.mock('@leela/api-client', () => ({
  onSessionChange: (cb: (user: { uid: string; displayName: string | null } | null) => void) => {
    cb({ uid: 'uid-marina', displayName: 'Marina Castelo' });
    return () => {};
  },
  getClaims: () => Promise.resolve(cracha.atual),
  getLeelaDb: () => ({}),
  listarEventosDoOrganizador: () =>
    Promise.resolve([
      { status: 'publicado' },
      { status: 'rascunho' },
      { status: 'encerrado' },
    ]),
}));

beforeEach(() => {
  _resetEventosBadgeCache();
  cracha.atual = { tenantId: 'castelo', role: 'tenant_admin' };
});

// Smoke navegacional do Lote B3: a sidebar é SEMPRE visível (item 18 do DoD),
// só o conteúdo troca; item ativo segue o pathname nas 4 áreas.

function Probe(): JSX.Element {
  const location = useLocation();
  return <div data-testid="path">{location.pathname}</div>;
}

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <RootShell>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </RootShell>
    </MemoryRouter>
  );
}

function nav(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Navegação principal' });
}

// HIFI-REC: >= lg a navegação é o SidebarRail do protótipo — nasce FECHADO
// (84px, rótulos em sr-only, badges/rodapé/alternador só abertos). Abrir o
// rail é parte do fluxo real do usuário; os casos que dependem da anatomia
// aberta fazem exatamente isso.
async function abrirRail(): Promise<void> {
  await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
}

describe('RootShell (Lote B3 — shell raiz)', () => {
  it('monta a sidebar do produtor na Visão Geral com o item ativo', () => {
    renderAt('/');
    const ativo = within(nav()).getByRole('link', { name: 'Visão Geral' });
    expect(ativo).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('main')).toContainElement(screen.getByTestId('path'));
  });

  it('/eventos tem sidebar (bug do diagnóstico corrigido) com "Eventos" ativo', () => {
    renderAt('/eventos');
    const ativo = within(nav()).getByRole('link', { name: 'Eventos' });
    expect(ativo).toHaveAttribute('aria-current', 'page');
  });

  it('tela interna de evento mantém "Eventos" ativo', () => {
    renderAt('/eventos/corrida-do-campeche/inscritos');
    const ativo = within(nav()).getByRole('link', { name: 'Eventos' });
    expect(ativo).toHaveAttribute('aria-current', 'page');
  });

  it('/clubes tem sidebar com "Clubs" ativo', () => {
    renderAt('/clubes/trail-club/membros');
    const ativo = within(nav()).getByRole('link', { name: 'Clubs' });
    expect(ativo).toHaveAttribute('aria-current', 'page');
  });

  it('/plataforma monta a nav própria do super-admin (Tenants ativo, Billing "em breve")', async () => {
    renderAt('/plataforma/tenants');
    const ativo = within(nav()).getByRole('link', { name: 'Tenants' });
    expect(ativo).toHaveAttribute('aria-current', 'page');
    // Badge é anatomia do rail ABERTO (protótipo: display none fechado).
    await abrirRail();
    expect(within(nav()).getByText('em breve')).toBeInTheDocument();
    expect(within(nav()).queryByRole('link', { name: 'Visão Geral' })).not.toBeInTheDocument();
  });

  it('navegar pela sidebar troca só o conteúdo — a sidebar permanece', async () => {
    renderAt('/');
    await userEvent.click(within(nav()).getByRole('link', { name: 'Eventos' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/eventos');
    expect(nav()).toBeInTheDocument();
    const ativo = within(nav()).getByRole('link', { name: 'Eventos' });
    expect(ativo).toHaveAttribute('aria-current', 'page');
  });

  it('os 6 itens do produtor renderizam com ícone (RN-233 · menu de 6 áreas)', () => {
    renderAt('/');
    // 6 itens do DS: Visão Geral · Eventos · Clubs · CRM · Marcas · Configurações.
    const itens = within(nav()).getAllByRole('link');
    expect(itens).toHaveLength(6);
    for (const item of itens) {
      expect(item.querySelector('svg')).not.toBeNull();
    }
  });

  it('RN-233: a nav mostra CRM e não mostra mais Financeiro nem Analytics', () => {
    renderAt('/');
    const sidebar = nav();
    expect(within(sidebar).getByRole('link', { name: 'CRM' })).toBeInTheDocument();
    expect(within(sidebar).queryByRole('link', { name: 'Financeiro' })).not.toBeInTheDocument();
    expect(within(sidebar).queryByRole('link', { name: 'Analytics' })).not.toBeInTheDocument();
  });

  it('rodapé mostra avatar + nome da sessão (B4 — dados do consumidor)', async () => {
    renderAt('/');
    // Fechado: só as iniciais (anatomia do protótipo). Aberto: nome + link.
    expect(within(nav()).getByText('MC')).toBeInTheDocument();
    await abrirRail();
    expect(within(nav()).getByText('Marina Castelo')).toBeInTheDocument();
    expect(within(nav()).getByText('Ver perfil')).toBeInTheDocument();
  });

  it('marca no rail: wordmark Leela + "Painel do Organizador" no rail aberto (T2)', async () => {
    renderAt('/');
    // Fechado o wordmark está em crossfade oculto (aria-hidden) — a marca
    // acessível é a do rail ABERTO, junto com o rótulo de contexto
    // (conquista PAPEL-DUPLO: a moldura NOMEIA o painel).
    await abrirRail();
    const logo = within(nav()).getByRole('img', { name: 'Leela' });
    expect(logo).toHaveAttribute('src', '/leela-logo-brasa.svg');
    expect(within(nav()).getByText('Painel do Organizador')).toBeInTheDocument();
  });

  it('nav-badge de Eventos com contagem REAL de ativos (2 de 3 — encerrado fora)', async () => {
    renderAt('/');
    await abrirRail();
    await waitFor(() => {
      expect(within(nav()).getByText('2')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Adendo 13 (ordem do Vitor, 2026-08-05) — a barra superior saiu do sistema
// inteiro. Estes casos são CANÁRIO: se alguém remontar a headbar no shell sem
// decisão nova, a suíte acusa aqui. O Adendo 12 já tinha suprimido a busca e o
// "Novo evento"; o que restou foram dois stubs sem destino (Ajuda e
// Notificações), e a barra saiu junto com eles.
// ---------------------------------------------------------------------------

describe('RootShell (Adendo 13 — sem barra superior)', () => {
  it('rotas do produtor NÃO montam barra superior alguma', () => {
    renderAt('/');
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('os stubs Ajuda e Notificações saíram do shell', () => {
    renderAt('/');
    expect(screen.queryByRole('button', { name: 'Ajuda' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Notificações' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('iconbutton-pip')).not.toBeInTheDocument();
  });

  it('busca do header segue suprimida (Adendo 12)', () => {
    renderAt('/');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('"Novo evento" não volta pelo shell — criar evento vive em /eventos', () => {
    renderAt('/');
    expect(screen.queryByRole('button', { name: /Novo evento/ })).not.toBeInTheDocument();
  });

  it('/plataforma segue sem barra superior', () => {
    renderAt('/plataforma/tenants');
    expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
  });

  it('o conteúdo da rota é o PRIMEIRO filho da área de rolagem (nada acima dele)', () => {
    renderAt('/');
    const scroller = screen.getByTestId('path').parentElement;
    expect(scroller).not.toBeNull();
    expect(scroller?.firstElementChild).toBe(screen.getByTestId('path'));
  });
});

// =============================================================================
// O ALTERNADOR DE PAINÉIS na moldura (FRONTEIRA-AUTH · sobre a PAPEL-DUPLO).
//
// A fiação é o que estes casos provam: o componente já tem suíte própria, o que
// falta é a prova de que o shell o desenha para o crachá certo e de que o
// rótulo de contexto deixou de mentir.
// =============================================================================

describe('RootShell · alternador de painéis', () => {
  it('conta de organizador NÃO vê alternador — ela só tem um painel', async () => {
    renderAt('/');
    await abrirRail();
    await waitFor(() => expect(screen.getByText('Painel do Organizador')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Ir para o Painel/ })).toBeNull();
  });

  it('o DONO (tenant_owner + capacidade) vê o alternador oferecendo o master', async () => {
    cracha.atual = {
      tenantId: 'castelo-producoes',
      role: 'tenant_owner',
      platformAdmin: true,
    };
    renderAt('/');
    await abrirRail();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Ir para o Painel Master' })).toBeInTheDocument(),
    );
  });

  it('dentro do master, a moldura NOMEIA o master e oferece a volta', async () => {
    // O sub da marca era o literal "Painel do Organizador" em TODA rota — e
    // `/plataforma` sempre rodou dentro deste shell. Quem entrasse no painel
    // master lia, no canto superior esquerdo, que estava no painel do
    // organizador.
    cracha.atual = {
      tenantId: 'castelo-producoes',
      role: 'tenant_owner',
      platformAdmin: true,
    };
    renderAt('/plataforma/tenants');
    await abrirRail();
    await waitFor(() => expect(screen.getByText('Painel Master')).toBeInTheDocument());
    expect(
      screen.getByRole('button', { name: 'Ir para o Painel do Organizador' }),
    ).toBeInTheDocument();
  });

  it('o alternador leva de verdade para o outro painel', async () => {
    cracha.atual = {
      tenantId: 'castelo-producoes',
      role: 'tenant_owner',
      platformAdmin: true,
    };
    const usuario = userEvent.setup();
    renderAt('/');
    await abrirRail();
    const alternar = await screen.findByRole('button', { name: 'Ir para o Painel Master' });
    await usuario.click(alternar);
    expect(screen.getByTestId('path')).toHaveTextContent('/plataforma');
  });

  it('admin LEGADO (sem tenant) não alterna — não há painel de organizador para ir', async () => {
    cracha.atual = { role: 'platform_admin' };
    renderAt('/plataforma');
    await abrirRail();
    await waitFor(() => expect(screen.getByText('Painel Master')).toBeInTheDocument());
    expect(screen.queryByRole('button', { name: /Ir para o Painel/ })).toBeNull();
  });
});
