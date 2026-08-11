import type { Meta, StoryObj } from '@storybook/react';
import { BarChart3, LayoutDashboard, Ticket, Users } from 'lucide-react';
import { SidebarRail, railNavIcon } from './SidebarRail';

/**
 * Rail flutuante do painel. Nasce FECHADO (84px); o toggle alterna a largura e
 * anuncia o estado por `aria-expanded`. Fechado, o rótulo continua acessível
 * (`sr-only`) e o tooltip é decorativo — quem navega por teclado lê o rótulo,
 * não o tooltip.
 */
const meta: Meta<typeof SidebarRail> = {
  title: 'Organismos/SidebarRail',
  component: SidebarRail,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof SidebarRail>;

const ITENS = [
  {
    id: 'visao-geral',
    label: 'Visão Geral',
    icon: railNavIcon(LayoutDashboard),
    href: '/',
    active: true,
  },
  { id: 'eventos', label: 'Eventos', icon: railNavIcon(Ticket), href: '/eventos', badge: 3 },
  { id: 'clubes', label: 'Clubes', icon: railNavIcon(Users), href: '/clubes' },
  { id: 'crm', label: 'Clientes', icon: railNavIcon(BarChart3), href: '/crm' },
];

/** Estado inicial do protótipo: fechado, só ícone. */
export const Fechado: Story = {
  args: { items: ITENS, footerName: 'Vitor Piagge', footerSubtitle: 'Ver perfil' },
};

export const Aberto: Story = {
  args: {
    items: ITENS,
    defaultOpen: true,
    footerName: 'Vitor Piagge',
    footerSubtitle: 'Ver perfil',
  },
};

/**
 * O rodapé como TRIGGER do `DropdownMenu` canônico (nada de popover
 * artesanal). O nome acessível existe fechado e aberto.
 */
export const ComMenuDePerfil: Story = {
  args: {
    items: ITENS,
    defaultOpen: true,
    footerName: 'Vitor Piagge',
    footerSubtitle: 'Ver perfil',
    footerMenu: {
      menuLabel: 'Conta',
      actions: [
        { id: 'perfil', label: 'Meu perfil', onClick: () => {} },
        { id: 'sair', label: 'Sair', onClick: () => {}, destructive: true },
      ],
    },
  },
};

/** A MESMA nav como conteúdo do Drawer < lg: sempre aberta, sem toggle. */
export const Drawer: Story = {
  args: {
    items: ITENS,
    variant: 'drawer',
    defaultOpen: true,
    footerName: 'Vitor Piagge',
    footerSubtitle: 'Ver perfil',
  },
};
