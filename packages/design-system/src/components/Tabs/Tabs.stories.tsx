import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from './Tabs';

const meta: Meta<typeof Tabs> = {
  title: 'Fluxo/Tabs',
  component: Tabs,
};

export default meta;
type Story = StoryObj<typeof Tabs>;

/** §2.7: todos os painéis permanecem no DOM (inativos ocultos). Underline Brasa 2px na ativa (§2.14). */
export const Default: Story = {
  render: () => (
    <Tabs
      aria-label="Seções do evento"
      tabs={[
        {
          id: 'inscritos',
          label: 'Inscritos',
          count: 1284,
          content: <p className="text-[var(--text-secondary)]">Lista de inscritos…</p>,
        },
        {
          id: 'kits',
          label: 'Kits',
          count: 3,
          content: <p className="text-[var(--text-secondary)]">Kit Básico, Kit Completo…</p>,
        },
        {
          id: 'resultados',
          label: 'Resultados',
          content: <p className="text-[var(--text-secondary)]">Resultados da prova…</p>,
        },
      ]}
    />
  ),
};

export const SemContadores: Story = {
  render: () => (
    <Tabs
      tabs={[
        { id: 'sobre', label: 'Sobre', content: <p>Sobre o evento</p> },
        { id: 'percurso', label: 'Percurso', content: <p>Mapa do percurso</p> },
      ]}
    />
  ),
};
