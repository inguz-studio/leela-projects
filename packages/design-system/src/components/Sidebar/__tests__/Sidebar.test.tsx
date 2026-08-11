import { describe, it, expect, vi } from 'vitest';
import type * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarDays, LayoutDashboard, Settings } from 'lucide-react';
import { Sidebar, DEFAULT_SIDEBAR_SECTIONS, DEFAULT_SIDEBAR_NAV_ICONS, sidebarNavIcon } from '../Sidebar';
import { SidebarBrand } from '../SidebarBrand';
import type { SidebarSection } from '../Sidebar';

const sections: SidebarSection[] = [
  {
    label: 'OPERAÇÃO',
    items: [
      { id: 'visao-geral', label: 'Visão Geral', icon: sidebarNavIcon(LayoutDashboard), active: true },
      { id: 'eventos',     label: 'Eventos',     icon: sidebarNavIcon(CalendarDays), badge: 3 },
    ],
  },
  {
    label: 'CONTA',
    items: [
      { id: 'config', label: 'Configurações', icon: sidebarNavIcon(Settings) },
    ],
  },
];

describe('Sidebar', () => {
  it('renders nav landmark', () => {
    render(<Sidebar sections={sections} />);
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
  });

  it('renders section labels', () => {
    render(<Sidebar sections={sections} />);
    expect(screen.getByText('OPERAÇÃO')).toBeInTheDocument();
    expect(screen.getByText('CONTA')).toBeInTheDocument();
  });

  it('is fixed at the 240px width token (no collapsed variant)', () => {
    render(<Sidebar sections={sections} />);
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(nav.className).toContain('w-[var(--sidebar-width)]');
    expect(nav.className).not.toContain('--sidebar-collapsed-width');
  });

  it('marks active item with aria-current="page"', () => {
    render(<Sidebar sections={sections} />);
    const activeItem = screen.getByText('Visão Geral').closest('[aria-current="page"]');
    expect(activeItem).toBeInTheDocument();
  });

  it('renders badge count on item', () => {
    render(<Sidebar sections={sections} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not render a collapse toggle (decisão vinculante: variante única fixa)', () => {
    render(<Sidebar sections={sections} />);
    expect(screen.queryByRole('button', { name: 'Recolher menu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Expandir menu' })).not.toBeInTheDocument();
  });

  it('calls item onClick when clicked', async () => {
    const onClick = vi.fn();
    const sectionsWithClick: SidebarSection[] = [
      {
        label: 'OPERAÇÃO',
        items: [{ id: 'eventos', label: 'Eventos', icon: sidebarNavIcon(CalendarDays), onClick }],
      },
    ];
    render(<Sidebar sections={sectionsWithClick} />);
    await userEvent.click(screen.getByText('Eventos'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders anchor when item has href', () => {
    const sectionsWithHref: SidebarSection[] = [
      {
        label: 'OPERAÇÃO',
        items: [{ id: 'eventos', label: 'Eventos', icon: sidebarNavIcon(CalendarDays), href: '/eventos' }],
      },
    ];
    render(<Sidebar sections={sectionsWithHref} />);
    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveAttribute('href', '/eventos');
  });

  // -------------------------------------------------------------------------
  // LEELA-NAVFIX-T1 — o defeito ESPELHADO da SubNav: aqui o menu navegava por
  // onClick mas não era link. `href` + `onClick` juntos é o estado correto —
  // âncora de verdade, e o consumidor intercepta o clique simples pra navegar
  // por SPA.
  // -------------------------------------------------------------------------

  it('href + onClick: item é âncora de verdade E encaminha o MouseEvent', async () => {
    const recebido: unknown[] = [];
    const sectionsSpa: SidebarSection[] = [
      {
        label: 'OPERAÇÃO',
        items: [
          {
            id: 'eventos',
            label: 'Eventos',
            icon: sidebarNavIcon(CalendarDays),
            href: '/eventos',
            onClick: (event) => {
              recebido.push(event);
              event.preventDefault();
            },
          },
        ],
      },
    ];
    render(<Sidebar sections={sectionsSpa} />);
    const link = screen.getByRole('link', { name: 'Eventos' });
    await userEvent.click(link);

    expect(recebido).toHaveLength(1);
    const event = recebido[0] as React.MouseEvent;
    expect(typeof event.preventDefault).toBe('function');
    expect(event.defaultPrevented).toBe(true);
    // O href sobrevive ao onClick: é ele que devolve ctrl+clique, clique do
    // meio e "copiar endereço do link" ao menu.
    expect(link).toHaveAttribute('href', '/eventos');
  });

  it('sem href, o botão também encaminha o MouseEvent', async () => {
    const recebido: unknown[] = [];
    render(
      <Sidebar
        sections={[
          {
            label: 'OPERAÇÃO',
            items: [{ id: 'crm', label: 'CRM', icon: null, onClick: (event) => recebido.push(event) }],
          },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'CRM' }));
    expect(recebido).toHaveLength(1);
    expect(typeof (recebido[0] as React.MouseEvent).preventDefault).toBe('function');
  });

  // -------------------------------------------------------------------------
  // LEELA-NAVFIX-REV — o item do menu do painel passou de `<button>` para `<a>`
  // quando o consumidor lhe deu `href`. A alegação de "zero mudança visual" era
  // DEDUTIVA; aqui ela vira medida, e o que MUDA de fato fica travado por
  // escrito em vez de descoberto no navegador.
  // -------------------------------------------------------------------------

  const itemDosDoisJeitos = (over: Partial<{ href: string }>, onClick?: () => void): SidebarSection[] => [
    {
      label: 'OPERAÇÃO',
      items: [
        {
          id: 'eventos',
          label: 'Eventos',
          icon: sidebarNavIcon(CalendarDays),
          badge: 3,
          badgeVariant: 'neutral',
          active: true,
          ...(onClick ? { onClick } : {}),
          ...over,
        },
      ],
    },
  ];

  it('<a> e <button> saem com a MESMA string de classes e o MESMO conteúdo', () => {
    const { unmount } = render(<Sidebar sections={itemDosDoisJeitos({})} />);
    const botao = screen.getByRole('button', { name: /Eventos/ });
    const classeBotao = botao.getAttribute('class');
    const htmlBotao = botao.innerHTML;
    const ariaBotao = botao.getAttribute('aria-current');
    unmount();

    render(<Sidebar sections={itemDosDoisJeitos({ href: '/eventos' })} />);
    const link = screen.getByRole('link', { name: /Eventos/ });

    // O ramo `<a>` usa `sharedProps.className` — a mesma string. Se alguém
    // divergir os dois ramos, o menu muda de aparência sem ninguém ver.
    expect(link.getAttribute('class')).toBe(classeBotao);
    expect(link.innerHTML).toBe(htmlBotao);
    expect(link.getAttribute('aria-current')).toBe(ariaBotao);
    expect(ariaBotao).toBe('page');
  });

  it('o DELTA de atributos entre os dois ramos é exatamente +href / -type', () => {
    const atributos = (el: Element): string[] => Array.from(el.attributes).map((a) => a.name).sort();

    const { unmount } = render(<Sidebar sections={itemDosDoisJeitos({})} />);
    const doBotao = atributos(screen.getByRole('button', { name: /Eventos/ }));
    unmount();

    render(<Sidebar sections={itemDosDoisJeitos({ href: '/eventos' })} />);
    const doLink = atributos(screen.getByRole('link', { name: /Eventos/ }));

    expect(doLink.filter((a) => !doBotao.includes(a))).toEqual(['href']);
    expect(doBotao.filter((a) => !doLink.includes(a))).toEqual(['type']);
  });

  it('Enter ativa o item nos dois ramos — navegação por teclado não regride', async () => {
    const noBotao = vi.fn();
    const { unmount } = render(<Sidebar sections={itemDosDoisJeitos({}, noBotao)} />);
    screen.getByRole('button', { name: /Eventos/ }).focus();
    await userEvent.keyboard('{Enter}');
    expect(noBotao).toHaveBeenCalledTimes(1);
    unmount();

    const noLink = vi.fn();
    render(<Sidebar sections={itemDosDoisJeitos({ href: '/eventos' }, noLink)} />);
    screen.getByRole('link', { name: /Eventos/ }).focus();
    await userEvent.keyboard('{Enter}');
    expect(noLink).toHaveBeenCalledTimes(1);
  });

  it('DELTA DELIBERADO: Espaço ativa o <button> e NÃO ativa o <a>', async () => {
    // Semântica de HTML, não defeito: link se ativa com Enter, botão com Enter
    // e Espaço. Dar `href` ao item troca uma coisa pela outra, e isso não estava
    // escrito em lugar nenhum. Fica travado aqui: se algum dia o menu precisar
    // de Espaço, é decisão consciente com um teste vermelho na frente.
    const noLink = vi.fn();
    const { unmount } = render(<Sidebar sections={itemDosDoisJeitos({ href: '/eventos' }, noLink)} />);
    screen.getByRole('link', { name: /Eventos/ }).focus();
    await userEvent.keyboard('[Space]');
    expect(noLink).not.toHaveBeenCalled();
    unmount();

    const noBotao = vi.fn();
    render(<Sidebar sections={itemDosDoisJeitos({}, noBotao)} />);
    screen.getByRole('button', { name: /Eventos/ }).focus();
    await userEvent.keyboard('[Space]');
    expect(noBotao).toHaveBeenCalledTimes(1);
  });

  it('o item é alcançável por Tab nos dois ramos (ordem de tabulação intacta)', async () => {
    const { unmount } = render(<Sidebar sections={itemDosDoisJeitos({})} />);
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Eventos/ })).toHaveFocus();
    unmount();

    render(<Sidebar sections={itemDosDoisJeitos({ href: '/eventos' })} />);
    await userEvent.tab();
    expect(screen.getByRole('link', { name: /Eventos/ })).toHaveFocus();
  });

  it('DEFAULT_SIDEBAR_SECTIONS has 6 items total (RN-233 · rodada IA-MENU)', () => {
    const count = DEFAULT_SIDEBAR_SECTIONS.flatMap((s) => s.items).length;
    expect(count).toBe(6);
  });

  it('DEFAULT_SIDEBAR_SECTIONS: inventário EXATO e na ordem (catálogo é contrato)', () => {
    expect(DEFAULT_SIDEBAR_SECTIONS.map((s) => s.label)).toEqual(['OPERAÇÃO', 'CONTA']);
    expect(DEFAULT_SIDEBAR_SECTIONS.map((s) => s.items.map((i) => [i.id, i.label]))).toEqual([
      [
        ['visao-geral', 'Visão geral'],
        ['eventos', 'Eventos'],
        ['clubs', 'Clubs'],
        ['crm', 'CRM'],
        ['parcerias', 'Parcerias'],
      ],
      [['configuracoes', 'Configurações']],
    ]);
  });

  it('RN-823: "financeiro" e "analytics" saíram do catálogo do DS, não só do consumidor', () => {
    const ids = DEFAULT_SIDEBAR_SECTIONS.flatMap((s) => s.items).map((i) => i.id);
    expect(ids).not.toContain('financeiro');
    expect(ids).not.toContain('analytics');
    // e o id antigo do hub não sobrevive em lugar nenhum do catálogo
    expect(ids).not.toContain('comunicacao');
  });

  it('every DEFAULT_SIDEBAR_SECTIONS item has a Lucide icon (B1 — fim do menu sem ícone)', () => {
    const items = DEFAULT_SIDEBAR_SECTIONS.flatMap((s) => s.items);
    for (const item of items) {
      expect(item.icon, `item "${item.id}" sem ícone`).toBeTruthy();
    }
  });

  it('renders icons as decorative (aria-hidden) — nome acessível vem do label', () => {
    const { container } = render(<Sidebar sections={DEFAULT_SIDEBAR_SECTIONS} />);
    const svgs = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(svgs.length).toBe(6);
  });

  it('labels stay visible (nome acessível = label do item)', () => {
    render(<Sidebar sections={sections} />);
    expect(screen.getByText('Visão Geral')).not.toHaveClass('sr-only');
    expect(
      screen.getByRole('button', { name: /Configurações/ }),
    ).toBeInTheDocument();
  });

  it('first nav item receives keyboard focus on tab', async () => {
    render(<Sidebar sections={sections} />);
    const first = screen.getByRole('button', { name: /Visão Geral/ });
    await userEvent.tab();
    expect(first).toHaveFocus();
  });
});

