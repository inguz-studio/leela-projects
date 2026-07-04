import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OverviewClube } from '../OverviewClube';
import { mkClube, mkMembro } from '../../../_test/fixtures';

const AGORA = new Date('2026-04-20T12:00:00Z');

describe('OverviewClube', () => {
  it('renderiza os 4 KPIs (agregados disponíveis + pendentes como —)', () => {
    render(
      <OverviewClube
        clube={mkClube({ qtdMembrosAtivos: 120, qtdDesafiosAtivos: 3 })}
        novosMembros={[]}
        novosLoading={false}
        agora={AGORA}
      />,
    );
    expect(screen.getByText('Membros ativos')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('Desafios ativos')).toBeInTheDocument();
    expect(screen.getByText('Conversão em eventos')).toBeInTheDocument();
    expect(screen.getByText('Receita de parcerias')).toBeInTheDocument();
    // KPIs pendentes de dado renderizam "—".
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('renderiza a tabela densa de novos membros (nunca grid de avatares)', () => {
    render(
      <OverviewClube
        clube={mkClube()}
        novosMembros={[
          mkMembro({ id: 'n1', atletaNome: 'Larissa Heidrich', status: 'novo' }),
          mkMembro({ id: 'n2', atletaNome: 'Helena Bueno', status: 'novo' }),
        ]}
        novosLoading={false}
        agora={AGORA}
      />,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Larissa Heidrich')).toBeInTheDocument();
    expect(screen.getByText('Helena Bueno')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Membro' })).toBeInTheDocument();
  });

  it('mostra EmptyState quando não há novos membros', () => {
    render(
      <OverviewClube clube={mkClube()} novosMembros={[]} novosLoading={false} agora={AGORA} />,
    );
    expect(screen.getByText(/nenhum membro novo ainda/i)).toBeInTheDocument();
  });

  it('mostra skeleton enquanto carrega os novos membros', () => {
    render(
      <OverviewClube clube={mkClube()} novosMembros={null} novosLoading agora={AGORA} />,
    );
    expect(screen.getByRole('status', { name: 'Carregando novos membros' })).toBeInTheDocument();
  });
});
