import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { FilterMenu, type FilterMenuOption } from '../FilterMenu';

const OPTIONS: FilterMenuOption[] = [
  { id: 'ativos', label: 'Ativos', count: 4 },
  { id: 'encerrados', label: 'Encerrados', count: 2 },
  { id: 'rascunhos', label: 'Rascunhos', count: 1 },
];

/** Harness controlado — o pai é a fonte única de `selected` (uso real). */
function Controlled({
  initial = [],
  onChangeSpy,
}: {
  initial?: string[];
  onChangeSpy?: (next: string[]) => void;
}) {
  const [selected, setSelected] = React.useState<string[]>(initial);
  return (
    <FilterMenu
      label="Status"
      options={OPTIONS}
      selected={selected}
      onChange={(next) => {
        onChangeSpy?.(next);
        setSelected(next);
      }}
    />
  );
}

describe('FilterMenu', () => {
  it('gatilho resume "Todos" quando nada está marcado', () => {
    render(<Controlled />);
    expect(screen.getByRole('button', { name: /Status: Todos/ })).toBeInTheDocument();
  });

  it('abre um menu nomeado pela faceta com uma opção-checkbox por valor + contagem', async () => {
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: /Status:/ }));
    const menu = screen.getByRole('menu', { name: 'Status' });
    const items = within(menu).getAllByRole('menuitemcheckbox');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveAttribute('aria-checked', 'false');
    // contagem por categoria visível dentro do dropdown
    expect(within(menu).getByText('4')).toBeInTheDocument();
    expect(within(menu).getByText('2')).toBeInTheDocument();
  });

  it('marcar uma opção é multi-seleção: NÃO fecha o menu e emite o novo conjunto', async () => {
    const onChangeSpy = vi.fn();
    render(<Controlled onChangeSpy={onChangeSpy} />);
    await userEvent.click(screen.getByRole('button', { name: /Status:/ }));

    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: /Ativos/ }));
    expect(onChangeSpy).toHaveBeenLastCalledWith(['ativos']);
    // o menu segue aberto para marcar mais de uma
    expect(screen.getByRole('menu', { name: 'Status' })).toBeInTheDocument();
    expect(screen.getByRole('menuitemcheckbox', { name: /Ativos/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: /Encerrados/ }));
    expect(onChangeSpy).toHaveBeenLastCalledWith(['ativos', 'encerrados']);
    // gatilho reflete a contagem
    expect(screen.getByRole('button', { name: /Status: 2/ })).toBeInTheDocument();
  });

  it('desmarcar remove só aquela opção (independência de checkbox)', async () => {
    const onChangeSpy = vi.fn();
    render(<Controlled initial={['ativos', 'encerrados']} onChangeSpy={onChangeSpy} />);
    await userEvent.click(screen.getByRole('button', { name: /Status: 2/ }));
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: /Ativos/ }));
    expect(onChangeSpy).toHaveBeenLastCalledWith(['encerrados']);
  });
});
