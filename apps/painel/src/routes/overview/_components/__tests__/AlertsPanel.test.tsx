import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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

  it('sem sinais → "Tudo em dia. Nenhum alerta."', () => {
    render(<AlertsPanel alerts={[]} loading={false} />);
    expect(screen.getByText('Tudo em dia. Nenhum alerta.')).toBeInTheDocument();
  });

  it('loading → skeleton', () => {
    render(<AlertsPanel alerts={null} loading />);
    expect(screen.getByRole('status', { name: 'Carregando alertas' })).toBeInTheDocument();
  });
});
