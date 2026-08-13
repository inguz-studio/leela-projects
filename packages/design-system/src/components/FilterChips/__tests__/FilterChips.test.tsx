// =============================================================================
// FilterChips — a faceta de um filtro, com o limiar do cânone §1 fechado por
// construção.
//
// O que este arquivo trava, e cada bloco existe por um fato medido no
// inventário de 2026-08-12 (§4.1):
//
//   - o LIMIAR. Doze facetas viraram fileira sem que ninguém contasse os
//     valores, porque não havia contra o quê reprovar. Aqui a contagem é da
//     peça, e o teste falsifica os dois lados do corte.
//   - o CHIP DE "TODOS". Oito das doze o tinham, quatro não. A peça decide, e
//     a decisão é diferente por modo — o teste prova as duas.
//   - a COMPOSIÇÃO. A peça não pode desenhar chip nem popover próprio: a
//     prova é por IDENTIDADE DE ASSINATURA contra o `Chip` renderizado
//     sozinho, o mesmo desenho de prova que a Onda 0 usou no `ConfirmModal`.
//     Reinlinar o motor quebra o teste.
// =============================================================================

import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterChips, type FilterChipsOption } from '../FilterChips';
import { Chip } from '../../Chip';

const TRES: FilterChipsOption[] = [
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'agendado', label: 'Agendado' },
  { id: 'enviado', label: 'Enviado' },
];

const QUATRO: FilterChipsOption[] = [...TRES, { id: 'cancelado', label: 'Cancelado' }];

/** Harness controlado — o pai é a fonte única de `selected` (uso real). */
function Controlada({
  options = TRES,
  multiple = false,
  onChangeSpy,
  ...resto
}: {
  options?: FilterChipsOption[];
  multiple?: boolean;
  onChangeSpy?: (next: string[]) => void;
  allLabel?: string;
  allCount?: number;
}) {
  const [selected, setSelected] = React.useState<string[]>([]);
  return (
    <FilterChips
      label="Filtrar por status"
      options={options}
      multiple={multiple}
      selected={selected}
      onChange={(next) => {
        onChangeSpy?.(next);
        setSelected(next);
      }}
      {...resto}
    />
  );
}

