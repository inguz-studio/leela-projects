import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayoutDashboard } from 'lucide-react';
import { Sidebar, sidebarNavIcon, type SidebarSection } from '../Sidebar';
import { SidebarFooter } from '../SidebarFooter';
import { Avatar } from '../../Avatar';

const sections: SidebarSection[] = [
  {
    label: 'OPERAÇÃO',
    items: [{ id: 'visao-geral', label: 'Visão Geral', icon: sidebarNavIcon(LayoutDashboard) }],
  },
];

describe('SidebarFooter (B4)', () => {
  it('renders avatar, name and subtitle from consumer data', () => {
    render(
      <SidebarFooter
        avatar={<Avatar size="sm" name="Marina Castelo" />}
        name="Marina Castelo"
        subtitle="Ver perfil"
      />,
    );
    expect(screen.getByText('Marina Castelo')).toBeInTheDocument();
    expect(screen.getByText('Ver perfil')).toBeInTheDocument();
    // Avatar fallback: iniciais
    expect(screen.getByText('MC')).toBeInTheDocument();
  });

  it('is static (no button) without onClick', () => {
    render(<SidebarFooter name="Marina Castelo" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('becomes an accessible button with onClick', async () => {
    const onClick = vi.fn();
    render(<SidebarFooter name="Marina Castelo" subtitle="Ver perfil" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: /Marina Castelo/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders inside the Sidebar footer slot (dentro do landmark de navegação)', () => {
    render(
      <Sidebar
        sections={sections}
        footer={<SidebarFooter name="Marina Castelo" subtitle="Ver perfil" />}
      />,
    );
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' });
    expect(nav).toContainElement(screen.getByText('Marina Castelo'));
  });
});
