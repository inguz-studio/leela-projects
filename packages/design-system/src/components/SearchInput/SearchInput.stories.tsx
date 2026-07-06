import type { Meta, StoryObj } from '@storybook/react';
import { SearchInput } from './SearchInput';

const meta: Meta<typeof SearchInput> = {
  title: 'Átomos/SearchInput',
  component: SearchInput,
  args: {
    placeholder: 'Buscar atleta, evento, inscrição…',
    shortcutLabel: '⌘K',
  },
};

export default meta;
type Story = StoryObj<typeof SearchInput>;

export const Default: Story = {};

export const SemAtalho: Story = {
  args: { shortcutLabel: null },
};

export const Focused: Story = {
  play: async ({ canvasElement }) => {
    canvasElement.querySelector('input')?.focus();
  },
};
