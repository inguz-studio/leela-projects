import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HubEventos } from '../HubEventos';
import { mkEvento } from '../../_test/fixtures';

const noop = () => {};

describe('HubEventos', () => {
  it('mostra EmptyState + CTA quando zero eventos', async () => {
    const onNovoEvento = vi.fn();
    render(
      <HubEventos
        eventos={[]}
        loading={false}
        error={null}
        onNovoEvento={onNovoEvento}
        onAbrirEvento={noop}
      />,
    );
    expect(screen.getByText(/ainda não criou nenhum evento/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Criar evento' }));
    expect(onNovoEvento).toHaveBeenCalledOnce();
  });

  it('renderiza grid de cards + KPIs globais quando há eventos', () => {
    render(
      <HubEventos
        eventos={[
          mkEvento({ id: 'a', slug: 'a', nome: 'Evento A', qtdInscritos: 453, receitaConfirmada: 85617 }),
          mkEvento({ id: 'b', slug: 'b', nome: 'Evento B', qtdInscritos: 100, receitaConfirmada: 20000, status: 'rascunho' }),
        ]}
        loading={false}
        error={null}
        onNovoEvento={noop}
        onAbrirEvento={noop}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Evento A' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Evento B' })).toBeInTheDocument();
    // KPI de inscritos consolidados: 453 + 100 = 553
    expect(screen.getByText('553')).toBeInTheDocument();
  });

  it('mostra skeleton no carregamento', () => {
    render(
      <HubEventos eventos={null} loading error={null} onNovoEvento={noop} onAbrirEvento={noop} />,
    );
    expect(screen.getByRole('status', { name: 'Carregando eventos' })).toBeInTheDocument();
  });

  it('mostra bloco de erro no fail', () => {
    render(
      <HubEventos
        eventos={null}
        loading={false}
        error={new Error('boom')}
        onNovoEvento={noop}
        onAbrirEvento={noop}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('navega ao clicar num card', async () => {
    const onAbrirEvento = vi.fn();
    render(
      <HubEventos
        eventos={[mkEvento({ id: 'a', slug: 'evento-a', nome: 'Evento A' })]}
        loading={false}
        error={null}
        onNovoEvento={noop}
        onAbrirEvento={onAbrirEvento}
      />,
    );
    await userEvent.click(screen.getByRole('heading', { name: 'Evento A' }));
    expect(onAbrirEvento).toHaveBeenCalledWith('evento-a');
  });
});