// ---------------------------------------------------------------------------
// Lote FIDELIDADE T2 — brand slot + badges do mockup + métricas por token
// ---------------------------------------------------------------------------

describe('Sidebar (T2 — métricas exatas do mockup)', () => {
  it('renderiza o brand slot com mark + sub + ponto da marca (aria-hidden)', () => {
    render(
      <Sidebar
        brand={<SidebarBrand mark="LEELA" sub="Painel do Organizador" />}
        sections={sections}
      />,
    );
    expect(screen.getByText('LEELA')).toBeInTheDocument();
    expect(screen.getByText('Painel do Organizador')).toBeInTheDocument();
    expect(screen.getByText('.', { selector: 'span[aria-hidden]' })).toBeInTheDocument();
  });

  it('sem brand o slot simplesmente não existe', () => {
    render(<Sidebar sections={sections} />);
    expect(screen.queryByText('LEELA')).not.toBeInTheDocument();
  });

  it('badge default = danger (feedback-danger); badgeVariant="neutral" = surface-high', () => {
    const comBadges: SidebarSection[] = [
      {
        label: 'OPERAÇÃO',
        items: [
          { id: 'eventos', label: 'Eventos', icon: null, badge: 3, badgeVariant: 'neutral' },
          { id: 'comunicacao', label: 'Comunicação', icon: null, badge: 4 },
        ],
      },
    ];
    render(<Sidebar sections={comBadges} />);
    const neutro = screen.getByText('3');
    const danger = screen.getByText('4');
    expect(neutro.className).toContain('bg-[var(--surface-high)]');
    expect(neutro.className).toContain('text-[var(--text-secondary)]');
    expect(danger.className).toContain('bg-[var(--feedback-danger-surface)]');
    expect(danger.className).toContain('text-[var(--feedback-danger-fg)]');
    // Tipografia do mockup .nav-badge (10px/700) por token
    expect(danger.className).toContain('text-[length:var(--sidebar-badge-size)]');
    expect(danger.className).toContain('font-[var(--font-weight-bold)]');
  });

  it('métricas do item por token (mockup 10x12 gap 12) e barra ativa em -nav-px', () => {
    render(<Sidebar sections={sections} />);
    const item = screen.getByText('Eventos').closest('a,button') as HTMLElement;
    expect(item.className).toContain('py-[var(--sidebar-item-py)]');
    expect(item.className).toContain('px-[var(--sidebar-item-px)]');
    expect(item.className).toContain('gap-[var(--sidebar-item-gap)]');
    const ativo = screen.getByText('Visão Geral').closest('a,button') as HTMLElement;
    expect(ativo.className).toContain('before:left-[calc(-1*var(--sidebar-nav-px))]');
  });

  it('sidebar fecha com a hairline direita do mockup', () => {
    render(<Sidebar sections={sections} />);
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(nav.className).toContain('border-r-[var(--border-subtle)]');
  });
});

