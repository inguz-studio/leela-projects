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

  it('todos os 8 itens do produtor renderizam com ícone', () => {
    renderAt('/');
    const svgs = nav().querySelectorAll('svg[aria-hidden="true"]');
    expect(svgs.length).toBe(8);
  });

  it('rodapé mostra avatar + nome da sessão (B4 — dados do consumidor)', () => {
    renderAt('/');
    const sidebar = nav();
    expect(within(sidebar).getByText('Marina Castelo')).toBeInTheDocument();
    expect(within(sidebar).getByText('Ver perfil')).toBeInTheDocument();
  });

  it('brand slot do consumidor: "LEELA" + "Painel do Organizador" (T2)', () => {
    renderAt('/');
    const sidebar = nav();
    expect(within(sidebar).getByText('LEELA')).toBeInTheDocument();
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
  it('rotas do produtor montam a toolbar: busca, ajuda, notificações, Novo evento', () => {
    renderAt('/');
    const toolbar = screen.getByRole('toolbar', { name: 'Ferramentas globais' });
    expect(within(toolbar).getByRole('searchbox')).toHaveAttribute(
      'placeholder',
      'Buscar atleta, evento, inscrição…'
    );
    expect(within(toolbar).getByRole('button', { name: 'Ajuda' })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Notificações' })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: /Novo evento/ })).toBeInTheDocument();
  });

  it('/plataforma NÃO tem a toolbar do produtor', () => {
    renderAt('/plataforma/tenants');
    expect(screen.queryByRole('toolbar', { name: 'Ferramentas globais' })).not.toBeInTheDocument();
  });

  it('Ctrl+K foca a busca (stub navegável — Enter não navega)', async () => {
    renderAt('/');
    const input = screen.getByRole('searchbox');
    await userEvent.keyboard('{Control>}k{/Control}');
    expect(input).toHaveFocus();
    await userEvent.keyboard('marina{Enter}');
    // Busca real é stub (T3): o pathname não muda.
    expect(screen.getByTestId('path')).toHaveTextContent('/');
  });

  it('"Novo evento" navega para /eventos/novo', async () => {
    renderAt('/');
    await userEvent.click(screen.getByRole('button', { name: /Novo evento/ }));
    expect(screen.getByTestId('path')).toHaveTextContent('/eventos/novo');
  });

  it('pip de notificações desligado sem fonte de não-lidas (honestidade)', () => {
    renderAt('/');
    expect(screen.queryByTestId('iconbutton-pip')).not.toBeInTheDocument();
  });
});
