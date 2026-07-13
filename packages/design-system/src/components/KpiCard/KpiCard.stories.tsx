import type { Meta, StoryObj } from '@storybook/react';
import { KpiCard } from './KpiCard';

const meta: Meta<typeof KpiCard> = {
  title: 'Data/KpiCard',
  component: KpiCard,
  args: { label: 'Inscritos', value: '1.284' },
  argTypes: {
    emphasis: { control: 'inline-radio', options: ['default', 'critico'] },
    tone: { control: 'inline-radio', options: ['default', 'danger'] },
  },
};

export default meta;
type Story = StoryObj<typeof KpiCard>;

/** Card flat padrão (§2.16): label + valor. */
export const Padrao: Story = {};

/** Com hint abaixo do valor. */
export const ComHint: Story = {
  args: { label: 'Receita confirmada', value: 'R$ 42.180', hint: 'vs. 7 dias' },
};

/** tone="danger" pinta o valor (ex.: KPI "Em risco"). */
export const ValorEmRisco: Story = {
  args: { label: 'Em risco', value: '3', hint: 'kit(s) esgotado(s)', tone: 'danger' },
};

/** emphasis="critico" — borda-esquerda Vulcão (única exceção ao flat §2.16). */
export const Critico: Story = {
  args: { label: 'Pagamentos falhos', value: '7', emphasis: 'critico' },
};

/** A fileira real: KpiCards fluidos num grid responsivo do consumidor. */
export const FileiraResponsiva: Story = {
  render: () => (
    <section
      aria-label="Indicadores consolidados"
      className="grid grid-cols-1 gap-[var(--spacing-4)] sm:grid-cols-2 lg:grid-cols-4"
    >
      <KpiCard label="Inscritos" value="1.284" hint="vs. 7 dias" />
      <KpiCard label="Receita confirmada" value="R$ 42.180" hint="vs. 7 dias" />
      <KpiCard label="Vagas restantes" value="—" hint="capacidade desconhecida" />
      <KpiCard label="Em risco" value="3" hint="kit(s) esgotado(s)" tone="danger" />
    </section>
  ),
};
