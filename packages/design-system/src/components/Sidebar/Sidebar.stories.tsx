import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar, DEFAULT_SIDEBAR_SECTIONS, type SidebarSection } from './Sidebar';
import { SidebarFooter } from './SidebarFooter';
import { Avatar } from '../Avatar';

/** Seções padrão com "Eventos" ativa. */
const SECTIONS_ATIVAS: SidebarSection[] = DEFAULT_SIDEBAR_SECTIONS.map((section) => ({
  ...section,
  items: section.items.map((item) =>
    item.id === 'eventos' ? { ...item, active: true } : item,
  ),
}));

/** Seções padrão com item ativo + badge de contagem em "Comunicação". */
const SECTIONS_COM_BADGE: SidebarSection[] = DEFAULT_SIDEBAR_SECTIONS.map((section) => ({
  ...section,
  items: section.items.map((item) => {
    if (item.id === 'eventos') return { ...item, active: true };
    if (item.id === 'comunicacao') return { ...item, badge: 12 };
    return item;
  }),
}));

const meta: Meta<typeof Sidebar> = {
  title: 'Organismos/Sidebar',
  component: Sidebar,
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

/** Navegação padrão Be Hero: 8 itens em 2 seções, largura fixa 240px. */
export const Padrao: Story = {
  render: () => <Sidebar sections={SECTIONS_ATIVAS} />,
};

/** Item ativo (aria-current="page") + badge de contagem. */
export const ComBadge: Story = {
  render: () => <Sidebar sections={SECTIONS_COM_BADGE} />,
};

/** Rodapé componível: avatar + nome + subtítulo, sem interação. */
export const ComFooter: Story = {
  render: () => (
    <Sidebar
      sections={SECTIONS_ATIVAS}
      footer={
        <SidebarFooter
          avatar={<Avatar size="sm" name="Ana Souza" />}
          name="Ana Souza"
          subtitle="Organizadora"
        />
      }
    />
  ),
};

/** Rodapé interativo: com onClick o rodapé inteiro vira botão (ex.: abrir perfil). */
export const ComFooterInterativo: Story = {
  render: () => (
    <Sidebar
      sections={SECTIONS_ATIVAS}
      footer={
        <SidebarFooter
          avatar={<Avatar size="sm" name="Ana Souza" />}
          name="Ana Souza"
          subtitle="Ver perfil"
          onClick={() => undefined}
        />
      }
    />
  ),
};
