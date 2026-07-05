import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Countdown } from '../Countdown';
import { derivarCountdown } from '../../_lib/countdown';
import { mkEventoCountdown } from '../../_test/fixtures';

const view = () =>
  derivarCountdown([mkEventoCountdown({ qtdInscritos: 453, capacidade: 500 })], new Date('2026-04-19T09:00:00Z'));

describe('Countdown (S602-T1)', () => {
  it('mostra "08 dias restantes" e 453/47', () => {
    render(<Countdown countdown={view()} loading={false} onNavigate={vi.fn()} onNovoEvento={vi.fn()} />);
    expect(screen.getByText('08 dias restantes')).toBeInTheDocument();
    expect(screen.getByText(/453\/47/)).toBeInTheDocument();
  });

  it('"Check-in" navega para o balcão do evento (E03)', async () => {
    const onNavigate = vi.fn();
    render(<Countdown countdown={view()} loading={false} onNavigate={onNavigate} onNovoEvento={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Check-in' }));
    expect(onNavigate).toHaveBeenCalledWith('/eventos/meia-floripa-2026/entrega');
  });

  it('ação rápida "Novo evento" dispara callback', async () => {
    const onNovoEvento = vi.fn();
    render(<Countdown countdown={view()} loading={false} onNavigate={vi.fn()} onNovoEvento={onNovoEvento} />);
    await userEvent.click(screen.getByRole('button', { name: '+ Novo evento' }));
    expect(onNovoEvento).toHaveBeenCalledOnce();
  });

  it('sem evento futuro → mensagem', () => {
    render(<Countdown countdown={null} loading={false} onNavigate={vi.fn()} onNovoEvento={vi.fn()} />);
    expect(screen.getByText('Nenhum evento agendado.')).toBeInTheDocument();
  });

  it('loading → skeleton', () => {
    render(<Countdown countdown={null} loading onNavigate={vi.fn()} onNovoEvento={vi.fn()} />);
    expect(screen.getByRole('status', { name: 'Carregando próximo evento' })).toBeInTheDocument();
  });

  it('erro → mostra erro com retry, nunca "Nenhum evento agendado" (#03)', async () => {
    const onRetry = vi.fn();
    render(
      <Countdown countdown={null} loading={false} error onRetry={onRetry} onNavigate={vi.fn()} onNovoEvento={vi.fn()} />
    );
    expect(screen.getByText('Não foi possível carregar o próximo evento.')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum evento agendado.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
