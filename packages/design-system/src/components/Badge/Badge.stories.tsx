import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Átomos/Badge',
  component: Badge,
  args: { children: 'Publicado', variant: 'vitoria' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['brand', 'heroico', 'vulcao', 'vitoria', 'alerta', 'neutro'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {};

export const TodasAsVariantes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
      <Badge variant="brand">Destaque</Badge>
      <Badge variant="heroico">Heroico</Badge>
      <Badge variant="vulcao">Cancelado</Badge>
      <Badge variant="vitoria">Publicado</Badge>
      <Badge variant="alerta">Pendente</Badge>
      <Badge variant="neutro">Rascunho</Badge>
    </div>
  ),
};
