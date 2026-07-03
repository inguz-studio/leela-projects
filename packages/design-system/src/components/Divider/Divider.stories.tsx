import type { Meta, StoryObj } from '@storybook/react';
import { Divider } from './Divider';

const meta: Meta<typeof Divider> = {
  title: 'Átomos/Divider',
  component: Divider,
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['subtle', 'default', 'strong'] },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
  },
};

export default meta;
type Story = StoryObj<typeof Divider>;

export const Default: Story = {};

export const Pesos: Story = {
  render: () => (
    <div className="flex flex-col gap-[var(--spacing-4)] w-[var(--modal-width-sm)]">
      <Divider variant="subtle" />
      <Divider variant="default" />
      <Divider variant="strong" />
    </div>
  ),
};

export const Vertical: Story = {
  render: () => (
    <div className="flex items-stretch gap-[var(--spacing-3)] h-[var(--btn-height-lg)]">
      <span className="text-[var(--text-secondary)]">Inscritos</span>
      <Divider orientation="vertical" />
      <span className="text-[var(--text-secondary)]">Kits</span>
    </div>
  ),
};
