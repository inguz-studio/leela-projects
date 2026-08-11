import type { Meta, StoryObj } from '@storybook/react';
import * as React from 'react';
import { Switch } from './Switch';

/**
 * Liga/desliga com efeito IMEDIATO. Se o valor só vale na submissão do
 * formulário, o canônico é o `Checkbox` — a fronteira está no cânone §3.
 */
const meta: Meta<typeof Switch> = {
  title: 'Átomos/Switch',
  component: Switch,
  args: { label: 'Evento público' },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {};

export const Ligado: Story = {
  args: { checked: true, readOnly: true },
};

/**
 * A descrição entra por `aria-describedby`, nunca dentro do `<label>` — senão o
 * leitor de tela leria "Evento público Aparece na busca…" como um nome só.
 */
export const ComDescricao: Story = {
  args: {
    label: 'Evento público',
    description: 'Aparece na busca e na vitrine. Desligado, só quem tem o link entra.',
  },
};

export const Desabilitado: Story = {
  render: () => (
    <div className="flex flex-col gap-[var(--spacing-3)]">
      <Switch label="Desligado e bloqueado" disabled />
      <Switch label="Ligado e bloqueado" disabled checked readOnly />
    </div>
  ),
};

/** `onCheckedChange` é o atalho tipado; o `onChange` nativo continua valendo. */
export const Controlado: Story = {
  render: function ControladoStory() {
    const [ligado, setLigado] = React.useState(false);
    return (
      <div className="flex flex-col gap-[var(--spacing-2)]">
        <Switch
          label="Inscrições abertas"
          checked={ligado}
          onCheckedChange={setLigado}
          description="Muda agora — não espera salvar."
        />
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-tertiary)]">
          Estado: {ligado ? 'abertas' : 'fechadas'}
        </p>
      </div>
    );
  },
};
