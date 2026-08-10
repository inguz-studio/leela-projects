import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Countdown, rotuloDoStatDias, valorDoStatDias } from '../Countdown';
import { derivarCountdown } from '../../_lib/countdown';
import { mkEventoCountdown } from '../../_test/fixtures';

const view = () =>
  derivarCountdown(
    [mkEventoCountdown({ qtdInscritos: 453, capacidade: 500, local: 'Florianópolis/SC' })],
    new Date('2026-04-19T09:00:00Z')
  );

describe('Countdown (HIFI-REC · card "Próximo evento" do protótipo v3)', () => {
  it('régua de 4 stats reais: dias, inscritos, % ocupado e vagas livres', () => {
    render(<Countdown countdown={view()} loading={false} onNavigate={vi.fn()} />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('dias restantes')).toBeInTheDocument();
    expect(screen.getByText('453')).toBeInTheDocument();
    expect(screen.getByText('inscritos')).toBeInTheDocument();
    // 453/500 → 91% (razão canônica do core, arredondada).
    expect(screen.getByText('91%')).toBeInTheDocument();
    expect(screen.getByText('ocupado')).toBeInTheDocument();
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('vagas livres')).toBeInTheDocument();
  });

  it('capacidade desconhecida → "—" em ocupado e vagas (nunca 0 falso)', () => {
    const c = derivarCountdown(
      [mkEventoCountdown({ capacidade: null })],
      new Date('2026-04-19T09:00:00Z')
    );
    render(<Countdown countdown={c} loading={false} onNavigate={vi.fn()} />);
    expect(screen.getAllByText('—')).toHaveLength(2);
  });

  it('linha de meta honesta: data curta + local, sem hora', () => {
    render(<Countdown countdown={view()} loading={false} onNavigate={vi.fn()} />);
    expect(screen.getByText('27 Abr · Florianópolis/SC')).toBeInTheDocument();
  });

  it('CTA único do protótipo: "Gerenciar evento" navega para o evento', async () => {
    const onNavigate = vi.fn();
    render(<Countdown countdown={view()} loading={false} onNavigate={onNavigate} />);
    await userEvent.click(screen.getByRole('button', { name: /Gerenciar evento/ }));
    expect(onNavigate).toHaveBeenCalledWith('/eventos/meia-floripa-2026');
  });

  it('as quick-actions do mockup anterior saíram (o v3 tem só o CTA)', () => {
    render(<Countdown countdown={view()} loading={false} onNavigate={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Ver inscritos' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Comunicar' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Check-in' })).not.toBeInTheDocument();
  });

  it('dia da prova → "Hoje", nunca "0"', () => {
    expect(valorDoStatDias(0)).toBe('Hoje');
    expect(rotuloDoStatDias(0)).toBe('dia da prova');
    expect(valorDoStatDias(1)).toBe('1');
    expect(rotuloDoStatDias(1)).toBe('dia restante');
  });

  it('sem evento futuro → mensagem honesta', () => {
    render(<Countdown countdown={null} loading={false} onNavigate={vi.fn()} />);
    expect(screen.getByText('Nenhum evento agendado.')).toBeInTheDocument();
  });

  it('erro de eventos → erro com retry, nunca "Nenhum evento agendado" (#03)', async () => {
    const onRetry = vi.fn();
    render(
      <Countdown countdown={null} loading={false} error onRetry={onRetry} onNavigate={vi.fn()} />
    );
    expect(screen.getByText('Não foi possível carregar o próximo evento.')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum evento agendado.')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('loading → skeleton (nunca spinner)', () => {
    render(<Countdown countdown={null} loading onNavigate={vi.fn()} />);
    expect(screen.getByRole('status', { name: 'Carregando próximo evento' })).toBeInTheDocument();
  });
});
