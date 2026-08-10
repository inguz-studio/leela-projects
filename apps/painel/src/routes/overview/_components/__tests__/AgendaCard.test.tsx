// =============================================================================
// AgendaCard — o calendário do protótipo v3 (HIFI-REC) sobre eventos REAIS.
// Protege: âncora no dia de hoje, navegação de mês, seleção de dia com a
// lista honesta ("Nada agendado" só quando NÃO há erro), etiqueta de status
// real e o erro que nunca vira estado feliz (#03).
// =============================================================================

import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AgendaCard } from '../AgendaCard';
import { derivarAgenda, type EventoAgendaInput } from '../../_lib/agenda';
import { ts } from '../../_test/fixtures';

function mkEvento(over: Partial<EventoAgendaInput> = {}): EventoAgendaInput {
  return {
    nome: 'Corrida de Inverno Floripa 2026',
    slug: 'corrida-inverno-2026',
    status: 'publicado',
    data: ts(new Date('2026-08-21T12:00:00Z')),
    local: 'Parque de Coqueiros, Florianópolis/SC',
    ...over,
  };
}

const HOJE = '2026-08-06';

function montar(over: Partial<Parameters<typeof AgendaCard>[0]> = {}) {
  const props = {
    itens: derivarAgenda([mkEvento()]),
    loading: false,
    hojeISO: HOJE,
    onNavigate: vi.fn(),
    ...over,
  };
  render(<AgendaCard {...props} />);
  return props;
}

describe('AgendaCard', () => {
  it('abre no mês de hoje, com hoje selecionado e "Nada agendado" honesto', () => {
    montar();
    expect(screen.getByText('Agosto 2026')).toBeInTheDocument();
    expect(screen.getByText('6 de Agosto 2026')).toBeInTheDocument();
    expect(screen.getByText('Nada agendado')).toBeInTheDocument();
  });

  it('selecionar um dia com evento mostra o item com local e etiqueta REAL', async () => {
    const { onNavigate } = montar();
    await userEvent.click(screen.getByRole('button', { name: '21 de Agosto 2026' }));
    expect(screen.getByText('21 de Agosto 2026')).toBeInTheDocument();
    const lista = screen.getByRole('list');
    expect(within(lista).getByText('Corrida de Inverno Floripa 2026')).toBeInTheDocument();
    expect(
      within(lista).getByText('Parque de Coqueiros, Florianópolis/SC')
    ).toBeInTheDocument();
    expect(within(lista).getByText('Publicado')).toBeInTheDocument();
    // O item navega para o evento.
    await userEvent.click(
      within(lista).getByRole('button', { name: /Corrida de Inverno Floripa 2026/ })
    );
    expect(onNavigate).toHaveBeenCalledWith('/eventos/corrida-inverno-2026');
  });

  it('navega entre meses (inclusive sem evento nenhum no mês)', async () => {
    montar();
    await userEvent.click(screen.getByRole('button', { name: 'Mês seguinte' }));
    expect(screen.getByText('Setembro 2026')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
    expect(screen.getByText('Julho 2026')).toBeInTheDocument();
  });

  it('a legenda só diz o que a grade desenha: Eventos (desafios sem fonte)', () => {
    montar();
    expect(screen.getByText('Eventos')).toBeInTheDocument();
    expect(screen.queryByText('Desafios')).not.toBeInTheDocument();
  });

  it('erro → alerta com retry, nunca "Nada agendado" fabricado (#03)', async () => {
    const onRetry = vi.fn();
    montar({ itens: null, error: true, onRetry });
    expect(
      screen.getByText('Não foi possível carregar a agenda dos seus eventos.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Nada agendado')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('loading → status acessível', () => {
    montar({ itens: null, loading: true });
    expect(screen.getByRole('status', { name: 'Carregando agenda' })).toBeInTheDocument();
  });

  it('"Ver agenda completa" leva ao hub de eventos', async () => {
    const { onNavigate } = montar();
    await userEvent.click(screen.getByRole('button', { name: /Ver agenda completa/ }));
    expect(onNavigate).toHaveBeenCalledWith('/eventos');
  });
});
