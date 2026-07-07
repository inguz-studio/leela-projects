import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DistribuicaoView } from '../DistribuicaoView';
import { EstoqueView } from '../EstoqueView';
import type { Kit } from '@leela/core';
import { mkInscrito, ts } from '../../_test/fixtures';

const AGORA = ts(new Date('2026-04-27T09:00:00Z'));
const pool = [
  mkInscrito({ id: '1', kit: 'kit_ouro', modalidade: '21k', status: 'confirmado', checkinEm: AGORA }),
  mkInscrito({ id: '2', kit: 'kit_ouro', modalidade: '21k', status: 'confirmado' }),
];

function mkKit(over: Partial<Kit>): Kit {
  return {
    id: 'kit_ouro',
    tenantId: 'castelo',
    nome: 'Kit Ouro',
    preco: 120,
    capacidade: 100,
    modalidades: ['21k'],
    criadoEm: ts(new Date()),
    atualizadoEm: ts(new Date()),
    ...over,
  };
}

describe('DistribuicaoView', () => {
  it('mostra progresso por kit refletindo as retiradas', () => {
    render(<DistribuicaoView inscritos={pool} modalidades={['21k']} loading={false} error={null} />);
    expect(screen.getByText('Retiradas por kit')).toBeInTheDocument();
    // kit_ouro e a modalidade 21k têm o mesmo 1/2 (50%) — ambos presentes
    expect(screen.getAllByText('1 / 2 (50%)').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole('progressbar', { name: 'Retirada de Kit Ouro' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
  });
});

describe('EstoqueView', () => {
  it('kit esgotado dispara alerta crítico', () => {
    render(
      <EstoqueView
        kits={[mkKit({ capacidade: 1 })]}
        inscritos={pool}
        modalidades={['21k']}
        loading={false}
        error={null}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('sem saldo');
    expect(screen.getByText('Esgotado')).toBeInTheDocument();
  });

  it('capacidade ausente degrada para "—" sem fabricar número', () => {
    render(
      <EstoqueView
        kits={[mkKit({ capacidade: 0 })]}
        inscritos={pool}
        modalidades={['21k']}
        loading={false}
        error={null}
      />,
    );
    expect(screen.getByText('Sem capacidade')).toBeInTheDocument();
  });

  it('mostra KPIs de estoque a partir do dado real (capacidade + presença)', () => {
    render(
      <EstoqueView
        kits={[mkKit({ capacidade: 100 })]}
        inscritos={pool}
        modalidades={['21k']}
        loading={false}
        error={null}
      />,
    );
    // pool: 2 confirmados em kit_ouro/21k, 1 com presença → retirados = 1
    // "Retirados" é label de KPI e header de coluna → mais de um nó
    expect(screen.getAllByText('Retirados').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Disponíveis')).toBeInTheDocument();
    // saldo = 100 − 1 = 99 (KPI de disponíveis e coluna de saldo)
    expect(screen.getAllByText('99').length).toBeGreaterThanOrEqual(1);
  });

  it('matriz kit × modalidade mostra retirados / confirmados por célula', () => {
    render(
      <EstoqueView
        kits={[mkKit({ capacidade: 100 })]}
        inscritos={pool}
        modalidades={['21k']}
        loading={false}
        error={null}
      />,
    );
    expect(screen.getByText('Kit por modalidade')).toBeInTheDocument();
    // Kit Ouro em 21k: 1 retirado / 2 confirmados — aparece na célula e no total
    expect(screen.getAllByText('1 / 2').length).toBeGreaterThanOrEqual(1);
  });

  it('estoque por tamanho e movimentações ficam como dependência de backend honesta', () => {
    render(
      <EstoqueView
        kits={[mkKit({ capacidade: 100 })]}
        inscritos={pool}
        modalidades={['21k']}
        loading={false}
        error={null}
      />,
    );
    expect(screen.getByText('Estoque por tamanho ainda não disponível')).toBeInTheDocument();
    expect(screen.getByText('Movimentações ainda não disponíveis')).toBeInTheDocument();
  });

  it('sem kits cadastrados mostra empty state (não inventa linhas)', () => {
    render(
      <EstoqueView kits={[]} inscritos={[]} modalidades={['21k']} loading={false} error={null} />,
    );
    expect(screen.getByText('Nenhum kit para controlar')).toBeInTheDocument();
  });
});
