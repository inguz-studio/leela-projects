import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiRow } from '../KpiRow';
import { mkKpis } from '../../_test/fixtures';

describe('KpiRow (S600-T3)', () => {
  it('renderiza 1.284 / R$ 142.280 / 47 (badge Esgotando) / 68,2%', () => {
    render(<KpiRow kpis={mkKpis()} />);
    expect(screen.getByText('1.284')).toBeInTheDocument();
    expect(screen.getByText(/142\.280/)).toBeInTheDocument();
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('Esgotando')).toBeInTheDocument();
    expect(screen.getByText('68,2%')).toBeInTheDocument();
  });

  it('taxaConversaoPct null → "—" sem quebrar', () => {
    render(<KpiRow kpis={mkKpis({ taxaConversaoPct: null, conversaoSparkline: [] })} />);
    // "—" aparece para a conversão (valor) e para o trend de receita (null) — basta não quebrar.
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('68,2%')).not.toBeInTheDocument();
  });

  it('sem evento em risco → sem badge Esgotando', () => {
    render(<KpiRow kpis={mkKpis({ eventoEmRisco: null })} />);
    expect(screen.queryByText('Esgotando')).not.toBeInTheDocument();
  });
});
