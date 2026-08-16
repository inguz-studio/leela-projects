import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HubEventos } from '../HubEventos';
import { mkEvento } from '../../_test/fixtures';

const noop = () => {};
const baseProps = {
  onNovoEvento: noop,
  onAbrirEvento: noop,
  onAbrirSubarea: noop,
};

describe('HubEventos', () => {
  it('mostra EmptyState + CTA quando zero eventos', async () => {
    const onNovoEvento = vi.fn();
    render(
      <HubEventos
        {...baseProps}
        eventos={[]}
        loading={false}
        error={null}
        onNovoEvento={onNovoEvento}
      />,
    );
    expect(screen.getByText(/ainda não criou nenhum evento/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Criar evento' }));
    expect(onNovoEvento).toHaveBeenCalledOnce();
  });

  it('renderiza linhas densas híbridas + KPIs globais quando há eventos', () => {
    render(
      <HubEventos
        {...baseProps}
        eventos={[
          mkEvento({ id: 'a', slug: 'a', nome: 'Evento A', qtdInscritos: 453, receitaConfirmada: 85617 }),
          mkEvento({ id: 'b', slug: 'b', nome: 'Evento B', qtdInscritos: 100, receitaConfirmada: 20000, status: 'rascunho' }),
        ]}
        loading={false}
        error={null}
      />,
    );
    // CORREÇÃO 1: faixa de KPIs globais MANTIDA (inscritos 453+100=553)
    expect(screen.getByRole('region', { name: 'Indicadores globais' })).toBeInTheDocument();
    expect(screen.getByText('553')).toBeInTheDocument();
    // Linhas densas (uma por evento)
    const lista = screen.getByRole('list', { name: 'Meus eventos' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Evento A')).toBeInTheDocument();
    expect(screen.getByText('Evento B')).toBeInTheDocument();
  });

  it('filtro de status é um dropdown de checkboxes MULTI-seleção e filtra a lista', async () => {
    render(
      <HubEventos
        {...baseProps}
        eventos={[
          mkEvento({ id: 'a', slug: 'a', nome: 'Ativo A', status: 'publicado' }),
          mkEvento({ id: 'b', slug: 'b', nome: 'Rascunho B', status: 'rascunho' }),
          mkEvento({ id: 'c', slug: 'c', nome: 'Encerrado C', status: 'encerrado' }),
        ]}
        loading={false}
        error={null}
      />,
    );
    // Migração single→multi (Vitor 2026-07-11): a faceta de 4 categorias virou
    // dropdown; "Todos" = estado sem seleção; o gatilho resume a seleção.
    // A barra (Onda C5) é a `FilterBar` — `role="toolbar"`, não mais o
    // `role="group"` amarrado à mão; o `FilterMenu` nomeia o próprio gatilho.
    const barra = screen.getByRole('toolbar', { name: 'Filtros de eventos' });
    const gatilho = within(barra).getByRole('button', { name: /Status: Todos/ });
    await userEvent.click(gatilho);

    // 3 categorias concretas como checkbox (Todos é o vazio, não uma opção).
    const menu = screen.getByRole('menu', { name: 'Status' });
    expect(within(menu).getAllByRole('menuitemcheckbox')).toHaveLength(3);

    // Multi: marcar Rascunhos + Encerrados mostra os dois (varredura), menu fica aberto.
    await userEvent.click(within(menu).getByRole('menuitemcheckbox', { name: /Rascunhos/ }));
    await userEvent.click(within(menu).getByRole('menuitemcheckbox', { name: /Encerrados/ }));
    expect(screen.getByText('Rascunho B')).toBeInTheDocument();
    expect(screen.getByText('Encerrado C')).toBeInTheDocument();
    expect(screen.queryByText('Ativo A')).toBeNull();
    // gatilho reflete "Status: 2"
    expect(within(barra).getByRole('button', { name: /Status: 2/ })).toBeInTheDocument();
  });

  it('clicar na linha navega ao Overview do evento (S200 crit 2)', async () => {
    const onAbrirEvento = vi.fn();
    render(
      <HubEventos
        {...baseProps}
        eventos={[mkEvento({ id: 'a', slug: 'evento-a', nome: 'Evento A' })]}
        loading={false}
        error={null}
        onAbrirEvento={onAbrirEvento}
      />,
    );
    await userEvent.click(screen.getByText('Evento A'));
    expect(onAbrirEvento).toHaveBeenCalledWith('evento-a');
  });

  it('"Gerenciar" navega sem propagar duas vezes o clique da linha', async () => {
    const onAbrirEvento = vi.fn();
    render(
      <HubEventos
        {...baseProps}
        eventos={[mkEvento({ id: 'a', slug: 'evento-a', nome: 'Evento A' })]}
        loading={false}
        error={null}
        onAbrirEvento={onAbrirEvento}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Gerenciar' }));
    expect(onAbrirEvento).toHaveBeenCalledTimes(1);
    expect(onAbrirEvento).toHaveBeenCalledWith('evento-a');
  });

  it('mostra skeleton no carregamento', () => {
    render(
      <HubEventos {...baseProps} eventos={null} loading error={null} />,
    );
    expect(screen.getByRole('status', { name: 'Carregando eventos' })).toBeInTheDocument();
  });

  it('mostra bloco de erro no fail', () => {
    render(
      <HubEventos {...baseProps} eventos={null} loading={false} error={new Error('boom')} />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
