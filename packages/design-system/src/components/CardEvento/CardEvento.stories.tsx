import type { Meta, StoryObj } from '@storybook/react';
import { CardEvento } from './CardEvento';
import { Badge } from '../Badge';

const meta: Meta<typeof CardEvento> = {
  title: 'Cards/CardEvento',
  component: CardEvento,
  tags: ['autodocs'],
  args: {
    title: 'Meia Maratona de Floripa',
    modality: <Badge variant="brand">21K</Badge>,
    meta: <span>12 out · Florianópolis</span>,
    footer: <span className="text-[var(--text-tertiary)]">1.284 inscritos</span>,
  },
};

export default meta;
type Story = StoryObj<typeof CardEvento>;

/** Media 16/10 com gradiente fallback + badge de modalidade + hover translateY. */
export const GradientePadrao: Story = {
  render: (args) => (
    <div className="w-[var(--modal-width-sm)]">
      <CardEvento {...args} href="#" />
    </div>
  ),
};

export const Estatico: Story = {
  render: (args) => (
    <div className="w-[var(--modal-width-sm)]">
      <CardEvento {...args} />
    </div>
  ),
};

export const Grade: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-[var(--spacing-4)]">
      <CardEvento
        title="Meia Maratona de Floripa"
        modality={<Badge variant="brand">21K</Badge>}
        meta={<span>12 out</span>}
        href="#"
      />
      <CardEvento
        title="Corrida do Sol"
        modality={<Badge variant="heroico">10K</Badge>}
        meta={<span>26 out</span>}
        href="#"
      />
      <CardEvento
        title="Night Run"
        modality={<Badge variant="neutro">5K</Badge>}
        meta={<span>9 nov</span>}
        href="#"
      />
    </div>
  ),
};
