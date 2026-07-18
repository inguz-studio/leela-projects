import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Combobox } from './index';
import type { ComboboxOption } from './index';

/**
 * `Combobox` (S-R9-05 · governança §8) — seleção rica filtrável do DS, single ou
 * multi. Substitui o `<select>` nativo para filtros/seleções ricas: abre um
 * painel DO DS (Popover + Command), não a caixa do sistema operacional.
 */
const meta: Meta<typeof Combobox> = {
  title: 'Primitivos/Combobox',
  component: Combobox,
};

export default meta;
type Story = StoryObj<typeof Combobox>;

const OPCOES: ComboboxOption[] = [
  { value: 'corrida-inverno', label: 'Corrida de Inverno' },
  { value: 'desafio-mtb', label: 'Desafio MTB' },
  { value: 'meia-floripa', label: 'Meia de Floripa' },
  { value: 'noturna-beira-mar', label: 'Noturna Beira-Mar' },
];

function SingleDemo(): React.JSX.Element {
  const [v, setV] = React.useState<string>('');
  return (
    <div className="max-w-sm">
      <Combobox
        options={OPCOES}
        value={v}
        onValueChange={(next) => setV(next as string)}
        aria-label="Evento"
        placeholder="Todos os eventos"
      />
    </div>
  );
}

function MultiDemo(): React.JSX.Element {
  const [v, setV] = React.useState<string[]>([]);
  return (
    <div className="max-w-sm">
      <Combobox
        options={OPCOES}
        value={v}
        onValueChange={(next) => setV(next as string[])}
        multiple
        aria-label="Eventos"
        placeholder="Filtrar eventos"
      />
    </div>
  );
}

/** Single: seleciona um valor e fecha. */
export const Single: Story = { render: () => <SingleDemo /> };

/** Multi: alterna valores e mantém aberto; trigger resume a contagem. */
export const Multiplo: Story = { render: () => <MultiDemo /> };
