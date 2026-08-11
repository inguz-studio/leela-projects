import type { Meta, StoryObj } from '@storybook/react';
import { DonutChart } from './DonutChart';

/**
 * Composição de UM total. Se a comparação é entre categorias independentes, o
 * canônico é o `BarChart` — o cânone §12 separa os dois. O `aria-label` vira o
 * caption da tabela `sr-only` pareada.
 */
const meta: Meta<typeof DonutChart> = {
  title: 'Data/DonutChart',
  component: DonutChart,
};

export default meta;
type Story = StoryObj<typeof DonutChart>;

export const Default: Story = {
  args: {
    'aria-label': 'Receita por forma de pagamento',
    data: [
      { label: 'Pix', value: 52_300 },
      { label: 'Cartão', value: 28_900 },
      { label: 'Boleto', value: 4_400 },
    ],
  },
};

/** O valor central é o que a pessoa veio ler; a rosca só o decompõe. */
export const ComCentro: Story = {
  args: {
    'aria-label': 'Receita por forma de pagamento',
    centerValue: 'R$ 85,6k',
    centerLabel: 'recebido',
    data: [
      { label: 'Pix', value: 52_300 },
      { label: 'Cartão', value: 28_900 },
      { label: 'Boleto', value: 4_400 },
    ],
  },
};

export const DuasFatias: Story = {
  args: {
    'aria-label': 'Situação das inscrições',
    centerValue: '1.019',
    centerLabel: 'inscrições',
    data: [
      { label: 'Pagas', value: 874 },
      { label: 'Pendentes', value: 145 },
    ],
  },
};

export const ValorFormatado: Story = {
  args: {
    'aria-label': 'Receita por forma de pagamento',
    size: 240,
    formatValue: (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }),
    data: [
      { label: 'Pix', value: 52_300 },
      { label: 'Cartão', value: 28_900 },
      { label: 'Boleto', value: 4_400 },
    ],
  },
};

export const Vazio: Story = {
  args: { 'aria-label': 'Receita por forma de pagamento', data: [] },
};
