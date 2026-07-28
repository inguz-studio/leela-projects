import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Countdown } from '../Countdown';
import { derivarCountdown } from '../../_lib/countdown';
import { mkEventoCountdown } from '../../_test/fixtures';

const view = () =>
  derivarCountdown(
    [mkEventoCountdown({ qtdInscritos: 453, capacidade: 500, local: 'Florianópolis/SC' })],
    new Date('2026-04-19T09:00:00Z')
  );

describe('Countdown (S602-T1 · T6 card fiel)', () => {
  it('número grande "08" + unidade "dias restantes" (anatomia do mockup)', () => {
    render(<Countdown countdown={view()} loading={false} onNavigate={vi.fn()} />);
    expect(screen.getByText('08')).toBeInTheDocument();
    expect(screen.getByText('dias restantes')).toBeInTheDocument();
  });

  it('stats 2-col: Inscritos 453 e Vagas livres 47', () => {
    render(<Countdown countdown={view()} loading={false} onNavigate={vi.fn()} />);
    expect(screen.getByText('Inscritos')).toBeInTheDocument();
    expect(screen.getByText('453')).toBeInTheDocument();
    expect(screen.getByText('Vagas livres')).toBeInTheDocument();
    expect(screen.getByText('47')).toBeInTheDocument();
  });

  it('vagas desconhecidas → "—" (nunca inventa número)', () => {
    const c = derivarCountdown(
      [mkEventoCountdown({ capacidade: null })],
      new Date('2026-04-19T09:00:00Z')
    );
    render(<Countdown countdown={c} loading={false} onNavigate={vi.fn()} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('linha "when" honesta: data curta + local, sem hora', () => {
    render(<Countdown countdown={view()} loading={false} onNavigate={vi.fn()} />);
    expect(screen.getByText('27 Abr · Florianópolis/SC')).toBeInTheDocument();
  });

  it('quick-actions navegam: Ver inscritos, Comunicar (E06 · D3) e Check-in (E03)', async () => {
    const onNavigate = vi.fn();
    render(<Countdown countdown={view()} loading={false} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ver inscritos' }));
    expect(onNavigate).toHaveBeenCalledWith('/eventos/meia-floripa-2026/inscritos');
    await userEvent.click(screen.getByRole('button', { name: 'Comunicar' }));
    expect(onNavigate).toHaveBeenCalledWith('/eventos/meia-floripa-2026/comunicacao');
    await userEvent.click(screen.getByRole('button', { name: 'Check-in' }));
    expect(onNavigate).toHaveBeenCalledWith('/eventos/meia-floripa-2026/credenciamento');
  });

  it('bloco "Ações rápidas" geral saiu (Novo evento vive na Toolbar)', () => {
    render(<Countdown countdown={view()} loading={false} onNavigate={vi.fn()} />);
    expect(screen.queryByRole('button', { name: '+ Novo evento' })).not.toBeInTheDocument();
    expect(screen.queryByText('Ações rápidas')).not.toBeInTheDocument();
  });

  it('sem evento futuro → mensagem', () => {
    render(<Countdown countdown={null} loading={false} onNavigate={vi.fn()} />);
    expect(screen.getByText('Nenhum evento agendado.')).toBeInTheDocument();
  });

  it('loading → skeleton', () => {
    render(<Countdown countdown={null} loading onNavigate={vi.fn()} />);
    expect(screen.getByRole('status', { name: 'Carregando próximo evento' })).toBeInTheDocument();
  });

  it('erro → mostra erro com retry, nunca "Nenhum evento agendado" (#03)', async () => {
    const onRetry = vi.fn();
    render(<Countdown countdown={null} loading={false} error onRetry={onRetry} onNavigate={vi.fn()} />);
    expect(screen.getByText('Não foi possível carregar o próximo evento.')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum evento agendado.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
