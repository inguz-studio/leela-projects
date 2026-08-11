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

  // F6 (UXW-MELHORIAS) · a grade era só `role="grid"`: sem row/gridcell, sem
  // navegação por setas. WAI-APG grid pattern — anatomia visual intacta (as
  // 7 asserções acima continuam verdes), só a árvore de acessibilidade ganhou
  // estrutura + teclado.
  describe('F6 · grade ARIA do calendário (WAI-APG grid)', () => {
    it('a grade tem role="grid" com linhas role="row" e células role="gridcell"', () => {
      montar();
      const grade = screen.getByRole('grid', { name: 'Agosto 2026' });
      const linhas = within(grade).getAllByRole('row');
      expect(linhas.length).toBeGreaterThan(0);
      // As células vazias (dias do mês anterior) ficam aria-hidden de propósito
      // (mesmo comportamento de antes do F6) — só os 31 dias reais de agosto
      // entram na árvore de acessibilidade como gridcell.
      const celulas = within(grade).getAllByRole('gridcell');
      expect(celulas.length).toBe(31);
    });

    it('roving tabindex: só o dia selecionado (hoje, ao abrir) é tabável', () => {
      montar();
      const hoje = screen.getByRole('button', { name: '6 de Agosto 2026' });
      expect(hoje).toHaveAttribute('tabindex', '0');
      const outroDia = screen.getByRole('button', { name: '21 de Agosto 2026' });
      expect(outroDia).toHaveAttribute('tabindex', '-1');
    });

    it('ArrowRight move seleção e foco para o dia seguinte', async () => {
      montar();
      const hoje = screen.getByRole('button', { name: '6 de Agosto 2026' });
      hoje.focus();
      await userEvent.keyboard('{ArrowRight}');
      const dia7 = screen.getByRole('button', { name: '7 de Agosto 2026' });
      expect(dia7).toHaveFocus();
      expect(dia7).toHaveAttribute('tabindex', '0');
      expect(dia7).toHaveAttribute('aria-pressed', 'true');
      expect(hoje).toHaveAttribute('tabindex', '-1');
    });

    it('ArrowDown move seleção e foco 7 dias à frente (semana seguinte)', async () => {
      montar();
      screen.getByRole('button', { name: '6 de Agosto 2026' }).focus();
      await userEvent.keyboard('{ArrowDown}');
      expect(screen.getByRole('button', { name: '13 de Agosto 2026' })).toHaveFocus();
    });

    it('ArrowLeft no dia 1 não atravessa para o mês anterior (clamp)', async () => {
      montar();
      const dia1 = screen.getByRole('button', { name: '1 de Agosto 2026' });
      dia1.focus();
      await userEvent.keyboard('{ArrowLeft}');
      expect(dia1).toHaveFocus();
      expect(screen.getByText('Agosto 2026')).toBeInTheDocument();
    });
  });
});
