import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Feedback/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Texto: Story = { args: { variant: 'text' } };

export const Retangulo: Story = {
  render: () => <Skeleton variant="rect" className="h-[var(--header-height)] w-full" />,
};

export const Circulo: Story = {
  render: () => (
    <Skeleton variant="circle" className="h-[var(--avatar-size-lg)] w-[var(--avatar-size-lg)]" />
  ),
};

/** Loading de lista: linhas de tabela em skeleton — nunca spinner solto (DoD). */
export const ListaCarregando: Story = {
  render: () => (
    <div className="flex flex-col gap-[var(--spacing-3)] w-[var(--modal-width-lg)]">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex items-center gap-[var(--spacing-4)] h-[var(--table-row-height)]">
          <Skeleton variant="circle" className="h-[var(--avatar-size-md)] w-[var(--avatar-size-md)]" />
          <div className="flex flex-col gap-[var(--spacing-2)] flex-1">
            <Skeleton variant="text" className="w-1/3" />
            <Skeleton variant="text" className="w-1/5" />
          </div>
          <Skeleton variant="rect" className="h-[var(--badge-height)] w-[var(--btn-height-lg)]" />
        </div>
      ))}
    </div>
  ),
};
