import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Popover } from './index';
import { Button } from '../Button';

/**
 * `Popover` é alias @deprecated de `DropdownMenu` (decisão bd31974): mesma
 * API, mesmo comportamento. Esta story existe só para cobrir o alias no
 * catálogo — código novo deve usar `DropdownMenu` (Organismos/DropdownMenu).
 */
const meta: Meta<typeof Popover> = {
  title: 'Organismos/Popover (descontinuado)',
  component: Popover,
};

export default meta;
type Story = StoryObj<typeof Popover>;

function PopoverDemo(): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="secondary">Ações (alias)</Button>}
      actions={[
        { id: 'ver', label: 'Ver detalhes', onClick: () => undefined },
        { id: 'cancelar', label: 'Cancelar inscrição', destructive: true, onClick: () => undefined },
      ]}
    />
  );
}

/** Alias descontinuado — prefira DropdownMenu em código novo. */
export const Deprecado: Story = { render: () => <PopoverDemo /> };
