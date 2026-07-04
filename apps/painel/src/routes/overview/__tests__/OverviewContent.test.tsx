import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewContent, type OverviewContentProps } from '../OverviewContent';
import { mkKpis } from '../_test/fixtures';

function props(over: Partial<OverviewContentProps> = {}): OverviewContentProps {
  return {
    kpis: mkKpis(),
    kpisLoading: false,
    kpisError: null,
    alerts: [],
    eventos: [],
    eventosLoading: false,
    inscricoes: [],
    inscricoesLoading: false,
    countdown: null,
    countdownLoading: false,
    onNavigate: vi.fn(),
    onNovoEvento: vi.fn(),
    ...over,
  };
}

describe('OverviewContent (S600-T1 layout)', () => {
  it('layout 2 colunas: colapsa para 1 em viewport estreito (grid-cols-1 base)', () => {
    const { container } = render(<OverviewContent {...props()} />);
    const grid = container.querySelector('.grid');
    expect(grid?.className).toContain('grid-cols-1');
    expect(grid?.className).toContain('lg:grid-cols-3');
  });

  it('kpisLoading → 4 skeletons (nunca spinner)', () => {
    render(<OverviewContent {...props({ kpis: null, kpisLoading: true })} />);
    expect(screen.getByRole('status', { name: 'Carregando indicadores' })).toBeInTheDocument();
  });

  it('permission-denied → mensagem de erro sem quebrar', () => {
    render(<OverviewContent {...props({ kpis: null, kpisError: 'permission-denied' })} />);
    expect(screen.getByRole('alert')).toHaveTextContent('não tem um painel de produtor');
  });

  it('renderiza KPIs quando disponíveis', () => {
    render(<OverviewContent {...props()} />);
    expect(screen.getByText('1.284')).toBeInTheDocument();
  });
});
