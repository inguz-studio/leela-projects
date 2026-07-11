import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Drawer, type DrawerSide } from './Drawer';
import { Sidebar, DEFAULT_SIDEBAR_SECTIONS } from '../Sidebar';
import { Button } from '../Button';

const meta: Meta<typeof Drawer> = {
  title: 'Organismos/Drawer',
  component: Drawer,
};

export default meta;
type Story = StoryObj<typeof Drawer>;

function DrawerDemo({ side }: { side: DrawerSide }): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir drawer ({side})</Button>
      <Drawer open={open} onOpenChange={setOpen} title="Menu de navegação" side={side}>
        <div onClick={() => setOpen(false)} className="contents">
          <Sidebar sections={DEFAULT_SIDEBAR_SECTIONS} />
        </div>
      </Drawer>
    </>
  );
}

/**
 * Uso canônico do shell mobile (< lg): a MESMA Sidebar do DS vira drawer
 * off-canvas. Fecha por Esc, clique no overlay, e ao navegar por um item.
 * `prefers-reduced-motion` desliga o slide (gated por motion-safe).
 */
export const Left: Story = { render: () => <DrawerDemo side="left" /> };
export const Right: Story = { render: () => <DrawerDemo side="right" /> };
