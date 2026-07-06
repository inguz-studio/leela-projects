import type { Meta, StoryObj } from '@storybook/react';
import { SearchX } from 'lucide-react';
import { EmptyState } from './EmptyState';
import { Button } from '../Button';

const meta: Meta<typeof EmptyState> = {
  title: 'Feedback/EmptyState',
  component: EmptyState,
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

/** Mensagem padrão de lista filtrável (C7). */
export const Default: Story = {};

/** Com CTA de recuperação — "Limpar filtros" (DoD Tela). */
export const ComAcao: Story = {
  args: {
    title: 'Nenhum inscrito encontrado com os filtros aplicados',
    description: 'Ajuste os filtros ou limpe a busca.',
    action: <Button variant="ghost">Limpar filtros</Button>,
  },
};

/** Com ícone ilustrativo (40% de opacidade, aria-hidden). */
export const ComIcone: Story = {
  args: {
    icon: (
      <SearchX
        aria-hidden
        className="w-[var(--icon-size)] h-[var(--icon-size)] [stroke-width:var(--icon-stroke)]"
      />
    ),
  },
};

/** Título igual à descrição: a linha duplicada é suprimida. */
export const SoTitulo: Story = {
  args: {
    title: 'Nenhum kit cadastrado',
    description: 'Nenhum kit cadastrado',
  },
};
