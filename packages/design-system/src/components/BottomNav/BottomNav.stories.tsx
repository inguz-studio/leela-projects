import type { Meta, StoryObj } from '@storybook/react';
import { Heart, LayoutDashboard, Ticket, User } from 'lucide-react';
import { BottomNav, bottomNavIcon } from './BottomNav';

/**
 * A barra só existe abaixo de `lg` — no Storybook, o viewport `mobile1` (320)
 * ou `mobile2` (390) mostra a peça; num canvas largo ela some, e isso é o
 * contrato, não um defeito da story.
 */
const meta: Meta<typeof BottomNav> = {
  title: 'Navegação/BottomNav',
  component: BottomNav,
  parameters: {
    layout: 'fullscreen',
    viewport: { defaultViewport: 'mobile2' },
  },
};

export default meta;
type Story = StoryObj<typeof BottomNav>;

const QUATRO = [
  { id: 'visao-geral', label: 'Visão geral', icon: bottomNavIcon(LayoutDashboard), href: '/' },
  { id: 'eventos', label: 'Eventos', icon: bottomNavIcon(Ticket), href: '/eventos' },
  { id: 'clubs', label: 'Clubs', icon: bottomNavIcon(Heart), href: '/clubes' },
  { id: 'crm', label: 'CRM', icon: bottomNavIcon(User), href: '/crm' },
];

/** Os quatro destinos da leva 20, com Eventos ativo. */
export const Default: Story = {
  args: {
    items: QUATRO.map((i) => ({ ...i, active: i.id === 'eventos' })),
  },
};

/** O ativo na primeira posição — o pill nasce colado à borda esquerda. */
export const PrimeiroAtivo: Story = {
  args: {
    items: QUATRO.map((i) => ({ ...i, active: i.id === 'visao-geral' })),
  },
};

/**
 * Contagem real no ícone. O número visual é decorativo; quem lê por áudio ouve
 * o `badgeLabel` — "3" ao lado de "Eventos" não diz o que são três.
 */
export const ComBadge: Story = {
  args: {
    items: QUATRO.map((i) =>
      i.id === 'eventos'
        ? { ...i, active: true, badge: 3, badgeLabel: '3 eventos ativos' }
        : { ...i, active: false },
    ),
  },
};

/**
 * Nenhum destino corresponde à rota atual (ex.: uma URL legada que só
 * redireciona). Nenhum item aceso é o estado honesto, e o pill não entra no DOM.
 */
export const SemAtivo: Story = {
  args: {
    items: QUATRO.map((i) => ({ ...i, active: false })),
  },
};

/** Rótulo longo trunca no próprio slot em vez de empurrar os vizinhos. */
export const RotuloLongo: Story = {
  args: {
    items: [
      ...QUATRO.slice(0, 3).map((i) => ({ ...i, active: false })),
      {
        id: 'crm',
        label: 'Relacionamento',
        icon: bottomNavIcon(User),
        href: '/crm',
        active: true,
      },
    ],
  },
};
