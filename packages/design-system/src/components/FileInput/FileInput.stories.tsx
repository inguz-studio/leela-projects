import type { Meta, StoryObj } from '@storybook/react';
import { FileInput } from './FileInput';

const meta: Meta<typeof FileInput> = {
  title: 'Átomos/FileInput',
  component: FileInput,
  args: {
    label: 'Enviar foto',
    hint: 'JPG, PNG, WebP, GIF ou AVIF até 5MB.',
    onFileSelected: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof FileInput>;

export const Default: Story = {};

export const Busy: Story = {
  args: { busy: true },
};

export const ComErro: Story = {
  args: { errorMessage: 'A imagem deve ter no máximo 5MB.' },
};

export const Disabled: Story = {
  args: { disabled: true },
};
