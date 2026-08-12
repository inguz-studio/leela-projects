import type { Meta, StoryObj } from '@storybook/react';
import { SplitPanel } from './SplitPanel';
import { Card, CardContent, CardHeader, CardTitle } from '../Card';

const meta: Meta<typeof SplitPanel> = {
  title: 'Moldura/SplitPanel',
  component: SplitPanel,
  argTypes: {
    ratio: { control: 'inline-radio', options: ['3:2', '7:3', '1:3'] },
    gap: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof SplitPanel>;

function Painel({ titulo, linhas }: { titulo: string; linhas: number }): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-[var(--spacing-2)]">
        {Array.from({ length: linhas }, (_, i) => (
          <span key={i} className="text-[length:var(--font-size-base)] text-[var(--text-secondary)]">
            Linha {i + 1}
          </span>
        ))}
      </CardContent>
    </Card>
  );
}

export const Default: Story = {
  render: (args) => (
    <SplitPanel {...args}>
      <Painel titulo="Inscrições por dia" linhas={5} />
      <Painel titulo="Alertas" linhas={3} />
    </SplitPanel>
  ),
};

/**
 * As três proporções medidas no painel em 2026-08-11 (§7.1) — e o conjunto é
 * fechado nelas. Uma quarta entra por token novo e linha no cânone, no mesmo
 * commit, nunca por `className` de tela: foi assim que nasceram as cinco
 * receitas que este componente aposentou.
 */
export const Proporcoes: Story = {
  render: () => (
    <div className="flex flex-col gap-[var(--layout-main-gap)]">
      {(['3:2', '7:3', '1:3'] as const).map((ratio) => (
        <div key={ratio} className="flex flex-col gap-[var(--spacing-2)]">
          <span className="text-[length:var(--font-size-sm)] uppercase tracking-[var(--section-eyebrow-spacing)] text-[var(--text-tertiary)]">
            ratio={ratio}
          </span>
          <SplitPanel ratio={ratio}>
            <Painel titulo="Principal" linhas={3} />
            <Painel titulo="Apoio" linhas={2} />
          </SplitPanel>
        </div>
      ))}
    </div>
  ),
};
