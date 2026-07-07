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

  it('filtro de status é compacto (uma linha, 4 chips) e filtra a lista', async () => {
    render(
      <HubEventos
        {...baseProps}
        eventos={[
          mkEvento({ id: 'a', slug: 'a', nome: 'Ativo A', status: 'publicado' }),
          mkEvento({ id: 'b', slug: 'b', nome: 'Rascunho B', status: 'rascunho' }),
        ]}
        loading={false}
        error={null}
      />,
    );
    const grupo = screen.getByRole('group', { name: 'Filtrar eventos por status' });
    const chips = within(grupo).getAllByRole('button');
    expect(chips).toHaveLength(4); // Todos/Ativos/Encerrados/Rascunhos — L-005: 1 linha

    await userEvent.click(within(grupo).getByRole('button', { name: /^Rascunhos/ }));
    expect(screen.getByText('Rascunho B')).toBeInTheDocument();
    expect(screen.queryByText('Ativo A')).toBeNull();
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
