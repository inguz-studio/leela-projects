import type { Meta, StoryObj } from '@storybook/react';
import { Breadcrumb } from './Breadcrumb';

const meta: Meta<typeof Breadcrumb> = {
  title: 'Organismos/Breadcrumb',
  component: Breadcrumb,
  args: {
    items: [
      { label: 'Eventos', href: '#' },
      { label: 'Meia Maratona de Floripa', href: '#' },
      { label: 'Inscritos' },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof Breadcrumb>;

/** Trilha completa: links intermediários + item atual com aria-current="page". */
export const Default: Story = {};

/** Dois níveis — padrão das rotas de detalhe do painel. */
export const DoisNiveis: Story = {
  args: {
    items: [
      { label: 'Eventos', href: '#' },
      { label: 'Meia Maratona de Floripa' },
    ],
  },
};

/** Item intermediário sem href vira texto estático (não clicável). */
export const ComItemSemLink: Story = {
  args: {
    items: [
      { label: 'Eventos', href: '#' },
      { label: 'Arquivados' },
      { label: 'Corrida do Sol' },
    ],
  },
};
