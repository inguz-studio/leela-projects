import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RootShell } from '../RootShell';
import { _resetEventosBadgeCache } from '../eventosBadge';
import { PLATFORM_NAV } from '../../routes/plataforma/_lib/nav';

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
    const ativo = within(nav()).getByRole('link', { name: 'Visão geral' });
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
    expect(within(nav()).queryByRole('link', { name: 'Visão geral' })).not.toBeInTheDocument();
  });

  it('navegar pela sidebar troca só o conteúdo — a sidebar permanece', async () => {
    renderAt('/');
    await userEvent.click(within(nav()).getByRole('link', { name: 'Eventos' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/eventos');
    expect(nav()).toBeInTheDocument();
    const ativo = within(nav()).getByRole('link', { name: 'Eventos' });
    expect(ativo).toHaveAttribute('aria-current', 'page');
  });

  it('os 5 itens do produtor renderizam com ícone (Leva 15 · menu de 5 áreas)', () => {
    renderAt('/');
    // 6 itens do DS: Visão Geral · Eventos · Clubs · CRM · Parcerias · Configurações.
    const itens = within(nav()).getAllByRole('link');
    expect(itens).toHaveLength(5);
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

  it('marca no rail: wordmark Leela + "Painel Profissional" no rail aberto (T2 · RN-468)', async () => {
    renderAt('/');
    // Fechado o wordmark está em crossfade oculto (aria-hidden) — a marca
    // acessível é a do rail ABERTO, junto com o rótulo de contexto
    // (conquista PAPEL-DUPLO: a moldura NOMEIA o painel).
    await abrirRail();
    const logo = within(nav()).getByRole('img', { name: 'Leela' });
    expect(logo).toHaveAttribute('src', '/leela-logo-brasa.svg');
    expect(within(nav()).getByText('Painel Profissional')).toBeInTheDocument();
    // BLQ-19: o nome antigo não pode voltar por descuido — ele convivia com
    // "Acessar painel profissional" no mesmo rail.
    expect(within(nav()).queryByText('Painel do Organizador')).not.toBeInTheDocument();
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

  it('conta de organizador: menu com Configurações e Sair — ela só tem um painel', async () => {
    renderAt('/');
    await abrirMenuDoPerfil();
    const menu = screen.getByRole('menu', { name: 'Menu do perfil' });
    expect(within(menu).getByRole('menuitem', { name: 'Configurações' })).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Sair' })).toBeInTheDocument();
    expect(within(menu).queryByRole('menuitem', { name: /Acessar painel/ })).toBeNull();
  });

  // LEVA 16, na íntegra: *"devo visualizar 'sair' como opção de logou e
  // configurações. Ambos com pequenos icones."* O tamanho do ícone é contrato
  // do DS (`--popover-icon-size`, testado em icone-do-item.test.tsx); aqui o
  // contrato é a PRESENÇA — o item traz desenho, e não só texto.
  it('Leva 16: Configurações e Sair têm cada um o seu ícone', async () => {
    renderAt('/');
    await abrirMenuDoPerfil();
    const menu = screen.getByRole('menu', { name: 'Menu do perfil' });
    for (const nome of ['Configurações', 'Sair']) {
      const item = within(menu).getByRole('menuitem', { name: nome });
      expect(item.querySelector('svg')).not.toBeNull();
    }
  });

  it('Sair é o ÚLTIMO item — encerrar a sessão não fica no meio da lista', async () => {
    renderAt('/');
    await abrirMenuDoPerfil();
    const menu = screen.getByRole('menu', { name: 'Menu do perfil' });
    const itens = within(menu).getAllByRole('menuitem');
    expect(itens[itens.length - 1]).toHaveTextContent('Sair');
  });

  // LEVA 15 — o dono vetou o default do maestro, na íntegra: *"configuraç~eos
  // também está redundante no menu pricnipal, já que ao clicar no nome 'ver
  // perfil' aparecem as configurações."* O caminho para `/conta` passa a ser um
  // só, e este teste guarda os DOIS lados da troca: sumiu do rail, continua no
  // popover. Meio conserto (sumir dos dois, ou de nenhum) cai aqui.
  it('Configurações leva a /conta pelo popover, e NÃO existe mais no rail', async () => {
    renderAt('/');
    expect(within(nav()).queryByRole('link', { name: 'Configurações' })).toBeNull();
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

// =============================================================================
// O MENU MOBILE no chrome v3 (DELTA-UX-T3 · D-1008-R5) — SUPERADO no produtor
// pela leva 20, e vivo no super-admin.
//
// O que a D-1008-R5 decidiu, e por quê: o Drawer < lg montava a Sidebar
// clássica (be-hero, 240px, seções OPERAÇÃO/CONTA), a única superfície do
// painel fora do DS novo; ela passou a montar o PRÓPRIO SidebarRail em
// `variant="drawer"`, e a anatomia off-canvas foi preservada de propósito — o
// dono, na íntegra: *"o menu no formato mobile também nao está no DS novo"*.
//
// O que a leva 20 mudou, e por quê. O dono, na íntegra: *"Já o Menu no formato
// mobile, pode ser uma barra flutuante, horizontal a ficar na parte inferior da
// tela. e a parte de logout, configurações, na barra superior no lado direito,
// com o ícone de perfil."* Na superfície do PRODUTOR a barra flutuante
// substitui o drawer, e com ela some o hambúrguer: dois caminhos para a mesma
// navegação na mesma largura é a duplicata que a leva 15 apagou do rail. Os
// casos abaixo mudaram de SUPERFÍCIE, não de conteúdo — a anatomia de drawer
// segue provada, agora onde ela ainda vive.
//
// Nada foi apagado: `variant="drawer"` segue no DS e segue montado aqui. A
// razão de o super-admin continuar com ele está medida — são doze destinos, e
// quatro slots não os comportam.
//
// jsdom não aplica CSS: o rail desktop (hidden lg:block) coexiste no DOM com
// o drawer aberto — por isso TODA query destes casos é scoped no dialog.
// =============================================================================

describe('RootShell · menu mobile no chrome v3 (drawer < lg, superfície da plataforma)', () => {
  async function abrirDrawer(): Promise<void> {
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu de navegação' }));
  }
  function dialogo(): HTMLElement {
    return screen.getByRole('dialog', { name: 'Menu de navegação' });
  }

  it('o drawer monta o rail v3 sempre aberto — a Sidebar clássica saiu da moldura', async () => {
    renderAt('/plataforma/tenants');
    await abrirDrawer();
    const drawerNav = within(dialogo()).getByRole('navigation', { name: 'Navegação principal' });
    expect(drawerNav).toHaveAttribute('data-rail-open', '1');
    // Anatomia clássica morta no drawer: sem rótulos de seção do be-hero.
    expect(within(dialogo()).queryByText('OPERAÇÃO')).toBeNull();
    expect(within(dialogo()).queryByText('CONTA')).toBeNull();
    // Sem toggle: quem fecha o off-canvas é o Drawer (scrim/Esc).
    expect(within(dialogo()).queryByRole('button', { name: 'Abrir menu' })).toBeNull();
    expect(within(dialogo()).queryByRole('button', { name: 'Recolher menu' })).toBeNull();
    // Os destinos COM ROTA da nav do super-admin, rótulos em fluxo (anatomia
    // aberta). `billing` é informativo (badge "em breve") e não vira link.
    const comRota = PLATFORM_NAV.filter((i) => i.href).length;
    expect(within(drawerNav).getAllByRole('link')).toHaveLength(comRota);
  });

  it('o drawer NOMEIA o painel (papel-duplo vale no mobile também)', async () => {
    renderAt('/plataforma/tenants');
    await abrirDrawer();
    expect(within(dialogo()).getByText('Painel Master')).toBeInTheDocument();
  });

  it('o popover do perfil também vive no drawer (trigger nomeado, F5 vale < lg)', async () => {
    renderAt('/plataforma/tenants');
    await abrirDrawer();
    const trigger = within(dialogo()).getByRole('button', { name: 'Marina Castelo' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('navegar por um item do drawer fecha o drawer e troca a rota (contrato do AppShell)', async () => {
    renderAt('/plataforma/tenants');
    await abrirDrawer();
    await userEvent.click(within(dialogo()).getByRole('link', { name: 'Macro' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByTestId('path')).toHaveTextContent('/plataforma/macro');
  });

  it('/plataforma: o drawer monta a nav própria do super-admin no mesmo chrome', async () => {
    renderAt('/plataforma/tenants');
    await abrirDrawer();
    const drawerNav = within(dialogo()).getByRole('navigation', { name: 'Navegação principal' });
    expect(within(drawerNav).getByRole('link', { name: 'Tenants' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(drawerNav).queryByRole('link', { name: 'Visão geral' })).toBeNull();
  });
});

// =============================================================================
// NAV-MOBILE (leva 20) — a barra flutuante inferior e o perfil no topo direito.
// =============================================================================

describe('RootShell · NAV-MOBILE: a barra inferior do produtor', () => {
  function barra(): HTMLElement {
    return screen.getByRole('navigation', { name: 'Navegação inferior' });
  }

  it('a barra monta no produtor com os quatro destinos e o ativo aceso', () => {
    renderAt('/eventos');
    expect(within(barra()).getAllByRole('link')).toHaveLength(4);
    expect(within(barra()).getByRole('link', { name: /^Eventos/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('o rótulo de cada destino fica no FLUXO — nada de quatro glifos mudos', () => {
    renderAt('/');
    for (const rotulo of ['Visão geral', 'Eventos', 'Clubs', 'CRM']) {
      expect(within(barra()).getByText(rotulo)).toBeVisible();
    }
  });

  it('clicar num item navega por SPA, sem recarregar o documento', async () => {
    renderAt('/');
    await userEvent.click(within(barra()).getByRole('link', { name: 'Clubs' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/clubes');
  });

  it('o hambúrguer SAIU do produtor — a navegação mobile é uma só', () => {
    renderAt('/');
    expect(screen.queryByRole('button', { name: 'Abrir menu de navegação' })).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a plataforma NÃO ganha barra — lá o drawer fica (doze destinos)', () => {
    renderAt('/plataforma/tenants');
    expect(screen.queryByRole('navigation', { name: 'Navegação inferior' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Abrir menu de navegação' })).toBeInTheDocument();
  });

  it('a página reserva o espaço embaixo — nada fica atrás da barra', () => {
    renderAt('/');
    const rolagem = screen.getByTestId('path').parentElement;
    expect(rolagem?.className).toContain('pb-[var(--bottomnav-space)]');
    expect(rolagem?.className).toContain('lg:pb-0');
  });

  it('e não reserva onde a barra não existe — respiro sem barra é buraco', () => {
    renderAt('/plataforma/tenants');
    const rolagem = screen.getByTestId('path').parentElement;
    expect(rolagem?.className).not.toContain('pb-[var(--bottomnav-space)]');
  });
});

describe('RootShell · NAV-MOBILE: o perfil no topo direito', () => {
  function gatilho(): HTMLElement {
    return screen.getByRole('button', { name: 'Marina Castelo — menu do perfil' });
  }

  it('o gatilho existe no produtor, com nome acessível e aria-haspopup', () => {
    renderAt('/');
    expect(gatilho()).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('e existe também na plataforma — sair não pode depender da superfície', () => {
    renderAt('/plataforma/tenants');
    expect(gatilho()).toHaveAttribute('aria-haspopup', 'menu');
  });

  // O ponto da lane: o popover é O QUE JÁ EXISTE. Mesmos itens, mesma ordem e o
  // mesmo `menuLabel` do rodapé do rail (leva 16) — nenhuma lista foi copiada, e
  // é por isso que o caso afirma a IDENTIDADE do conteúdo, não a existência de
  // um menu qualquer.
  it('abre o popover canônico com Configurações e Sair — Sair por ÚLTIMO', async () => {
    renderAt('/');
    await userEvent.click(gatilho());
    const menu = screen.getByRole('menu', { name: 'Menu do perfil' });
    const itens = within(menu).getAllByRole('menuitem');
    expect(itens.map((i) => i.textContent?.trim())).toEqual(['Configurações', 'Sair']);
  });

  it('Configurações leva a /conta — o único caminho para a conta no mobile', async () => {
    renderAt('/');
    await userEvent.click(gatilho());
    await userEvent.click(screen.getByRole('menuitem', { name: 'Configurações' }));
    expect(screen.getByTestId('path')).toHaveTextContent('/conta');
  });

  // A travessia é do MESMO objeto de ações do rodapé do rail — não uma segunda
  // lista montada aqui. Se alguém copiar as ações em vez de reusá-las, este caso
  // é o que cai: a regra 1 do alternador (só oferece a quem alcança os dois
  // lados) mora num lugar só.
  it('a travessia entra no popover do topo quando a conta alcança os dois lados', async () => {
    cracha.atual = {
      tenantId: 'castelo-producoes',
      role: 'tenant_owner',
      platformAdmin: true,
    };
    renderAt('/');
    await userEvent.click(gatilho());
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: 'Acessar painel master' })).toBeInTheDocument(),
    );
  });
});
