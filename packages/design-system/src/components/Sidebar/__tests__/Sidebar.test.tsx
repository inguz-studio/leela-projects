import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarDays, LayoutDashboard, Settings } from 'lucide-react';
import { Sidebar, DEFAULT_SIDEBAR_SECTIONS, sidebarNavIcon } from '../Sidebar';
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

  it('DEFAULT_SIDEBAR_SECTIONS has 8 items total', () => {
    const count = DEFAULT_SIDEBAR_SECTIONS.flatMap((s) => s.items).length;
    expect(count).toBe(8);
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
    expect(svgs.length).toBe(8);
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
