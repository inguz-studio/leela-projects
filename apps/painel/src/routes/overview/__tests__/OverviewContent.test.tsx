import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    ocupacao: { linhas: [], semCapacidade: 0 },
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
    expect(screen.getByText(/não tem um painel de produtor/i)).toBeInTheDocument();
    // Alertas NÃO fabricam "Tudo em dia" sobre erro (#03).
    expect(screen.queryByText('Tudo em dia. Nenhum alerta.')).not.toBeInTheDocument();
  });

  it('unknown com retry → botão "Tentar novamente" recarrega o resumo (#03)', async () => {
    const onRetryOverview = vi.fn();
    render(<OverviewContent {...props({ kpis: null, kpisError: 'unknown', onRetryOverview })} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Tentar novamente' })[0]!);
    expect(onRetryOverview).toHaveBeenCalled();
  });

  it('erro de eventos → ActiveEvents/Countdown mostram erro, não empty fabricado (#03)', () => {
    render(
      <OverviewContent {...props({ eventos: null, eventosError: true, countdown: null })} />
    );
    expect(
      screen.getByText('Não foi possível carregar seus eventos.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Não foi possível carregar o próximo evento.')
    ).toBeInTheDocument();
    // Estados felizes fabricados NÃO aparecem sobre erro.
    expect(
      screen.queryByRole('button', { name: 'Crie seu primeiro evento' })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhum evento agendado.')).not.toBeInTheDocument();
  });

  it('erro de inscrições → RecentRegistrations mostra erro, não "nenhuma" nem skeleton (#39)', () => {
    render(
      <OverviewContent {...props({ inscricoes: null, inscricoesError: true })} />
    );
    expect(screen.getByText('Não foi possível carregar as inscrições.')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma inscrição recente.')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('status', { name: 'Carregando inscrições' })
    ).not.toBeInTheDocument();
  });

  it('renderiza KPIs quando disponíveis', () => {
    render(<OverviewContent {...props()} />);
    expect(screen.getByText('1.284')).toBeInTheDocument();
  });

  it('staff → nota de escopo em vez de zeros mudos (#16)', () => {
    render(<OverviewContent {...props({ papel: 'tenant_staff', eventos: [], countdown: null })} />);
    expect(screen.getByRole('note')).toHaveTextContent('apenas os eventos que você organiza');
  });

  it('produtor (owner) → sem nota de escopo de staff (#16)', () => {
    render(<OverviewContent {...props({ papel: 'tenant_owner', eventos: [] })} />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
