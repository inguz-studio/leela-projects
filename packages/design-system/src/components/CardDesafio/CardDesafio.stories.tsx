import type { Meta, StoryObj } from '@storybook/react';
import { CardDesafio } from './CardDesafio';

const meta: Meta<typeof CardDesafio> = {
  title: 'Cards/CardDesafio',
  component: CardDesafio,
  args: {
    title: 'Desafio 100km no mês',
    progress: 62,
    meta: <span>18 dias restantes · 240 participantes</span>,
  },
};

export default meta;
type Story = StoryObj<typeof CardDesafio>;

/** Progress bar em Vitória (feedback-success). */
export const EmAndamento: Story = {
  render: (args) => (
    <div className="w-[var(--modal-width-sm)]">
      <CardDesafio {...args} />
    </div>
  ),
};

/** 100% → glow elev-brand no card. */
export const Concluido: Story = {
  render: () => (
    <div className="w-[var(--modal-width-sm)]">
      <CardDesafio
        title="Desafio 100km no mês"
        progress={100}
        meta={<span>Concluído em 22 dias</span>}
      />
    </div>
  ),
};

export const Progressoes: Story = {
  render: () => (
    <div className="flex flex-col gap-[var(--spacing-4)] w-[var(--modal-width-sm)]">
      {[0, 25, 62, 100].map((progress) => (
        <CardDesafio key={progress} title={`Desafio — ${progress}%`} progress={progress} />
      ))}
    </div>
  ),
};
