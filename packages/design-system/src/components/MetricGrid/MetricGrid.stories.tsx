import type { Meta, StoryObj } from '@storybook/react';
import { MetricGrid } from './MetricGrid';
import { KpiCard } from '../KpiCard';

const meta: Meta<typeof MetricGrid> = {
  title: 'Moldura/MetricGrid',
  component: MetricGrid,
  argTypes: {
    columns: { control: 'inline-radio', options: [2, 3, 4] },
    gap: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
};

export default meta;
type Story = StoryObj<typeof MetricGrid>;

export const Default: Story = {
  render: (args) => (
    <MetricGrid {...args}>
      <KpiCard label="Inscritos" value="1.284" hint="vs. 7 dias" />
      <KpiCard label="Pagos" value="1.102" />
      <KpiCard label="Pendentes" value="182" tone="danger" />
      <KpiCard label="Receita" value="R$ 42.180,00" />
    </MetricGrid>
  ),
};

export const TresIndicadores: Story = {
  args: { columns: 3 },
  render: (args) => (
    <MetricGrid {...args}>
      <KpiCard label="Inscrições atribuídas" value="86" />
      <KpiCard label="Valor atribuído" value="R$ 9.420,00" />
      <KpiCard label="Comissão acumulada" value="R$ 942,00" />
    </MetricGrid>
  ),
};

export const DoisIndicadores: Story = {
  args: { columns: 2 },
  render: (args) => (
    <MetricGrid {...args}>
      <KpiCard label="Membros ativos" value="312" />
      <KpiCard label="Desafios ativos" value="4" />
    </MetricGrid>
  ),
};
