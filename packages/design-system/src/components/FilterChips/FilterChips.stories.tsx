import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { FilterChips } from './FilterChips';
import { SearchInput } from '../SearchInput';

const meta: Meta<typeof FilterChips> = {
  title: 'Filtros/FilterChips',
  component: FilterChips,
  argTypes: {
    multiple: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof FilterChips>;

const STATUS = [
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'agendado', label: 'Agendado' },
  { id: 'enviado', label: 'Enviado' },
];

const CANAIS = [
  { id: 'email', label: 'E-mail' },
  { id: 'push', label: 'Push' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'sms', label: 'SMS' },
  { id: 'mural', label: 'Mural' },
];

/** Wrapper de estado — a faceta é controlada, como toda peça de filtro do DS. */
function Faceta(props: Omit<React.ComponentProps<typeof FilterChips>, 'selected' | 'onChange'>) {
  const [selected, setSelected] = React.useState<string[]>([]);
  return <FilterChips {...props} selected={selected} onChange={setSelected} />;
}

/** Faceta exclusiva: um recorte por vez, e "Todos" é a saída visível. */
export const Default: Story = {
  render: () => <Faceta label="Status" options={STATUS} />,
};

/** Faceta empilhável: marca vários, e o gatilho resume quantos. */
export const Empilhavel: Story = {
  render: () => <Faceta label="Canal" options={STATUS} multiple />,
};

/** A contagem por opção — o dialeto que a faceta de inscritos já usava. */
export const ComContagem: Story = {
  render: () => (
    <Faceta
      label="Status"
      allCount={64}
      options={[
        { id: 'pago', label: 'Pago', count: 41 },
        { id: 'pendente', label: 'Pendente', count: 18 },
        { id: 'cancelado', label: 'Cancelado', count: 5 },
      ]}
    />
  ),
};

/**
 * A FORMA NÃO MUDA COM A CONTAGEM (decisão do dono, 17/08, leva 20). Três e
 * cinco valores desenham a mesma coisa: empilhável é `FilterMenu`, exclusiva é
 * `Combobox`. Até 16/08 esta story se chamava "AcimaDoLimiar" e existia para
 * mostrar a troca de desenho aos quatro valores — o limiar morreu, e ela passou
 * a provar o contrário: que não há troca.
 */
export const QualquerContagem: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-[var(--spacing-4)]">
      <Faceta label="Canal" options={CANAIS} multiple />
      <Faceta label="Canal" options={CANAIS} />
      <Faceta label="Status" options={STATUS} multiple />
      <Faceta label="Status" options={STATUS} />
    </div>
  ),
};

/**
 * O padrão INTEIRO, que é o que o dono pediu: a faceta ao lado do campo de
 * pesquisa, numa fileira só. A `FilterBar` é quem hospeda — esta story existe
 * para o desenho ser conferível sem abrir o painel.
 */
export const AoLadoDaPesquisa: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-[var(--spacing-3)]">
      <SearchInput aria-label="Buscar por nome" placeholder="Buscar por nome" shortcutLabel={null} />
      <Faceta label="Status" options={STATUS} />
      <Faceta label="Canal" options={CANAIS} multiple />
    </div>
  ),
};
