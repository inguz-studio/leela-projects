import type { Meta, StoryObj } from '@storybook/react';
import { BarChart } from './BarChart';

/**
 * Série categórica. O `aria-label` é obrigatório porque vira o caption da
 * tabela `sr-only` pareada — o gráfico nunca é a única via para o dado.
 *
 * O rótulo do eixo trunca em 13 caracteres para não vazar por cima da barra
 * vizinha (92px de eixo); a identidade completa segue no tooltip e na tabela.
 */
const meta: Meta<typeof BarChart> = {
  title: 'Data/BarChart',
  component: BarChart,
};

export default meta;
type Story = StoryObj<typeof BarChart>;

export const Default: Story = {
  args: {
    'aria-label': 'Inscrições por modalidade',
    data: [
      { label: '5 km', value: 320 },
      { label: '10 km', value: 512 },
      { label: '21 km', value: 187 },
    ],
  },
};

/** Com `total`, a barra ganha "x / total" e a porcentagem no tooltip. */
export const ComTotal: Story = {
  args: {
    'aria-label': 'Ocupação por lote',
    data: [
      { label: '1º lote', value: 500, total: 500 },
      { label: '2º lote', value: 342, total: 500 },
      { label: '3º lote', value: 61, total: 500 },
    ],
  },
};

/** Rótulo longo: trunca no eixo, inteiro no tooltip e na tabela equivalente. */
export const RotuloLongo: Story = {
  args: {
    'aria-label': 'Inscrições por assessoria',
    data: [
      { label: 'Assessoria Corrida Livre Floripa', value: 128 },
      { label: 'Equipe Trilha Norte', value: 96 },
      { label: 'Run Club', value: 54 },
    ],
  },
};

export const ValorFormatado: Story = {
  args: {
    'aria-label': 'Receita por modalidade',
    height: 260,
    formatValue: (v: number) =>
      v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }),
    data: [
      { label: '5 km', value: 31_680 },
      { label: '10 km', value: 61_440 },
      { label: '21 km', value: 28_050 },
    ],
  },
};

export const Vazio: Story = {
  args: { 'aria-label': 'Inscrições por modalidade', data: [] },
};