describe('FilterChips · abaixo do limiar (a fileira)', () => {
  it('agrupa a faceta com o rótulo que o leitor de tela ouve', () => {
    render(<Controlada />);
    expect(screen.getByRole('group', { name: 'Filtrar por status' })).toBeInTheDocument();
  });

  it('mostra uma opção por valor, e nenhuma some atrás de gatilho', () => {
    render(<Controlada />);
    const grupo = screen.getByRole('group');
    for (const o of TRES) {
      expect(within(grupo).getByRole('button', { name: o.label })).toBeInTheDocument();
    }
  });

  // A faceta exclusiva SEMPRE tem por onde sair. Quatro das doze medidas só
  // destravavam clicando de novo no chip ativo — afordância que nada na tela
  // anuncia.
  it('faceta exclusiva traz o chip de "Todos", ativo quando nada está aplicado', () => {
    render(<Controlada />);
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('faceta empilhável NÃO traz o chip de "Todos" — vazio já é o estado tudo', () => {
    render(<Controlada multiple />);
    expect(screen.queryByRole('button', { name: 'Todos' })).toBeNull();
  });

  it('exclusiva: escolher troca o recorte inteiro', async () => {
    const spy = vi.fn();
    render(<Controlada onChangeSpy={spy} />);
    await userEvent.click(screen.getByRole('button', { name: 'Rascunho' }));
    expect(spy).toHaveBeenCalledWith(['rascunho']);
    await userEvent.click(screen.getByRole('button', { name: 'Enviado' }));
    expect(spy).toHaveBeenLastCalledWith(['enviado']);
  });

  it('exclusiva: "Todos" limpa a seleção', async () => {
    const spy = vi.fn();
    render(<Controlada onChangeSpy={spy} />);
    await userEvent.click(screen.getByRole('button', { name: 'Agendado' }));
    await userEvent.click(screen.getByRole('button', { name: 'Todos' }));
    expect(spy).toHaveBeenLastCalledWith([]);
  });

  it('empilhável: marca e desmarca cada valor sem tocar nos vizinhos', async () => {
    const spy = vi.fn();
    render(<Controlada multiple onChangeSpy={spy} />);
    await userEvent.click(screen.getByRole('button', { name: 'Rascunho' }));
    expect(spy).toHaveBeenLastCalledWith(['rascunho']);
    await userEvent.click(screen.getByRole('button', { name: 'Enviado' }));
    expect(spy).toHaveBeenLastCalledWith(['rascunho', 'enviado']);
    await userEvent.click(screen.getByRole('button', { name: 'Rascunho' }));
    expect(spy).toHaveBeenLastCalledWith(['enviado']);
  });

  it('formata a contagem numa grafia só — "Rascunho · 12"', () => {
    render(
      <Controlada
        options={[{ id: 'rascunho', label: 'Rascunho', count: 12 }]}
        allCount={64}
      />,
    );
    expect(screen.getByRole('button', { name: 'Rascunho · 12' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Todos · 64' })).toBeInTheDocument();
  });

  it('aceita className no grupo', () => {
    render(
      <FilterChips
        label="Faceta"
        options={TRES}
        selected={[]}
        onChange={() => {}}
        className="teste-faceta"
      />,
    );
    expect(screen.getByRole('group')).toHaveClass('teste-faceta');
  });
});

describe('FilterChips · o limiar do cânone §1', () => {
  // Três valores é fileira; quatro é menu. O corte é o do cânone e ele fica
  // AQUI, não na tela — um script não sabe quantos valores a faceta tem em
  // execução, e foi por isso que doze passaram batido.
  it('com 3 valores desenha a fileira', () => {
    render(<Controlada options={TRES} multiple />);
    expect(screen.getByRole('group', { name: 'Filtrar por status' })).toBeInTheDocument();
  });

  it('com 4 valores e faceta empilhável troca para o FilterMenu', async () => {
    render(<Controlada options={QUATRO} multiple />);
    expect(screen.queryByRole('group')).toBeNull();
    const gatilho = screen.getByRole('button', { name: /Filtrar por status: Todos/ });
    await userEvent.click(gatilho);
    const menu = screen.getByRole('menu', { name: 'Filtrar por status' });
    expect(within(menu).getAllByRole('menuitemcheckbox')).toHaveLength(4);
  });

  // Escolha exclusiva com 4+ valores é `Combobox`, e a régua não é minha: está
  // escrita no cabeçalho do próprio `FilterMenu`. Um menu de
  // `menuitemcheckbox` anunciaria "marcado" onde a semântica é "selecionado".
  it('com 4 valores e faceta exclusiva troca para o Combobox', async () => {
    render(<Controlada options={QUATRO} />);
    expect(screen.queryByRole('group')).toBeNull();
    const gatilho = screen.getByRole('button', { name: 'Filtrar por status' });
    expect(gatilho).toHaveTextContent('Todos');
    await userEvent.click(gatilho);
    // O painel do DS, não a caixa do sistema operacional.
    expect(await screen.findByPlaceholderText('Buscar…')).toBeInTheDocument();
  });

  it('o Combobox da faceta exclusiva abre com "Todos" na lista e devolve seleção vazia', async () => {
    const spy = vi.fn();
    render(<Controlada options={QUATRO} onChangeSpy={spy} />);
    const gatilho = screen.getByRole('button', { name: 'Filtrar por status' });
    await userEvent.click(gatilho);
    await userEvent.click(await screen.findByText('Agendado'));
    expect(spy).toHaveBeenLastCalledWith(['agendado']);

    await userEvent.click(gatilho);
    await userEvent.click(await screen.findByText('Todos'));
    expect(spy).toHaveBeenLastCalledWith([]);
  });

  // O id do "tudo" é interno e não pode escapar para o consumidor: quem lê
  // `selected` recebe [] quando nada está aplicado, nunca um id sentinela.
  it('o id sentinela do "Todos" nunca escapa em onChange', async () => {
    const spy = vi.fn();
    render(<Controlada options={QUATRO} onChangeSpy={spy} />);
    const gatilho = screen.getByRole('button', { name: 'Filtrar por status' });
    await userEvent.click(gatilho);
    await userEvent.click(await screen.findByText('Agendado'));
    await userEvent.click(gatilho);
    await userEvent.click(await screen.findByText('Todos'));
    expect(spy.mock.calls.length).toBeGreaterThan(1);
    for (const chamada of spy.mock.calls) {
      expect(JSON.stringify(chamada[0])).not.toContain('__todos__');
    }
  });
});

describe('FilterChips · composição (zero motor próprio)', () => {
  // A prova é por IDENTIDADE DE ASSINATURA: a className do chip dentro da
  // faceta tem de ser byte a byte a do `Chip` renderizado sozinho. Reinlinar o
  // motor — ou "ajustar só um detalhe" com classe própria — quebra o teste.
  it('o chip da fileira é o Chip do DS, com a assinatura idêntica', () => {
    const { unmount } = render(<Chip active={false}>Rascunho</Chip>);
    const assinatura = screen.getByRole('button', { name: 'Rascunho' }).className;
    unmount();

    render(<Controlada multiple />);
    expect(screen.getByRole('button', { name: 'Rascunho' }).className).toBe(assinatura);
  });

  it('o chip ativo também mantém a assinatura do Chip ativo', () => {
    const { unmount } = render(<Chip active>Todos</Chip>);
    const assinatura = screen.getByRole('button', { name: 'Todos' }).className;
    unmount();

    render(<Controlada />);
    expect(screen.getByRole('button', { name: 'Todos' }).className).toBe(assinatura);
  });

  it('não desenha input, select nem popover próprio na fileira', () => {
    const { container } = render(<Controlada />);
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('select')).toBeNull();
    expect(container.querySelectorAll('button')).toHaveLength(TRES.length + 1);
  });
});
