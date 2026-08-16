import type { Meta, StoryObj } from '@storybook/react';
import { DefinitionItem } from './DefinitionItem';

const meta: Meta<typeof DefinitionItem> = {
  title: 'Layout/DefinitionItem',
  component: DefinitionItem,
  args: { label: 'Nome', value: 'Marina Castelo' },
};

export default meta;
type Story = StoryObj<typeof DefinitionItem>;

export const Default: Story = {};

/** `value` ausente (`undefined`) cai no `emptyLabel` default. */
export const SemDado: Story = {
  args: { label: 'Telefone', value: undefined },
};

/**
 * Ausência com causa nomeada — o caso de `FichaDoClienteDrawer`, onde cada
 * campo diz de onde o dado viria e por que não veio.
 */
export const AusenciaComCausa: Story = {
  args: {
    label: 'CPF',
    value: null,
    emptyLabel:
      'Não coletado. O CPF vem dos dados pessoais da inscrição, e nenhuma inscrição desta pessoa guarda o campo.',
  },
};

/** Tamanho `sm` — a ficha densa, muitos campos numa coluna estreita. */
export const TamanhoSm: Story = {
  args: { label: 'E-mail', value: 'marina@demo.dev', size: 'sm' },
};

/** Grupo de itens, como `ResponsavelCard` e `FichaDoClienteDrawer` já usam. */
export const EmGrade: Story = {
  render: () => (
    <dl className="grid grid-cols-2 gap-[var(--spacing-4)]">
      <DefinitionItem label="Nome" value="Marina Castelo" />
      <DefinitionItem label="E-mail" value="marina@demo.dev" />
      <DefinitionItem label="Telefone" value={undefined} />
      <DefinitionItem label="Organização" value="Castelo Produções" />
    </dl>
  ),
};
