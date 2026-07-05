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

  it('vagas=0 sem risco (capacidade ausente) → "—", nunca 0 falso (#15)', () => {
    render(<KpiRow kpis={mkKpis({ vagasRestantes: 0, eventoEmRisco: null })} />);
    // A célula de Vagas mostra "—", não "0".
    const vagas = screen.getByText('Vagas restantes').closest('div')?.parentElement;
    expect(vagas).toHaveTextContent('—');
    expect(vagas).not.toHaveTextContent('0');
  });

  it('vagas=0 COM risco (esgotado real) → mostra 0 + badge Esgotando, não "—" (#15)', () => {
    render(
      <KpiRow
        kpis={mkKpis({ vagasRestantes: 0, eventoEmRisco: { nome: 'X', slug: 'x' } })}
      />
    );
    const vagas = screen.getByText('Vagas restantes').closest('div')?.parentElement;
    expect(vagas).toHaveTextContent('0');
    expect(screen.getByText('Esgotando')).toBeInTheDocument();
  });
});
