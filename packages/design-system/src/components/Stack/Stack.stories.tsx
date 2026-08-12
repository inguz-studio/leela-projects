import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from './Stack';

const meta: Meta<typeof Stack> = {
  title: 'Moldura/Stack',
  component: Stack,
  argTypes: {
    gap: { control: 'select', options: ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
    align: { control: 'select', options: ['stretch', 'start', 'center', 'end'] },
    as: { control: 'select', options: ['div', 'section', 'article', 'ul', 'ol', 'form'] },
  },
};

export default meta;
type Story = StoryObj<typeof Stack>;

function Bloco({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="rounded-ds-sm bg-[var(--surface-overlay)] px-[var(--spacing-3)] py-[var(--spacing-2)] text-[length:var(--font-size-base)] text-[var(--text-secondary)]">
      {children}
    </div>
  );
}

export const Default: Story = {
  render: (args) => (
    <Stack {...args}>
      <Bloco>Primeiro bloco</Bloco>
      <Bloco>Segundo bloco</Bloco>
      <Bloco>Terceiro bloco</Bloco>
    </Stack>
  ),
};

/**
 * Os seis degraus, lado a lado. Cada um é um `--spacing` que a medição de
 * 2026-08-11 encontrou escrito à mão no painel; `--spacing-5` ficou de fora
 * porque não tem papel declarado na moldura.
 */
export const Ritmos: Story = {
  render: () => (
    <div className="flex flex-wrap gap-[var(--spacing-8)]">
      {(['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl'] as const).map((gap) => (
        <Stack key={gap} gap="xs" className="w-[var(--search-width)]">
          <span className="text-[length:var(--font-size-sm)] uppercase tracking-[var(--section-eyebrow-spacing)] text-[var(--text-tertiary)]">
            gap={gap}
          </span>
          <Stack gap={gap}>
            <Bloco>um</Bloco>
            <Bloco>dois</Bloco>
            <Bloco>três</Bloco>
          </Stack>
        </Stack>
      ))}
    </div>
  ),
};

export const Alinhamento: Story = {
  render: () => (
    <Stack gap="xl">
      {(['stretch', 'start', 'center', 'end'] as const).map((align) => (
        <Stack key={align} gap="xs">
          <span className="text-[length:var(--font-size-sm)] uppercase tracking-[var(--section-eyebrow-spacing)] text-[var(--text-tertiary)]">
            align={align}
          </span>
          <Stack gap="sm" align={align}>
            <Bloco>curto</Bloco>
            <Bloco>um bloco bem mais comprido que o vizinho</Bloco>
          </Stack>
        </Stack>
      ))}
    </Stack>
  ),
};

/** `as="ul"` quando a pilha é uma lista de verdade — layout não decide semântica. */
export const ComoLista: Story = {
  render: () => (
    <Stack as="ul" gap="sm">
      <li>
        <Bloco>Item de lista</Bloco>
      </li>
      <li>
        <Bloco>Outro item</Bloco>
      </li>
    </Stack>
  ),
};
