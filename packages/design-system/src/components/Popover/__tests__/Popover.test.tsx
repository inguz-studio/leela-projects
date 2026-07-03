import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { Popover } from '../Popover';
import type { PopoverAction } from '../Popover';

function makeActions(overrides: Partial<PopoverAction>[] = []): PopoverAction[] {
  const base: PopoverAction[] = [
    { id: 'ver', label: 'Ver perfil', onClick: vi.fn() },
    { id: 'editar', label: 'Editar', onClick: vi.fn() },
    { id: 'remover', label: 'Remover', onClick: vi.fn(), destructive: true },
  ];
  return base.map((a, i) => ({ ...a, ...overrides[i] }));
}

/** Harness controlado — espelha o uso real (pai segura o estado). */
function Controlled({
  actions,
  initialOpen = false,
}: {
  actions: PopoverAction[];
  initialOpen?: boolean;
}) {
  const [open, setOpen] = React.useState(initialOpen);
  return (
    <Popover
      actions={actions}
      open={open}
      onOpenChange={setOpen}
      trigger={<button type="button">Abrir ações</button>}
    />
  );
}

describe('Popover', () => {
  it('trigger receives aria-haspopup and aria-expanded', () => {
    render(<Controlled actions={makeActions()} />);
    const trigger = screen.getByRole('button', { name: 'Abrir ações' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens menu on trigger click and focuses first item', async () => {
    render(<Controlled actions={makeActions()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir ações' }));
    expect(screen.getByRole('menu', { name: 'Ações' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Ver perfil' })).toHaveFocus();
  });

  it('closes on Escape and returns focus to trigger', async () => {
    render(<Controlled actions={makeActions()} initialOpen />);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir ações' })).toHaveFocus();
  });

  it('closes on outside click', async () => {
    render(
      <div>
        <Controlled actions={makeActions()} initialOpen />
        <button type="button">Fora</button>
      </div>,
    );
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Fora' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('action click fires handler and closes menu', async () => {
    const onEdit = vi.fn();
    const actions = makeActions([{}, { onClick: onEdit }]);
    render(<Controlled actions={actions} initialOpen />);
    await userEvent.click(screen.getByRole('menuitem', { name: 'Editar' }));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('action click does not propagate to row (stopPropagation)', async () => {
    const onRowClick = vi.fn();
    const actions = makeActions();
    render(
      <div onClick={onRowClick}>
        <Controlled actions={actions} initialOpen />
      </div>,
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'Ver perfil' }));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it('navigates items with ArrowDown/ArrowUp wrapping', async () => {
    render(<Controlled actions={makeActions()} initialOpen />);
    expect(screen.getByRole('menuitem', { name: 'Ver perfil' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Ver perfil' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitem', { name: 'Remover' })).toHaveFocus();
  });

  it('skips disabled items in focus order', async () => {
    const actions = makeActions([{}, { disabled: true }]);
    render(<Controlled actions={actions} initialOpen />);
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Remover' })).toHaveFocus();
  });

  it('destructive action uses danger text token', () => {
    render(<Controlled actions={makeActions()} initialOpen />);
    const destructive = screen.getByRole('menuitem', { name: 'Remover' });
    expect(destructive.className).toContain('text-[var(--text-danger)]');
  });

  it('only one popover open at a time under a shared controlled parent', async () => {
    function TwoRows() {
      const [openId, setOpenId] = React.useState<string | null>('a');
      const rowActions = makeActions();
      return (
        <div>
          {(['a', 'b'] as const).map((id) => (
            <Popover
              key={id}
              actions={rowActions}
              open={openId === id}
              onOpenChange={(next) => setOpenId(next ? id : null)}
              trigger={<button type="button">{`Ações ${id}`}</button>}
            />
          ))}
        </div>
      );
    }
    render(<TwoRows />);
    expect(screen.getAllByRole('menu').length).toBe(1);
    await userEvent.click(screen.getByRole('button', { name: 'Ações b' }));
    expect(screen.getAllByRole('menu').length).toBe(1);
    expect(screen.getByRole('button', { name: 'Ações b' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
