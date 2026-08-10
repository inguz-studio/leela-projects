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
// O POPOVER DO PERFIL na moldura (DELTA-UX-T4 · D-1008-R6, sobre a
// FRONTEIRA-AUTH/PAPEL-DUPLO).
//
// O alternador SAIU do corpo do rail aberto e virou item do menu do perfil —
// o rodapé com o nome + "Ver perfil" é o trigger (button com aria-haspopup,
// nome acessível SEMPRE, rail fechado E aberto — a dívida F5 morre aqui). O
// que estes casos provam é a fiação: o shell desenha a travessia para o
// crachá certo, com os rótulos NOVOS ("Acessar painel master"/"Acessar
// painel profissional", RN-468), e Configurações vive no menu E no rail.
// =============================================================================

/** Abre o popover do perfil pelo trigger do rodapé — SEM abrir o rail antes:
 *  o ponto da T4 é a travessia alcançável com o rail fechado. */
async function abrirMenuDoPerfil(): Promise<void> {
  await userEvent.click(await screen.findByRole('button', { name: 'Marina Castelo' }));
}

describe('RootShell · popover do perfil (Configurações + alternador)', () => {
  it('o rodapé fechado é trigger nomeado: aria-haspopup + aria-expanded (F5 morta)', async () => {
    renderAt('/');
    const trigger = await screen.findByRole('button', { name: 'Marina Castelo' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('conta de organizador: menu só com Configurações — ela só tem um painel', async () => {
    renderAt('/');
    await abrirMenuDoPerfil();
    const menu = screen.getByRole('menu', { name: 'Menu do perfil' });
    expect(within(menu).getByRole('menuitem', { name: 'Configurações' })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: /Acessar painel/ })).toBeNull();
  });

  it('Configurações do menu leva a /conta (o item do rail CONTINUA existindo)', async () => {
    renderAt('/');
    // Default do maestro registrado: o popover soma um caminho — o item
    // Configurações do rail não sai.
    expect(within(nav()).getByRole('link', { name: 'Configurações' })).toBeInTheDocument();
    await abrirMenuDoPerfil();
    await userEvent.click(screen.getByRole('menuitem', { name: 'Configurações' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/conta');
  });

  it('o DONO (tenant_owner + capacidade) vê "Acessar painel master" no menu', async () => {
    cracha.atual = {
      tenantId: 'castelo-producoes',
      role: 'tenant_owner',
      platformAdmin: true,
    };
    renderAt('/');
    await abrirMenuDoPerfil();
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Acessar painel master' })).toBeInTheDocument(),
    );
  });

  it('dentro do master, a moldura NOMEIA o master e o menu oferece a volta', async () => {
    cracha.atual = {
      tenantId: 'castelo-producoes',
      role: 'tenant_owner',
      platformAdmin: true,
    };
    renderAt('/plataforma/tenants');
    await abrirRail();
    await waitFor(() => expect(screen.getByText('Painel Master')).toBeInTheDocument());
    await abrirMenuDoPerfil();
    expect(
      screen.getByRole('menuitem', { name: 'Acessar painel profissional' }),
    ).toBeInTheDocument();
  });

  it('a travessia leva de verdade para o outro painel', async () => {
    cracha.atual = {
      tenantId: 'castelo-producoes',
      role: 'tenant_owner',
      platformAdmin: true,
    };
    renderAt('/');
    await abrirMenuDoPerfil();
    const alternar = await screen.findByRole('menuitem', { name: 'Acessar painel master' });
    await userEvent.click(alternar);
    expect(screen.getByTestId('path')).toHaveTextContent('/plataforma');
  });

  it('admin LEGADO (sem tenant) não vê travessia — não há painel profissional para ir', async () => {
    cracha.atual = { role: 'platform_admin' };
    renderAt('/plataforma');
    await abrirMenuDoPerfil();
    const menu = screen.getByRole('menu', { name: 'Menu do perfil' });
    expect(within(menu).queryByRole('menuitem', { name: /Acessar painel/ })).toBeNull();
  });

  it('os rótulos ANTIGOS morreram na moldura (grep vivo da D-1008-R6)', async () => {
    cracha.atual = {
      tenantId: 'castelo-producoes',
      role: 'tenant_owner',
      platformAdmin: true,
    };
    renderAt('/');
    await abrirRail();
    await abrirMenuDoPerfil();
    expect(screen.queryByText(/Ir para o Painel/)).toBeNull();
  });
});
