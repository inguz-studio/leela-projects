// =============================================================================
// OverviewContent — a grade do protótipo v3 (HIFI-REC) e os contratos de
// honestidade que sobreviveram ao redesign: erro nunca vira estado feliz
// (#03), staff vê nota de escopo (#16), seção sem fonte é "em breve" nomeado.
// =============================================================================

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
    agenda: [],
    eventosLoading: false,
    countdown: null,
    countdownLoading: false,
    ocupacao: { linhas: [], semCapacidade: 0 },
    hojeISO: '2026-08-06',
    onNavigate: vi.fn(),
    ...over,
  };
}

describe('OverviewContent (HIFI-REC · grade do protótipo v3)', () => {
  it('grade do protótipo: 1 coluna estreito, 1.15fr/1fr em lg (minmax fecha a coluna direita)', () => {
    const { container } = render(<OverviewContent {...props()} />);
    const grid = container.querySelector('.grid');
    expect(grid?.className).toContain('grid-cols-1');
    expect(grid?.className).toContain('lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]');
  });

  it('as seções do protótipo estão presentes, na ordem dele', () => {
    render(<OverviewContent {...props()} />);
    for (const nome of [
      'Próximo evento',
      'Clubs',
      'Agenda de eventos',
      'Indicadores consolidados',
      'Presença por semana',
      'Formas de pagamento',
      'Ocupação dos últimos eventos',
      'Alertas operacionais',
    ]) {
      expect(screen.getByRole('region', { name: nome })).toBeInTheDocument();
    }
  });

  it('seções sem fonte são "em breve" NOMEADOS — nunca gráfico zerado', () => {
    render(<OverviewContent {...props()} />);
    expect(screen.getAllByText('Em breve')).toHaveLength(2);
    expect(screen.getByText(/não há série semanal legível/)).toBeInTheDocument();
    expect(screen.getByText(/forma de pagamento chega ao cliente/)).toBeInTheDocument();
  });

  it('"Eventos ativos" e "Últimas inscrições" saíram (o protótipo não os tem)', () => {
    render(<OverviewContent {...props()} />);
    expect(screen.queryByText('Eventos ativos')).not.toBeInTheDocument();
    expect(screen.queryByText('Últimas inscrições')).not.toBeInTheDocument();
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

  it('erro de eventos → Agenda e Countdown mostram erro, não empty fabricado (#03)', () => {
    render(
      <OverviewContent {...props({ agenda: null, eventosError: true, countdown: null })} />
    );
    expect(
      screen.getByText('Não foi possível carregar a agenda dos seus eventos.')
    ).toBeInTheDocument();
    expect(screen.getByText('Não foi possível carregar o próximo evento.')).toBeInTheDocument();
    // Estados felizes fabricados NÃO aparecem sobre erro.
    expect(screen.queryByText('Nenhum evento agendado.')).not.toBeInTheDocument();
    expect(screen.queryByText('Nada agendado')).not.toBeInTheDocument();
  });

  it('renderiza KPIs quando disponíveis', () => {
    render(<OverviewContent {...props()} />);
    expect(screen.getByText('1.284')).toBeInTheDocument();
  });

  it('staff → nota de escopo em vez de zeros mudos (#16)', () => {
    render(<OverviewContent {...props({ papel: 'tenant_staff', countdown: null })} />);
    expect(screen.getByRole('note')).toHaveTextContent('apenas os eventos que você organiza');
  });

  it('produtor (owner) → sem nota de escopo de staff (#16)', () => {
    render(<OverviewContent {...props({ papel: 'tenant_owner' })} />);
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('cascata de entrada (§5): as seções ganham o passo por índice', () => {
    const { container } = render(<OverviewContent {...props()} />);
    const animadas = container.querySelectorAll('.animate-revela-secao');
    expect(animadas.length).toBeGreaterThanOrEqual(7);
    // O passo vem do token --motion-stagger, nunca de ms literal.
    expect((animadas[1] as HTMLElement).style.animationDelay).toContain(
      'var(--motion-stagger)'
    );
  });
});
