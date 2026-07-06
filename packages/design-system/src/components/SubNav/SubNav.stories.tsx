import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { SubNav, type SubNavTab } from './SubNav';

const TABS: SubNavTab[] = [
  { id: 'visao', label: 'Visão geral', active: true },
  { id: 'inscritos', label: 'Inscritos', count: 1284 },
  { id: 'kits', label: 'Kits', count: 3 },
  { id: 'resultados', label: 'Resultados' },
];

const meta: Meta<typeof SubNav> = {
  title: 'Organismos/SubNav',
  component: SubNav,
  parameters: { layout: 'fullscreen' },
  args: { tabs: TABS },
};

export default meta;
type Story = StoryObj<typeof SubNav>;

/** Tab ativa com underline Brasa 2px + contadores em pill (§2.14). */
export const Default: Story = {};

/** Sem contadores — só navegação. */
export const SemContadores: Story = {
  args: {
    tabs: [
      { id: 'dados', label: 'Dados do evento', active: true },
      { id: 'kits', label: 'Kits' },
      { id: 'comunicacao', label: 'Comunicação' },
    ],
  },
};

function SubNavInterativaDemo(): React.JSX.Element {
  const [active, setActive] = React.useState('visao');
  const tabs = TABS.map((tab) => ({
    ...tab,
    active: tab.id === active,
    onClick: () => setActive(tab.id),
  }));
  return <SubNav tabs={tabs} />;
}

/** Troca de tab ativa via onClick (setas ← → navegam o foco). */
export const Interativa: Story = { render: () => <SubNavInterativaDemo /> };
