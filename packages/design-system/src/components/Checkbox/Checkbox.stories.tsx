import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { Checkbox } from './Checkbox';

/**
 * Marcação booleana que só vale na submissão. Se o efeito é imediato, o
 * canônico é o `Switch` — a fronteira está no cânone §3.
 */
const meta: Meta<typeof Checkbox> = {
  title: 'Átomos/Checkbox',
  component: Checkbox,
  args: { 'aria-label': 'Selecionar inscrito' },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {};

export const Marcado: Story = {
  args: { checked: true, readOnly: true },
};

/** O "selecionar todos" parcial da tabela densa: nem todos, nem nenhum. */
export const Indeterminado: Story = {
  args: { indeterminate: true, checked: false, readOnly: true, 'aria-label': 'Selecionar todos' },
};

export const Desabilitado: Story = {
  render: () => (
    <div className="flex items-center gap-[var(--spacing-4)]">
      <Checkbox aria-label="Vazio e bloqueado" disabled />
      <Checkbox aria-label="Marcado e bloqueado" disabled checked readOnly />
    </div>
  ),
};

/**
 * O controle é nu de propósito — a label fica com quem monta a linha. Quando
 * há rótulo, dica e erro para ligar por ARIA, envolva no `Field`.
 */
export const ComRotulo: Story = {
  render: function ComRotuloStory() {
    const [marcado, setMarcado] = React.useState(false);
    return (
      <label className="flex items-center gap-[var(--spacing-2)] text-[length:var(--font-size-base)] text-[var(--text-secondary)]">
        <Checkbox checked={marcado} onChange={(e) => setMarcado(e.target.checked)} />
        Notificar o participante por e-mail
      </label>
    );
  },
};

/** Os quatro estados lado a lado — a conferência de AA por estado nos dois temas. */
export const Estados: Story = {
  render: () => (
    <div className="flex flex-col gap-[var(--spacing-3)]">
      {[
        ['Vazio', <Checkbox key="a" aria-label="Vazio" />],
        ['Marcado', <Checkbox key="b" aria-label="Marcado" checked readOnly />],
        [
          'Indeterminado',
          <Checkbox key="c" aria-label="Indeterminado" indeterminate checked={false} readOnly />,
        ],
        ['Desabilitado', <Checkbox key="d" aria-label="Desabilitado" disabled />],
      ].map(([nome, control]) => (
        <div key={nome as string} className="flex items-center gap-[var(--spacing-3)]">
          {control}
          <span className="text-[length:var(--font-size-sm)] text-[var(--text-secondary)]">
            {nome}
          </span>
        </div>
      ))}
    </div>
  ),
};
