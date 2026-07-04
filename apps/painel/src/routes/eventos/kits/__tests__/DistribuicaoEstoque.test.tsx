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
      <EstoqueView kits={[mkKit({ capacidade: 1 })]} inscritos={pool} loading={false} error={null} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('sem saldo');
    expect(screen.getByText('Esgotado')).toBeInTheDocument();
  });

  it('capacidade ausente degrada para "—" sem fabricar número', () => {
    render(
      <EstoqueView kits={[mkKit({ capacidade: 0 })]} inscritos={pool} loading={false} error={null} />,
    );
    expect(screen.getByText('Sem capacidade')).toBeInTheDocument();
  });
});
