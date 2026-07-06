import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Átomos/Input',
  component: Input,
  args: { label: 'Nome do evento', placeholder: 'Meia Maratona de Floripa' },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {};

export const Invalido: Story = {
  args: {
    id: 'evento-nome',
    errorMessage: 'Informe um nome com pelo menos 3 caracteres.',
    defaultValue: 'Ab',
  },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'Campo bloqueado' },
};

export const SemLabelVisivel: Story = {
  render: () => <Input aria-label="Buscar inscritos" placeholder="Buscar…" />,
};
