import type { Meta, StoryObj } from '@storybook/react';
import { ResultCount } from './ResultCount';

const meta: Meta<typeof ResultCount> = {
  title: 'Filtros/ResultCount',
  component: ResultCount,
  argTypes: {
    live: { control: 'inline-radio', options: ['status', 'none'] },
  },
  args: {
    substantivo: { singular: 'comunicado', plural: 'comunicados' },
  },
};

export default meta;
type Story = StoryObj<typeof ResultCount>;

/** O total é conhecido: a lista inteira está em memória e "de N" é verdade. */
export const Default: Story = {
  args: { visiveis: 12, total: 40 },
};

/**
 * Cursor aberto. A frase muda de natureza porque o total NÃO existe — a query
 * nunca o computou. Dez das doze instâncias medidas afirmavam um total que só
 * era verdade porque a lista era pequena.
 */
export const ComMaisParaCarregar: Story = {
  args: { visiveis: 20, temMais: true },
};

/** Cursor fechado: o carregado é o total do recorte porque a paginação acabou. */
export const FimDaLista: Story = {
  args: { visiveis: 37 },
};

/** Concordância no singular, nas três formas. */
export const Singular: Story = {
  render: (args) => (
    <div className="flex flex-col gap-[var(--spacing-2)]">
      <ResultCount {...args} visiveis={1} total={1} />
      <ResultCount {...args} visiveis={1} temMais />
      <ResultCount {...args} visiveis={1} />
    </div>
  ),
};
