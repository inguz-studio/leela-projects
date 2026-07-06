import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiRow } from '../KpiRow';
import { mkKpis } from '../../_test/fixtures';

/** Card (ancestral com a classe de padding do KPI) a partir do label. */
function cardDoLabel(label: string): HTMLElement {
  const el = screen.getByText(label).closest('[class*="--kpi-padding"]');
  if (!(el instanceof HTMLElement)) throw new Error(`card de "${label}" não encontrado`);
  return el;
}

describe('KpiRow (S600-T3 · recomposto T4 FIDELIDADE)', () => {
  it('renderiza 1.284 / R$ 142.280 / 47 (badge Esgotando) / 68,2%', () => {
    render(<KpiRow kpis={mkKpis()} />);
    expect(screen.getByText('1.284')).toBeInTheDocument();
    expect(screen.getByText(/142\.280/)).toBeInTheDocument();
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('Esgotando')).toBeInTheDocument();
    expect(screen.getByText('68,2%')).toBeInTheDocument();
  });

  it('labels fiéis ao mockup, cada um com ícone 14px no label', () => {
    render(<KpiRow kpis={mkKpis()} />);
    for (const label of [
      'Inscrições totais',
      'Receita confirmada',
      'Vagas restantes',
      'Taxa de conversão',
    ]) {
      const wrap = screen.getByText(label);
      expect(wrap.querySelector('svg')).not.toBeNull();
    }
  });

  it('trend positivo vira chip vitória com seta ↑ (pares feedback-success)', () => {
    render(<KpiRow kpis={mkKpis({ inscricoesTrendPct: 12.5 })} />);
    const chip = screen.getByText('+12,5%').closest('span');
    expect(chip?.className).toContain('feedback-success-surface');
    expect(chip?.querySelector('svg')).not.toBeNull();
  });

  it('trend negativo vira chip vulcão (pares feedback-danger)', () => {
    render(<KpiRow kpis={mkKpis({ inscricoesTrendPct: -3 })} />);
    const chip = screen.getByText('−3,0%').closest('span');
    expect(chip?.className).toContain('feedback-danger-surface');
  });

  it('receita usa slot de moeda separado do número (currency 22px)', () => {
    render(<KpiRow kpis={mkKpis()} />);
    const currency = screen.getByText('R$');
    expect(currency.className).toContain('--kpi-currency-size');
    // O número vem sem o prefixo embutido
    expect(screen.getByText('142.280')).toBeInTheDocument();
  });

  it('badge de risco é vulcão (mockup badge-vulcao) e o sub nomeia o evento', () => {
    render(<KpiRow kpis={mkKpis()} />);
    const badge = screen.getByText('Esgotando');
    expect(badge.className).toContain('feedback-danger-surface');
    expect(screen.getByText('Meia Maratona Floripa')).toBeInTheDocument();
  });

  it('série de conversão ≥ 2 pontos → sparkline; vazia → "—" sem svg no foot', () => {
    const { container, rerender } = render(
      <KpiRow kpis={mkKpis({ conversaoSparkline: [8, 12, 10, 16] })} />
    );
    expect(container.querySelector('svg[viewBox="0 0 120 28"]')).not.toBeNull();

    rerender(<KpiRow kpis={mkKpis({ conversaoSparkline: [] })} />);
    expect(container.querySelector('svg[viewBox="0 0 120 28"]')).toBeNull();
    expect(cardDoLabel('Taxa de conversão')).toHaveTextContent('—');
  });

  it('taxaConversaoPct null → "—" sem quebrar', () => {
    render(<KpiRow kpis={mkKpis({ taxaConversaoPct: null, conversaoSparkline: [] })} />);
    expect(cardDoLabel('Taxa de conversão')).toHaveTextContent('—');
    expect(screen.queryByText('68,2%')).not.toBeInTheDocument();
  });

  it('trend null → "—" simples, sem chip (honestidade da base de comparação)', () => {
    render(<KpiRow kpis={mkKpis({ receitaTrendPct: null })} />);
    const card = cardDoLabel('Receita confirmada');
    expect(card).toHaveTextContent('—');
    expect(card).not.toHaveTextContent('vs. 7 dias');
  });

  it('cards têm elevação (fecha m1: shadow-elev-1 + hover elev-2)', () => {
    render(<KpiRow kpis={mkKpis()} />);
    const card = cardDoLabel('Inscrições totais');
    expect(card.className).toContain('shadow-elev-1');
    expect(card.className).toContain('hover:shadow-elev-2');
  });

  it('sem evento em risco → sem badge Esgotando', () => {
    render(<KpiRow kpis={mkKpis({ eventoEmRisco: null })} />);
    expect(screen.queryByText('Esgotando')).not.toBeInTheDocument();
  });

  it('vagas=0 sem risco (capacidade ausente) → "—", nunca 0 falso (#15)', () => {
    render(<KpiRow kpis={mkKpis({ vagasRestantes: 0, eventoEmRisco: null })} />);
    const card = cardDoLabel('Vagas restantes');
    expect(card).toHaveTextContent('—');
    expect(card).not.toHaveTextContent('0');
  });

  it('vagas=0 COM risco (esgotado real) → mostra 0 + badge Esgotando, não "—" (#15)', () => {
    render(
      <KpiRow
        kpis={mkKpis({ vagasRestantes: 0, eventoEmRisco: { nome: 'X', slug: 'x' } })}
      />
    );
    const card = cardDoLabel('Vagas restantes');
    expect(card).toHaveTextContent('0');
    expect(screen.getByText('Esgotando')).toBeInTheDocument();
  });
});
