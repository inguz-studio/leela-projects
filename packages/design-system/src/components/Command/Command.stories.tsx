import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from './index';

/**
 * `Command` (S-R9-05) — lista filtrável WAI-APG sobre `cmdk`. Base do `Combobox`;
 * também usável avulso (paleta de comando, busca). Tokens do DS, teclado ↑↓/Enter.
 */
const meta: Meta<typeof Command> = {
  title: 'Primitivos/Command',
  component: Command,
};

export default meta;
type Story = StoryObj<typeof Command>;

function CommandDemo(): React.JSX.Element {
  return (
    <div className="max-w-sm rounded-md border border-border">
      <Command>
        <CommandInput placeholder="Buscar evento…" />
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>
          <CommandGroup heading="Eventos">
            <CommandItem value="Corrida de Inverno">Corrida de Inverno</CommandItem>
            <CommandItem value="Desafio MTB">Desafio MTB</CommandItem>
            <CommandItem value="Meia de Floripa">Meia de Floripa</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  );
}

export const Basico: Story = { render: () => <CommandDemo /> };
