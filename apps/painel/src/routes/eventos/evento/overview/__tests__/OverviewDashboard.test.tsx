import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewDashboard } from '../OverviewDashboard';
import { OverviewKpis } from '../OverviewKpis';
import { mkInscrito } from '../../../_test/fixtures';
import type { AlertaOperacional } from '../../../_lib/alertas';

describe('OverviewKpis', () => {
  it('mostra os agregados do mock canônico (453 / R$ 85.617)', () => {
    render(<OverviewKpis qtdInscritos={453} receitaConfirmada={85617} />);
    expect(screen.getByText('453')).toBeInTheDocument();
    expect(screen.getByText(/85\.617/)).toBeInTheDocument();
  });
});

describe('OverviewDashboard', () => {
  const alertas: AlertaOperacional[] = [
    { id: 'proximidade', severidade: 'critico', mensagem: 'Faltam 2 dias para o evento.' },
  ];

  it('renderiza KPIs, alertas e atividade recente', () => {
    render(
      <OverviewDashboard
        qtdInscritos={453}
        receitaConfirmada={85617}
        alertas={alertas}
        inscritosRecentes={[
          mkInscrito({ id: '1', atletaNome: 'Marina Silva', modalidade: '21k', kit: 'kit_ouro' }),
          mkInscrito({ id: '2', atletaNome: 'João Souza', modalidade: '10k', kit: 'sem_kit' }),
        ]}
        inscritosLoading={false}
      />,
    );
    expect(screen.getByText('453')).toBeInTheDocument();
    expect(screen.getByText(/85\.617/)).toBeInTheDocument();
    expect(screen.getByText('Faltam 2 dias para o evento.')).toBeInTheDocument();
    expect(screen.getByText('Marina Silva')).toBeInTheDocument();
    expect(screen.getByText('João Souza')).toBeInTheDocument();
    expect(screen.getByText('Sem kit')).toBeInTheDocument();
  });

  it('mostra skeleton enquanto a atividade carrega', () => {
    render(
      <OverviewDashboard
        qtdInscritos={0}
        receitaConfirmada={0}
        alertas={[]}
        inscritosRecentes={null}
        inscritosLoading
      />,
    );
    expect(screen.getByRole('status', { name: 'Carregando atividade' })).toBeInTheDocument();
  });

  it('mostra vazio quando não há inscrições recentes', () => {
    render(
      <OverviewDashboard
        qtdInscritos={0}
        receitaConfirmada={0}
        alertas={[]}
        inscritosRecentes={[]}
        inscritosLoading={false}
      />,
    );
    expect(screen.getByText('Nenhuma inscrição recente.')).toBeInTheDocument();
  });
});
