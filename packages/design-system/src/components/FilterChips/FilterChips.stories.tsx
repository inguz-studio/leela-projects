import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { FilterChips } from './FilterChips';

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

/** Menos de quatro valores: a fileira mostra tudo de uma vez. */
export const Default: Story = {
  render: () => <Faceta label="Filtrar por status" options={STATUS} />,
};

/**
 * Faceta empilhável abaixo do limiar: sem chip de "Todos", porque seleção
 * vazia já é o estado "tudo" e cada chip destrava sozinho.
 */
export const Empilhavel: Story = {
  render: () => <Faceta label="Filtrar por canal" options={STATUS} multiple />,
};

/** A contagem por opção — o dialeto que a faceta de inscritos já usava. */
export const ComContagem: Story = {
  render: () => (
    <Faceta
      label="Filtrar por status"
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
 * A partir de quatro valores a peça troca sozinha de desenho: empilhável vira
 * `FilterMenu`, exclusiva vira `Combobox`. É o limiar do cânone §1 fechado por
 * construção — a tela não escolhe, e por isso não erra.
 */
export const AcimaDoLimiar: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-[var(--spacing-4)]">
      <Faceta label="Canal" options={CANAIS} multiple />
      <Faceta label="Canal" options={CANAIS} />
    </div>
  ),
};