// ---------------------------------------------------------------------------
// REDESIGN-V2 · item 3 — ícones oficiais e catálogo com dono único
// ---------------------------------------------------------------------------

describe('REDESIGN-V2 item 3: catálogo de ícones da nav', () => {
  it('os quatro itens que mudaram de significado usam o ícone novo', () => {
    // Ticket/Heart/User/Megaphone descrevem o que o organizador vende ou
    // cuida; CalendarDays/UsersRound/Bell/Briefcase descreviam o dado guardado.
    const porId = Object.fromEntries(DEFAULT_SIDEBAR_NAV_ICONS.map((e) => [e.id, e.iconName]));
    expect(porId).toMatchObject({
      'visao-geral': 'LayoutDashboard',
      eventos: 'Ticket',
      clubs: 'Heart',
      crm: 'User',
      parcerias: 'Megaphone',
      configuracoes: 'Settings',
    });
  });

  it('Ticket é exclusivo do item de menu — nenhum outro item o reusa', () => {
    // Agenda e campos de data seguem em CalendarDays/CalendarCheck: confundir
    // "quando acontece" com "o que se vende" é o erro que o item 3 corrige.
    const comTicket = DEFAULT_SIDEBAR_NAV_ICONS.filter((e) => e.iconName === 'Ticket');
    expect(comTicket).toHaveLength(1);
    expect(comTicket[0]!.id).toBe('eventos');
  });

  it('iconName bate com o componente Lucide de verdade (nome não mente)', () => {
    for (const entrada of DEFAULT_SIDEBAR_NAV_ICONS) {
      const nomeReal = (entrada.Icon as unknown as { displayName?: string }).displayName;
      expect(nomeReal, `entrada "${entrada.id}"`).toBe(entrada.iconName);
    }
  });

  it('as seções default são DERIVADAS do catálogo — nenhuma lista paralela', () => {
    // É a regressão do item 3: a página de ícones do showcase mantinha uma
    // segunda lista escrita à mão e derivou até citar Financeiro e Analytics,
    // itens que a rodada IA-MENU tinha removido. Com uma fonte só, some.
    const idsDasSecoes = DEFAULT_SIDEBAR_SECTIONS.flatMap((s) => s.items.map((i) => i.id));
    const idsDoCatalogo = DEFAULT_SIDEBAR_NAV_ICONS.map((e) => e.id);
    expect(idsDasSecoes).toEqual(idsDoCatalogo);
  });
});
