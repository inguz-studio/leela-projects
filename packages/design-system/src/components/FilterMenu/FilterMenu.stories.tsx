import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FilterMenu, type FilterMenuOption } from './FilterMenu';

const STATUS_OPTIONS: FilterMenuOption[] = [
  { id: 'ativos', label: 'Ativos', count: 4 },
  { id: 'encerrados', label: 'Encerrados', count: 2 },
  { id: 'rascunhos', label: 'Rascunhos', count: 1 },
];

const meta: Meta<typeof FilterMenu> = {
  title: 'Organismos/FilterMenu',
  component: FilterMenu,
  args: { label: 'Status', options: STATUS_OPTIONS },
};

export default meta;
type Story = StoryObj<typeof FilterMenu>;

function FilterMenuDemo({
  label = 'Status',
  options = STATUS_OPTIONS,
  initial = [],
}: {
  label?: string;
  options?: FilterMenuOption[];
  initial?: string[];
}): React.JSX.Element {
  const [selected, setSelected] = React.useState<string[]>(initial);
  return <FilterMenu label={label} options={options} selected={selected} onChange={setSelected} />;
}

/**
 * Faceta 4+ (limiar Polaris) como checkbox em lista multi-seleção. Vazio =
 * "Todos"; marcar mostra "Status: N". Cada opção traz a contagem à direita.
 */
export const Default: Story = { render: () => <FilterMenuDemo /> };

/** Com uma seleção inicial — o gatilho resume "Status: 1". */
export const ComSelecao: Story = {
  render: () => <FilterMenuDemo initial={['ativos']} />,
};

/** Sem contadores por opção (faceta simples). */
export const SemContagem: Story = {
  render: () => (
    <FilterMenuDemo
      label="Modalidade"
      options={[
        { id: 'corrida', label: 'Corrida' },
        { id: 'ciclismo', label: 'Ciclismo' },
        { id: 'yoga', label: 'Yoga' },
        { id: 'crossfit', label: 'CrossFit' },
      ]}
    />
  ),
};
