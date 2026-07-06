import type { Meta, StoryObj } from '@storybook/react';
import { Avatar } from './Avatar';

const meta: Meta<typeof Avatar> = {
  title: 'Átomos/Avatar',
  component: Avatar,
  args: { name: 'Vitor Piagge', size: 'md' },
  argTypes: { size: { control: 'select', options: ['sm', 'md', 'lg'] } },
};

export default meta;
type Story = StoryObj<typeof Avatar>;

export const Iniciais: Story = {};

export const Vip: Story = { args: { vip: true } };

export const Tamanhos: Story = {
  render: () => (
    <div className="flex items-center gap-[var(--spacing-4)]">
      <Avatar name="Ana Souza" size="sm" />
      <Avatar name="Bruno Lima" size="md" />
      <Avatar name="Carla Nunes" size="lg" />
      <Avatar name="Diego VIP" size="lg" vip />
    </div>
  ),
};
