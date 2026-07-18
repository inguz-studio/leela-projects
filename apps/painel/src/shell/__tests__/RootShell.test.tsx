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

  it('os 7 itens do produtor renderizam com ícone (Analytics suprimido — RN-821)', () => {
    renderAt('/');
    const svgs = nav().querySelectorAll('svg[aria-hidden="true"]');
    // 8 do DS − "analytics" (a Análise de vendas já é a superfície única).
    expect(svgs.length).toBe(7);
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
// Lote FIDELIDADE T3 — toolbar global (busca ⌘K + icon-buttons + Novo evento)
// ---------------------------------------------------------------------------

describe('RootShell (T3 — toolbar global)', () => {
  // Adendo 12 (2026-07-18): busca e "Novo evento" suprimidos do header. A
  // toolbar do produtor fica só com Ajuda + Notificações.
  it('rotas do produtor montam a toolbar só com ajuda e notificações', () => {
    renderAt('/');
    const toolbar = screen.getByRole('toolbar', { name: 'Ferramentas globais' });
    expect(within(toolbar).getByRole('button', { name: 'Ajuda' })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Notificações' })).toBeInTheDocument();
  });

  it('busca do header foi suprimida (Adendo 12)', () => {
    renderAt('/');
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('"Novo evento" foi suprimido do header — criar evento vive em /eventos (Adendo 12)', () => {
    renderAt('/');
    const toolbar = screen.getByRole('toolbar', { name: 'Ferramentas globais' });
    expect(within(toolbar).queryByRole('button', { name: /Novo evento/ })).not.toBeInTheDocument();
  });

  it('/plataforma NÃO tem a toolbar do produtor', () => {
    renderAt('/plataforma/tenants');
    expect(screen.queryByRole('toolbar', { name: 'Ferramentas globais' })).not.toBeInTheDocument();
  });

  it('pip de notificações desligado sem fonte de não-lidas (honestidade)', () => {
    renderAt('/');
    expect(screen.queryByTestId('iconbutton-pip')).not.toBeInTheDocument();
  });
});
