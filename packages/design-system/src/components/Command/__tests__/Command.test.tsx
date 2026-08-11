/**
 * Command (S-R9-05) — lista filtrável WAI-APG sobre `cmdk`.
 *
 * Era o ÚNICO dos 50 componentes do DS sem teste algum (inventário §8), e é a
 * base do `Combobox`: uma regressão aqui chega às telas por dois caminhos, o
 * uso avulso e o combobox inteiro. Os casos abaixo afirmam o CONTRATO que o
 * `Combobox` consome — roles do WAI-APG, filtro por digitação, navegação e
 * seleção por teclado, estado vazio, item desabilitado e o eixo único de
 * rolagem da lista — e não a forma como o wrapper foi escrito.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '../index';

function Lista({
  onSelect = () => {},
  desabilitarMtb = false,
}: { onSelect?: (v: string) => void; desabilitarMtb?: boolean } = {}) {
  return (
    <Command label="Buscar evento">
      <CommandInput placeholder="Buscar evento…" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Eventos">
          <CommandItem value="Corrida de Inverno" onSelect={onSelect}>
            Corrida de Inverno
          </CommandItem>
          <CommandItem value="Desafio MTB" onSelect={onSelect} disabled={desabilitarMtb}>
            Desafio MTB
          </CommandItem>
          <CommandItem value="Meia de Floripa" onSelect={onSelect}>
            Meia de Floripa
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

describe('Command · anatomia WAI-APG', () => {
  it('monta combobox + listbox com uma option por item', () => {
    render(<Lista />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('o grupo carrega o heading', () => {
    render(<Lista />);
    expect(screen.getByText('Eventos')).toBeInTheDocument();
  });
});

describe('Command · filtro por digitação', () => {
  it('reduz a lista ao que casa com o texto', async () => {
    render(<Lista />);
    await userEvent.type(screen.getByRole('combobox'), 'mtb');
    const visiveis = screen.getAllByRole('option');
    expect(visiveis).toHaveLength(1);
    expect(visiveis[0]).toHaveTextContent('Desafio MTB');
  });

  it('mostra o estado vazio quando nada casa — nunca uma lista muda', async () => {
    render(<Lista />);
    await userEvent.type(screen.getByRole('combobox'), 'natação');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByText('Nada encontrado.')).toBeInTheDocument();
  });
});

describe('Command · teclado', () => {
  it('a primeira opção nasce selecionada e a seta move a seleção', async () => {
    render(<Lista />);
    const campo = screen.getByRole('combobox');
    campo.focus();
    expect(screen.getByText('Corrida de Inverno').closest('[cmdk-item]')).toHaveAttribute(
      'data-selected',
      'true',
    );

    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByText('Desafio MTB').closest('[cmdk-item]')).toHaveAttribute(
      'data-selected',
      'true',
    );
  });

  it('Enter escolhe a opção selecionada', async () => {
    const onSelect = vi.fn();
    render(<Lista onSelect={onSelect} />);
    screen.getByRole('combobox').focus();
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('Desafio MTB');
  });

  it('o clique também escolhe', async () => {
    const onSelect = vi.fn();
    render(<Lista onSelect={onSelect} />);
    await userEvent.click(screen.getByText('Meia de Floripa'));
    expect(onSelect).toHaveBeenCalledWith('Meia de Floripa');
  });
});

describe('Command · item desabilitado', () => {
  it('anuncia o estado e não dispara a escolha', async () => {
    const onSelect = vi.fn();
    render(<Lista onSelect={onSelect} desabilitarMtb />);
    const item = screen.getByText('Desafio MTB').closest('[cmdk-item]')!;
    expect(item).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(screen.getByText('Desafio MTB'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('Command · rolagem e tokens', () => {
  it('a lista declara os DOIS eixos de overflow (padrão leela-scroll)', () => {
    render(<Lista />);
    const lista = screen.getByRole('listbox');
    expect(lista).toHaveClass('overflow-y-auto');
    expect(lista).toHaveClass('overflow-x-hidden');
  });

  it('a lista tem teto de altura por token, não por literal', () => {
    render(<Lista />);
    expect(screen.getByRole('listbox')).toHaveClass(
      'max-h-[var(--command-list-max-height)]',
    );
  });

  it('o container usa a superfície de popover do DS (alias shadcn→brasa)', () => {
    const { container } = render(<Lista />);
    const raiz = container.querySelector('[cmdk-root]')!;
    expect(raiz).toHaveClass('bg-popover');
    expect(raiz).toHaveClass('text-popover-foreground');
  });

  it('o className do consumidor não apaga o eixo de rolagem (cn resolve pelo último)', () => {
    render(
      <Command label="Buscar">
        <CommandList className="p-0">
          <CommandItem value="um">Um</CommandItem>
        </CommandList>
      </Command>,
    );
    const lista = screen.getByRole('listbox');
    expect(lista).toHaveClass('overflow-y-auto');
    expect(lista).toHaveClass('overflow-x-hidden');
  });
});
