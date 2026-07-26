import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { SaldoRepasse, Timestamp } from '@leela/core';
import { SaldoCards } from '../SaldoCards';

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ');

function ts(ms: number): Timestamp {
  return { seconds: Math.floor(ms / 1000), nanoseconds: 0, toDate: () => new Date(ms), toMillis: () => ms };
}

function mkSaldo(over: Partial<SaldoRepasse> = {}): SaldoRepasse {
  return {
    tenantId: 'castelo',
    vendidoBruto: 10000,
    retido: 1500,
    disponivel: 8500,
    comprometido: 0,
    dentroJanelaDN: 0,
    eventosSemTermo: 0,
    atualizadoEm: ts(Date.UTC(2026, 3, 15)),
    ...over,
  };
}

describe('SaldoCards (E09s-L3-T1)', () => {
  it('loading → Skeleton com status acessível', () => {
    render(<SaldoCards saldo={null} loading />);
    expect(screen.getByRole('status', { name: 'Carregando saldo de repasse' })).toBeInTheDocument();
  });

  it('saldo null → EmptyState "Nenhuma movimentação" (não zeros ambíguos)', () => {
    render(<SaldoCards saldo={null} loading={false} />);
    expect(screen.getByText('Nenhuma movimentação')).toBeInTheDocument();
    // Nenhum card de valor fabricado.
    expect(screen.queryByText('Disponível')).not.toBeInTheDocument();
  });

  it('vendidoBruto === 0 → EmptyState (produtor sem venda)', () => {
    render(<SaldoCards saldo={mkSaldo({ vendidoBruto: 0, retido: 0, disponivel: 0 })} loading={false} />);
    expect(screen.getByText('Nenhuma movimentação')).toBeInTheDocument();
  });

  it('mostra os 3 cards lendo SÓ o saldo (vendido/disponível/retido)', () => {
    const { container } = render(<SaldoCards saldo={mkSaldo()} loading={false} />);
    expect(screen.getByText('Vendido')).toBeInTheDocument();
    expect(screen.getByText('Disponível')).toBeInTheDocument();
    expect(screen.getByText('Retido')).toBeInTheDocument();
    const txt = norm(container.textContent);
    expect(txt).toContain('R$ 10.000,00');
    expect(txt).toContain('R$ 8.500,00');
    expect(txt).toContain('R$ 1.500,00');
  });

  it('retido > 0 → badge "Liberado após o encerramento do evento" (RN-350)', () => {
    render(<SaldoCards saldo={mkSaldo({ retido: 1500 })} loading={false} />);
    expect(screen.getByText('Liberado após o encerramento do evento')).toBeInTheDocument();
  });

  it('retido === 0 → sem badge de retenção (estado honesto)', () => {
    render(<SaldoCards saldo={mkSaldo({ retido: 0, disponivel: 10000 })} loading={false} />);
    expect(screen.queryByText('Liberado após o encerramento do evento')).not.toBeInTheDocument();
  });
});
