import type { Meta, StoryObj } from '@storybook/react';
import { FormGrid } from './FormGrid';
import { Input } from '../Input';

const meta: Meta<typeof FormGrid> = {
  title: 'Moldura/FormGrid',
  component: FormGrid,
  argTypes: {
    columns: { control: 'inline-radio', options: [2, 3] },
    from: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    gap: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof FormGrid>;

export const Default: Story = {
  render: (args) => (
    <FormGrid {...args}>
      <Input label="Nome do evento" placeholder="Meia Floripa" />
      <Input label="Cidade" placeholder="Florianópolis" />
      <Input label="Data" placeholder="12/10/2026" />
      <Input label="Vagas" placeholder="1200" />
    </FormGrid>
  ),
};

/** Três colunas — a segunda receita mais usada do painel (10 ocorrências). */
export const TresColunas: Story = {
  args: { columns: 3 },
  render: (args) => (
    <FormGrid {...args}>
      <Input label="PP" placeholder="40" />
      <Input label="M" placeholder="120" />
      <Input label="GG" placeholder="80" />
    </FormGrid>
  ),
};

/**
 * Campo de linha inteira: `col-span-full` no filho. Não há prop para isso de
 * propósito — um `span` acoplado a `columns` e a `from` seria uma quarta coisa
 * para manter em sincronia.
 */
export const CampoDeLinhaInteira: Story = {
  render: () => (
    <FormGrid>
      <Input label="Nome" placeholder="Meia Floripa" />
      <Input label="Apelido" placeholder="Meia" />
      <div className="col-span-full">
        <Input
          label="Observações"
          placeholder="Ocupa a linha inteira em qualquer contagem de coluna"
        />
      </div>
    </FormGrid>
  ),
};
