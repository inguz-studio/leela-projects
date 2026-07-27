import type { Meta, StoryObj } from '@storybook/react';
import { ImageOff } from 'lucide-react';
import { Thumb } from './Thumb';

const meta: Meta<typeof Thumb> = {
  title: 'Átomos/Thumb',
  component: Thumb,
  args: { size: 'sm', ratio: 'square' },
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    ratio: { control: 'select', options: ['square', 'wide'] },
  },
};

export default meta;
type Story = StoryObj<typeof Thumb>;

const LOGO = 'https://placehold.co/200x200/1a1a1a/ff450c?text=CDL';
const CAPA = 'https://placehold.co/760x400/1a1a1a/ff450c?text=Capa';

export const ComImagem: Story = { args: { src: LOGO } };

export const SemImagem: Story = { args: { fallback: 'CDL' } };

export const FallbackComIcone: Story = { args: { fallback: <ImageOff /> } };

export const Tamanhos: Story = {
  render: () => (
    <div className="flex items-end gap-[var(--spacing-4)]">
      <Thumb size="sm" src={LOGO} />
      <Thumb size="md" src={LOGO} />
      <Thumb size="lg" src={LOGO} />
    </div>
  ),
};

export const Proporcoes: Story = {
  render: () => (
    <div className="flex items-end gap-[var(--spacing-4)]">
      <Thumb size="lg" ratio="square" src={LOGO} />
      <Thumb size="lg" ratio="wide" src={CAPA} lazy={false} />
    </div>
  ),
};

/** Lado a lado: com imagem, sem imagem e o fallback de ícone, no mesmo ritmo. */
export const NaListagem: Story = {
  render: () => (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      {[
        { nome: 'Kit Prata', src: LOGO },
        { nome: 'Kit Ouro', src: undefined },
        { nome: 'Sem kit', src: undefined },
      ].map((item) => (
        <div
          key={item.nome}
          className="flex items-center gap-[var(--spacing-3)] rounded-[var(--radius-lg)] bg-[var(--surface-raised)] p-[var(--spacing-3)]"
        >
          <Thumb src={item.src} fallback={item.nome.charAt(0)} />
          <span className="text-[var(--text-primary)]">{item.nome}</span>
        </div>
      ))}
    </div>
  ),
};
