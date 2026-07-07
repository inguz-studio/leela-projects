import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MacroDashboard } from '../MacroDashboard';
import { mkRollups } from '../../_test/fixtures';

const baseProps = {
  loading: false,
  error: null,
  onOpenTenant: () => {},
};

describe('MacroDashboard', () => {
  it('skeleton no load', () => {
    render(<MacroDashboard {...baseProps} rollups={null} loading />);
    expect(screen.getByRole('status', { name: 'Carregando painel macro' })).toBeInTheDocument();
  });

  it('erro → bloco de alerta', () => {
    render(<MacroDashboard {...baseProps} rollups={null} error={new Error('boom')} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('rollups null (sem agregado) → EmptyState', () => {
    render(<MacroDashboard {...baseProps} rollups={null} />);
    expect(screen.getByText(/Sem dados agregados ainda/)).toBeInTheDocument();
  });

  it('mostra KPIs macro (GMV total, receita Leela total, tenants ativos)', () => {
    render(<MacroDashboard {...baseProps} rollups={mkRollups()} />);
    expect(screen.getByText('GMV total')).toBeInTheDocument();
    expect(screen.getByText('Receita Leela total')).toBeInTheDocument();
    expect(screen.getByText('Tenants ativos')).toBeInTheDocument();
    // 2 tenants ativos no fixture
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('lista saúde por tenant (linha do fixture) e taxa nula vira "—"', () => {
    render(<MacroDashboard {...baseProps} rollups={mkRollups()} />);
    expect(screen.getByText('Castelo Produções')).toBeInTheDocument();
    expect(screen.getByText('Passo Certo')).toBeInTheDocument();
    // platformFeePct null (Passo Certo pending) → formatPct "—"
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('ordena a tabela de saúde por GMV decrescente (maior primeiro)', () => {
    // Fixture: Passo Certo (gmv 0) inserido depois; Castelo (gmv 100000) deve
    // vir primeiro mesmo que o Record chegasse fora de ordem.
    render(<MacroDashboard {...baseProps} rollups={mkRollups()} />);
    const rows = screen.getAllByRole('row');
    // rows[0] = header; a 1ª linha de dados carrega o maior GMV.
    expect(rows[1]).toHaveTextContent('Castelo Produções');
    expect(rows[2]).toHaveTextContent('Passo Certo');
  });

  it('abrir tenant chama onOpenTenant com o id', async () => {
    const onOpenTenant = vi.fn();
    render(<MacroDashboard {...baseProps} rollups={mkRollups()} onOpenTenant={onOpenTenant} />);
    const botoes = screen.getAllByRole('button', { name: 'Abrir' });
    await userEvent.click(botoes[0]!);
    expect(onOpenTenant).toHaveBeenCalledWith('castelo-producoes');
  });
});
