import type { Meta, StoryObj } from '@storybook/react';
import { Sparkline } from './Sparkline';

// Série do mockup be-hero (Taxa de conversão, Painel do Organizador)
const SERIE_MOCKUP = [8, 10, 7, 13, 11, 16, 14, 19, 17, 21, 20, 23, 25];

const meta: Meta<typeof Sparkline> = {
  title: 'Átomos/Sparkline',
  component: Sparkline,
  args: { values: SERIE_MOCKUP },
};

export default meta;
type Story = StoryObj<typeof Sparkline>;

/** Herda a cor do container — aqui o token de marca, como no KPI do mockup. */
export const Default: Story = {
  render: (args) => (
    <div className="w-64 text-[var(--text-brand)]">
      <Sparkline {...args} />
    </div>
  ),
};

export const SerieDescendente: Story = {
  render: () => (
    <div className="w-64 text-[var(--text-danger)]">
      <Sparkline values={[25, 22, 24, 18, 19, 14, 12, 9, 10, 6]} />
    </div>
  ),
};

export const ComRotuloAcessivel: Story = {
  render: () => (
    <div className="w-64 text-[var(--text-brand)]">
      <Sparkline
        values={SERIE_MOCKUP}
        aria-label="Taxa de conversão nas últimas 13 semanas, em alta"
      />
    </div>
  ),
};

/** Menos de 2 pontos → nada renderiza (estado honesto fica com o consumidor). */
export const SemSerie: Story = {
  render: () => (
    <div className="w-64 text-[var(--text-brand)]">
      <Sparkline values={[]} />
      <span className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
        — (sem série, sem gráfico)
      </span>
    </div>
  ),
};
