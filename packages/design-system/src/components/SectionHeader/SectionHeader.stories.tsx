import type { Meta, StoryObj } from '@storybook/react';
import { HelpCircle } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { Card, CardContent } from '../Card';
import { Chip } from '../Chip';
import { IconButton } from '../IconButton';

const meta: Meta<typeof SectionHeader> = {
  title: 'Moldura/SectionHeader',
  component: SectionHeader,
  argTypes: {
    titleAs: { control: 'inline-radio', options: ['h2', 'h3', 'h4'] },
  },
};

export default meta;
type Story = StoryObj<typeof SectionHeader>;

export const Default: Story = {
  args: { title: 'Situação dos membros' },
};

export const ComContexto: Story = {
  args: {
    title: 'Situação dos membros',
    description: 'Quem entrou nos últimos 30 dias e quem ficou.',
  },
};

/**
 * Os três slots. A anatomia (eyebrow, ritmo, alinhamento) é do design system;
 * o que é interativo entra por slot e fica com o consumidor — é essa fronteira
 * que mantém a peça pura e, por isso, utilizável em Server Component.
 */
export const ComSlots: Story = {
  render: () => (
    <Card>
      <CardContent className="pt-[var(--spacing-6)]">
        <SectionHeader
          title="Inscrições por dia"
          description="Últimos 30 dias, por data de confirmação."
          help={
            <IconButton aria-label='O que "Inscrições por dia" mostra'>
              <HelpCircle aria-hidden />
            </IconButton>
          }
          control={<Chip active>30 dias</Chip>}
          action={
            <a
              href="#ver-tudo"
              className="text-[length:var(--section-link-size)] text-[var(--text-tertiary)]"
            >
              Ver tudo
            </a>
          }
        />
        <p className="text-[length:var(--font-size-base)] text-[var(--text-secondary)]">
          O conteúdo do bloco entra aqui.
        </p>
      </CardContent>
    </Card>
  ),
};

/** Nível de heading é navegação de leitor de tela, não tamanho de letra. */
export const NiveisDeHeading: Story = {
  render: () => (
    <div className="flex flex-col gap-[var(--layout-main-gap)]">
      {(['h2', 'h3', 'h4'] as const).map((titleAs) => (
        <SectionHeader key={titleAs} title={`Bloco como ${titleAs}`} titleAs={titleAs} />
      ))}
    </div>
  ),
};
