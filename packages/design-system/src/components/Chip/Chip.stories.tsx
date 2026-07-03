import type { Meta, StoryObj } from '@storybook/react';
import { Chip } from './Chip';

const meta: Meta<typeof Chip> = {
  title: 'Átomos/Chip',
  component: Chip,
  tags: ['autodocs'],
  args: { children: '5K', active: false },
};

export default meta;
type Story = StoryObj<typeof Chip>;

export const Default: Story = {};

export const Ativo: Story = { args: { active: true } };

export const Removivel: Story = {
  args: { children: 'Florianópolis', onRemove: () => undefined },
};

export const Disabled: Story = { args: { disabled: true } };

export const GrupoDeFiltros: Story = {
  render: () => (
    <div className="flex flex-wrap gap-[var(--spacing-2)]" role="listbox" aria-label="Modalidades">
      <Chip active>5K</Chip>
      <Chip>10K</Chip>
      <Chip>21K</Chip>
      <Chip>42K</Chip>
      <Chip disabled>Kids</Chip>
    </div>
  ),
};
