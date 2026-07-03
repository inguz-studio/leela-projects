import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Sidebar, DEFAULT_SIDEBAR_SECTIONS } from '../Sidebar';
import type { SidebarSection } from '../Sidebar';

const sections: SidebarSection[] = [
  {
    label: 'OPERAÇÃO',
    items: [
      { id: 'visao-geral', label: 'Visão Geral', icon: null, active: true },
      { id: 'eventos',     label: 'Eventos',     icon: null, badge: 3 },
    ],
  },
  {
    label: 'CONTA',
    items: [
      { id: 'config', label: 'Configurações', icon: null },
    ],
  },
];

describe('Sidebar', () => {
  it('renders nav landmark', () => {
    render(<Sidebar sections={sections} />);
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
  });

  it('renders section labels when expanded', () => {
    render(<Sidebar sections={sections} />);
    expect(screen.getByText('OPERAÇÃO')).toBeInTheDocument();
    expect(screen.getByText('CONTA')).toBeInTheDocument();
  });

  it('hides section labels when collapsed', () => {
    render(<Sidebar sections={sections} collapsed />);
    expect(screen.queryByText('OPERAÇÃO')).not.toBeInTheDocument();
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

  it('calls onToggleCollapse when toggle button clicked', async () => {
    const onToggle = vi.fn();
    render(<Sidebar sections={sections} onToggleCollapse={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: 'Recolher menu' }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('toggle button shows "Expandir menu" label when collapsed', () => {
    render(<Sidebar sections={sections} collapsed />);
    expect(screen.getByRole('button', { name: 'Expandir menu' })).toBeInTheDocument();
  });

  it('calls item onClick when clicked', async () => {
    const onClick = vi.fn();
    const sectionsWithClick: SidebarSection[] = [
      {
        label: 'OPERAÇÃO',
        items: [{ id: 'eventos', label: 'Eventos', icon: null, onClick }],
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
        items: [{ id: 'eventos', label: 'Eventos', icon: null, href: '/eventos' }],
      },
    ];
    render(<Sidebar sections={sectionsWithHref} />);
    expect(screen.getByRole('link', { name: 'Eventos' })).toHaveAttribute('href', '/eventos');
  });

  it('DEFAULT_SIDEBAR_SECTIONS has 8 items total', () => {
    const count = DEFAULT_SIDEBAR_SECTIONS.flatMap((s) => s.items).length;
    expect(count).toBe(8);
  });

  it('toggle button is keyboard focusable', async () => {
    render(<Sidebar sections={sections} />);
    const btn = screen.getByRole('button', { name: 'Recolher menu' });
    await userEvent.tab();
    expect(btn).toHaveFocus();
  });
});
