import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

/**
 * Escolha única de baixa cardinalidade dentro de formulário — até ~7 opções
 * conhecidas, sem busca. Filtro de lista NUNCA é `Select` (é `FilterMenu`), e
 * busca com cardinalidade alta é `Combobox`. A fronteira está no cânone §1.
 */
const meta: Meta<typeof Select> = {
  title: 'Átomos/Select',
  component: Select,
  args: {
    label: 'Modalidade',
    options: [
      { value: '5k', label: '5 km' },
      { value: '10k', label: '10 km' },
      { value: '21k', label: '21 km' },
    ],
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {};

export const Flat: Story = {
  args: { variant: 'flat', defaultValue: '10k' },
};

/** Opt-out §2.16 — borda como identificador quando o fill encosta no fundo. */
export const Bordered: Story = {
  args: { variant: 'bordered', defaultValue: '10k' },
};

export const Desabilitado: Story = {
  args: { disabled: true, defaultValue: '21k' },
};

export const SemLabelVisivel: Story = {
  render: () => (
    <Select
      aria-label="Tamanho da camiseta"
      options={[
        { value: 'p', label: 'P' },
        { value: 'm', label: 'M' },
        { value: 'g', label: 'G' },
      ]}
    />
  ),
};
