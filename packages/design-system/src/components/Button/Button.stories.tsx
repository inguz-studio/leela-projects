import type { Meta, StoryObj } from '@storybook/react';
import { Plus } from 'lucide-react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Átomos/Button',
  component: Button,
  args: { children: 'Publicar evento', variant: 'primary', size: 'md' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'destructive'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'icon'] },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {};

export const Secondary: Story = { args: { variant: 'secondary' } };

export const Ghost: Story = { args: { variant: 'ghost' } };

export const Destructive: Story = {
  args: { variant: 'destructive', children: 'Cancelar evento' },
};

export const Disabled: Story = { args: { disabled: true } };

export const Tamanhos: Story = {
  render: () => (
    <div className="flex items-center gap-[var(--spacing-3)]">
      <Button size="sm">Pequeno</Button>
      <Button size="md">Médio</Button>
      <Button size="lg">Grande</Button>
      <Button size="icon" aria-label="Novo evento">
        <Plus aria-hidden />
      </Button>
    </div>
  ),
};

/** Size `icon` (T3): quadrado 36×36 p-0 — participa da tríade de cor dos variants. */
export const SizeIcon: Story = {
  args: {
    size: 'icon',
    'aria-label': 'Novo evento',
    children: <Plus aria-hidden />,
  },
};

export const TodasAsVariantes: Story = {
  render: () => (
    <div className="flex flex-col gap-[var(--spacing-4)]">
      {(['primary', 'secondary', 'ghost', 'destructive'] as const).map((variant) => (
        <div key={variant} className="flex items-center gap-[var(--spacing-3)]">
          <Button variant={variant}>Ação</Button>
          <Button variant={variant} disabled>
            Desabilitado
          </Button>
        </div>
      ))}
    </div>
  ),
};
