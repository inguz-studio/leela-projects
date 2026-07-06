import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DropdownMenu, type DropdownMenuAction } from './DropdownMenu';
import { Button } from '../Button';

const ACTIONS: DropdownMenuAction[] = [
  { id: 'ver', label: 'Ver detalhes', onClick: () => undefined },
  { id: 'transferir', label: 'Transferir inscrição', onClick: () => undefined },
  { id: 'cancelar', label: 'Cancelar inscrição', destructive: true, onClick: () => undefined },
];

const ACTIONS_COM_DISABLED: DropdownMenuAction[] = [
  { id: 'ver', label: 'Ver detalhes', onClick: () => undefined },
  { id: 'exportar', label: 'Exportar lista', disabled: true, onClick: () => undefined },
  { id: 'cancelar', label: 'Cancelar inscrição', destructive: true, onClick: () => undefined },
];

interface DemoProps {
  actions?: DropdownMenuAction[];
  align?: 'left' | 'right';
}

function DropdownDemo({ actions = ACTIONS, align = 'right' }: DemoProps): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  return (
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
      trigger={<Button variant="secondary">Ações</Button>}
      actions={actions}
      align={align}
    />
  );
}

const meta: Meta<typeof DropdownMenu> = {
  title: 'Organismos/DropdownMenu',
  component: DropdownMenu,
};

export default meta;
type Story = StoryObj<typeof DropdownMenu>;

/** Menu controlado: abre no clique, fecha em Esc/click fora, item destrutivo em Vulcão. */
export const Default: Story = { render: () => <DropdownDemo /> };

/** Item desabilitado é pulado pela navegação por teclado (↓ ↑ Home End). */
export const ComItemDesabilitado: Story = {
  render: () => <DropdownDemo actions={ACTIONS_COM_DISABLED} />,
};

/** Alinhado à esquerda do trigger. */
export const AlinhadoAEsquerda: Story = {
  render: () => <DropdownDemo align="left" />,
};
