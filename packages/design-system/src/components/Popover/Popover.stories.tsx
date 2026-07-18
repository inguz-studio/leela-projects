import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from './index';
import { Button } from '../Button';

/**
 * `Popover` — primitivo de ÂNCORA shadcn/Radix (S-R9-05). Posiciona um painel do
 * DS junto a um trigger, em portal, com colisão/flip e dismiss a11y. Base do
 * `Combobox` e do `Calendar`. (O antigo Popover de menu do E01 virou
 * `DropdownMenu`.)
 */
const meta: Meta<typeof Popover> = {
  title: 'Primitivos/Popover',
  component: Popover,
};

export default meta;
type Story = StoryObj<typeof Popover>;

function PopoverDemo(): React.JSX.Element {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary">Abrir painel</Button>
      </PopoverTrigger>
      <PopoverContent className="p-[var(--spacing-4)]">
        <p className="text-[length:var(--font-size-sm)] text-[var(--text-primary)]">
          Painel do DS (bg-popover, borda, shadow). Esc ou click fora fecha.
        </p>
      </PopoverContent>
    </Popover>
  );
}

export const Basico: Story = { render: () => <PopoverDemo /> };
