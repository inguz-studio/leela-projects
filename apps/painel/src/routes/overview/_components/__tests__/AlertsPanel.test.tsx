import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertsPanel } from '../AlertsPanel';
import { mkAlert } from '../../_test/fixtures';

describe('AlertsPanel (S602-T2)', () => {
  it('renderiza os alertas do getOverview (warn + info)', () => {
    render(
      <AlertsPanel
        loading={false}
        alerts={[
          mkAlert({ id: 'ocupacao', severidade: 'warn', titulo: 'Meia Maratona com 90% das vagas' }),
          mkAlert({ id: 'pendentes-24h', severidade: 'info', titulo: '3 inscrições pendentes há mais de 24h' }),
        ]}
      />
    );
    expect(screen.getByText('Meia Maratona com 90% das vagas')).toBeInTheDocument();
    expect(screen.getByText('3 inscrições pendentes há mais de 24h')).toBeInTheDocument();
    expect(screen.getAllByRole('alert')).toHaveLength(2);
  });

  it('ícone por severidade (T6): warn/info/ok nos pares de feedback', () => {
    render(
      <AlertsPanel
        loading={false}
        alerts={[
          mkAlert({ id: 'a', severidade: 'warn' }),
          mkAlert({ id: 'b', severidade: 'info' }),
          mkAlert({ id: 'c', severidade: 'ok' }),
        ]}
      />
    );
    expect(screen.getByTestId('alert-icon-warn').className).toContain('--feedback-warning-surface');
    expect(screen.getByTestId('alert-icon-info').className).toContain('--feedback-info-surface');
    expect(screen.getByTestId('alert-icon-ok').className).toContain('--feedback-success-surface');
  });

  it('head mostra contagem honesta "N ativos" (não há lido/não-lido no contrato)', () => {
    render(
      <AlertsPanel
        loading={false}
        alerts={[mkAlert({ id: 'a' }), mkAlert({ id: 'b' }), mkAlert({ id: 'c' })]}
      />
    );
    expect(screen.getByText('3 ativos')).toBeInTheDocument();
  });

  it('sem sinais → "Tudo em dia. Nenhum alerta."', () => {
    render(<AlertsPanel alerts={[]} loading={false} />);
    expect(screen.getByText('Tudo em dia. Nenhum alerta.')).toBeInTheDocument();
  });

  it('loading → skeleton', () => {
    render(<AlertsPanel alerts={null} loading />);
    expect(screen.getByRole('status', { name: 'Carregando alertas' })).toBeInTheDocument();
  });

  it('erro → NÃO fabrica "Tudo em dia"; mostra erro com retry (#03)', async () => {
    const onRetry = vi.fn();
    render(<AlertsPanel alerts={null} loading={false} error onRetry={onRetry} />);
    expect(screen.queryByText('Tudo em dia. Nenhum alerta.')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar os alertas.');
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('erro sem retry (permission-denied) → mensagem sem botão', () => {
    render(<AlertsPanel alerts={null} loading={false} error />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it('alerta com destino ganha "Ver agora →" que navega (protótipo v3)', async () => {
    const onNavigate = vi.fn();
    render(
      <AlertsPanel
        loading={false}
        alerts={[mkAlert({ id: 'a', href: '/eventos/meia-floripa-2026/inscritos' })]}
        onNavigate={onNavigate}
      />
    );
    await userEvent.click(screen.getByRole('button', { name: /Ver agora/ }));
    expect(onNavigate).toHaveBeenCalledWith('/eventos/meia-floripa-2026/inscritos');
  });

  it('alerta sem destino não desenha link morto', () => {
    render(<AlertsPanel loading={false} alerts={[mkAlert({ id: 'a' })]} onNavigate={vi.fn()} />);
    expect(screen.queryByRole('button', { name: /Ver agora/ })).not.toBeInTheDocument();
  });
});
