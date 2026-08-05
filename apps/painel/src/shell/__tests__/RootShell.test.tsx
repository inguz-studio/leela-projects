import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RootShell } from '../RootShell';
import { _resetEventosBadgeCache } from '../eventosBadge';

// Sessão do rodapé (B4) + fonte do nav-badge (T2): usuário nomeado, claims com
// tenant e 2 eventos ativos + 1 encerrado — sem Firebase real.
vi.mock('@leela/api-client', () => ({
  onSessionChange: (cb: (user: { uid: string; displayName: string | null } | null) => void) => {
    cb({ uid: 'uid-marina', displayName: 'Marina Castelo' });
    return () => {};
  },
  getClaims: () => Promise.resolve({ tenantId: 'castelo', role: 'tenant_admin' }),
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

describe('RootShell (Lote B3 — shell raiz)', () => {
  it('monta a sidebar do produtor na Visão Geral com o item ativo', () => {
    renderAt('/');
    const ativo = within(nav()).getByText('Visão Geral').closest('a,button');
    expect(ativo).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('main')).toContainElement(screen.getByTestId('path'));
  });

  it('/eventos tem sidebar (bug do diagnóstico corrigido) com "Eventos" ativo', () => {
    renderAt('/eventos');
    const ativo = within(nav()).getByText('Eventos').closest('a,button');
    expect(ativo).toHaveAttribute('aria-current', 'page');
  });

  it('tela interna de evento mantém "Eventos" ativo', () => {
    renderAt('/eventos/corrida-do-campeche/inscritos');
    const ativo = within(nav()).getByText('Eventos').closest('a,button');
    expect(ativo).toHaveAttribute('aria-current', 'page');
  });

  it('/clubes tem sidebar com "Clubs" ativo', () => {
    renderAt('/clubes/trail-club/membros');
    const ativo = within(nav()).getByText('Clubs').closest('a,button');
    expect(ativo).toHaveAttribute('aria-current', 'page');
  });

  it('/plataforma monta a nav própria do super-admin (Tenants ativo, Billing "em breve")', () => {
    renderAt('/plataforma/tenants');
    const sidebar = nav();
    const ativo = within(sidebar).getByText('Tenants').closest('a,button');
    expect(ativo).toHaveAttribute('aria-current', 'page');
    expect(within(sidebar).getByText('em breve')).toBeInTheDocument();
    expect(within(sidebar).queryByText('Visão Geral')).not.toBeInTheDocument();
  });

  it('navegar pela sidebar troca só o conteúdo — a sidebar permanece', async () => {
    renderAt('/');
    await userEvent.click(within(nav()).getByText('Eventos'));
    expect(screen.getByTestId('path')).toHaveTextContent('/eventos');
    expect(nav()).toBeInTheDocument();
    const ativo = within(nav()).getByText('Eventos').closest('a,button');
    expect(ativo).toHaveAttribute('aria-current', 'page');
  });

  it('os 6 itens do produtor renderizam com ícone (RN-233 · menu de 6 áreas)', () => {
    renderAt('/');
    const svgs = nav().querySelectorAll('svg[aria-hidden="true"]');
    // 6 itens do DS: Visão Geral · Eventos · Clubs · CRM · Marcas · Configurações.
    expect(svgs.length).toBe(6);
  });

  it('RN-233: a nav mostra CRM e não mostra mais Financeiro nem Analytics', () => {
    renderAt('/');
    const sidebar = nav();
    expect(within(sidebar).getByText('CRM')).toBeInTheDocument();
    expect(within(sidebar).queryByText('Financeiro')).not.toBeInTheDocument();
    expect(within(sidebar).queryByText('Analytics')).not.toBeInTheDocument();
  });

  it('rodapé mostra avatar + nome da sessão (B4 — dados do consumidor)', () => {
    renderAt('/');
    const sidebar = nav();
    expect(within(sidebar).getByText('Marina Castelo')).toBeInTheDocument();
    expect(within(sidebar).getByText('Ver perfil')).toBeInTheDocument();
  });

  it('brand slot do consumidor: wordmark Leela + "Painel do Organizador" (T2)', () => {
    renderAt('/');
    const sidebar = nav();
    const logo = within(sidebar).getByRole('img', { name: 'Leela' });
    expect(logo).toHaveAttribute('src', '/leela-logo-brasa.svg');
    expect(within(sidebar).getByText('Painel do Organizador')).toBeInTheDocument();
  });

  it('nav-badge de Eventos com contagem REAL de ativos (2 de 3 — encerrado fora)', async () => {
    renderAt('/');
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
