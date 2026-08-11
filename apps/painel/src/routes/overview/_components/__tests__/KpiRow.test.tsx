// =============================================================================
// KpiRow — a régua de indicadores no formato do protótipo v3 (HIFI-REC).
// O que os testes protegem: os números reais do aceite, os rótulos HONESTOS
// (P-REC-4 — nada de "7 dias" em agregado total), o delta "↑/↓" só com base
// de comparação, o 0-falso das vagas e o colapso responsivo do item 6.
// =============================================================================

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiRow, deltaTexto } from '../KpiRow';
import { mkKpis } from '../../_test/fixtures';

/** Célula (ancestral flex da régua) a partir do label. */
function celulaDoLabel(label: string): HTMLElement {
  const el = screen.getByText(label).closest('div[class*="items-center"]');
  if (!(el instanceof HTMLElement)) throw new Error(`célula de "${label}" não encontrada`);
  return el;
}

describe('KpiRow (HIFI-REC · régua do protótipo v3)', () => {
  it('renderiza 1.284 / R$ 142.280 / 47 (badge Esgotando) / 68,2%', () => {
    render(<KpiRow kpis={mkKpis()} />);
    expect(screen.getByText('1.284')).toBeInTheDocument();
    expect(screen.getByText(/142\.280/)).toBeInTheDocument();
    expect(screen.getByText('47')).toBeInTheDocument();
    expect(screen.getByText('Esgotando')).toBeInTheDocument();
    expect(screen.getByText('68,2%')).toBeInTheDocument();
  });

  it('rótulos seguem a semântica REAL do dado — nunca "7 dias" em total (P-REC-4)', () => {
    render(<KpiRow kpis={mkKpis()} />);
    expect(screen.getByText('Inscrições totais')).toBeInTheDocument();
    expect(screen.getByText('Receita confirmada')).toBeInTheDocument();
    expect(screen.getByText('Vagas restantes')).toBeInTheDocument();
    expect(screen.getByText('Taxa de conversão')).toBeInTheDocument();
    // Os rótulos do protótipo que mentiriam a janela NÃO entram:
    expect(screen.queryByText('Receita 7 dias')).not.toBeInTheDocument();
    expect(screen.queryByText('Inscrições 7 dias')).not.toBeInTheDocument();
    expect(screen.queryByText('Check-ins 7 dias')).not.toBeInTheDocument();
    expect(screen.queryByText('Últimos 7 dias')).not.toBeInTheDocument();
  });

  it('cada célula tem o círculo de ícone do protótipo (46px na cor da marca)', () => {
    render(<KpiRow kpis={mkKpis()} />);
    for (const label of [
      'Inscrições totais',
      'Receita confirmada',
      'Vagas restantes',
      'Taxa de conversão',
    ]) {
      const circulo = celulaDoLabel(label).querySelector('[class*="--v3-kpi-icon"]');
      expect(circulo).not.toBeNull();
      expect(circulo?.querySelector('svg')).not.toBeNull();
    }
  });

  it('trend positivo → "↑ 12,5%" na cor de sucesso (texto do protótipo, sem chip)', () => {
    render(<KpiRow kpis={mkKpis({ inscricoesTrendPct: 12.5 })} />);
    const delta = screen.getByText('↑ 12,5%');
    expect(delta.className).toContain('feedback-success');
    expect(screen.getByText('vs. 7 dias')).toBeInTheDocument();
  });

  it('trend negativo → "↓ 3%" na cor de perigo', () => {
    render(<KpiRow kpis={mkKpis({ inscricoesTrendPct: -3 })} />);
    expect(screen.getByText('↓ 3%').className).toContain('feedback-danger');
  });

  it('deltaTexto: seta carrega o sinal, valor absoluto pt-BR', () => {
    expect(deltaTexto(12.5)).toBe('↑ 12,5%');
    expect(deltaTexto(-3)).toBe('↓ 3%');
    expect(deltaTexto(0)).toBe('↑ 0%');
  });

  it('receita usa slot de moeda separado do número', () => {
    render(<KpiRow kpis={mkKpis()} />);
    expect(screen.getByText('R$')).toBeInTheDocument();
    expect(screen.getByText('142.280')).toBeInTheDocument();
  });

  it('badge de risco vulcão + sub nomeia o evento', () => {
    render(<KpiRow kpis={mkKpis()} />);
    const badge = screen.getByText('Esgotando');
    expect(badge.className).toContain('feedback-danger-surface');
    expect(screen.getByText('Meia Maratona Floripa')).toBeInTheDocument();
  });

  it('série de conversão ≥ 2 pontos → sparkline; vazia → "—" sem svg de série', () => {
    const { container, rerender } = render(
      <KpiRow kpis={mkKpis({ conversaoSparkline: [8, 12, 10, 16] })} />
    );
    expect(container.querySelector('svg[viewBox="0 0 120 28"]')).not.toBeNull();

    rerender(<KpiRow kpis={mkKpis({ conversaoSparkline: [] })} />);
    expect(container.querySelector('svg[viewBox="0 0 120 28"]')).toBeNull();
    expect(celulaDoLabel('Taxa de conversão')).toHaveTextContent('—');
  });

  it('trend null → "—" simples, sem delta (honestidade da base de comparação)', () => {
    render(<KpiRow kpis={mkKpis({ receitaTrendPct: null })} />);
    const celula = celulaDoLabel('Receita confirmada');
    expect(celula).toHaveTextContent('—');
    expect(celula).not.toHaveTextContent('vs. 7 dias');
  });

  it('a régua é UM cartão vidro com grade 1/xs:2/lg:4 (item 6 do REFACTOR)', () => {
    render(<KpiRow kpis={mkKpis()} />);
    const section = screen.getByRole('region', { name: 'Indicadores consolidados' });
    expect(section.className).toContain('--surface-raised');
    expect(section.className).toContain('--card-blur');
    const grade = section.querySelector('.grid');
    expect(grade?.className).toContain('grid-cols-1');
    expect(grade?.className).toContain('xs:grid-cols-2');
    expect(grade?.className).toContain('lg:grid-cols-4');
  });

  it('vagas=0 sem risco (capacidade ausente) → "—", nunca 0 falso (#15)', () => {
    render(<KpiRow kpis={mkKpis({ vagasRestantes: 0, eventoEmRisco: null })} />);
    const celula = celulaDoLabel('Vagas restantes');
    expect(celula).toHaveTextContent('—');
    expect(celula).not.toHaveTextContent('0');
  });

  it('vagas=0 COM risco (esgotado real) → mostra 0 + badge, não "—" (#15)', () => {
    render(
      <KpiRow kpis={mkKpis({ vagasRestantes: 0, eventoEmRisco: { nome: 'X', slug: 'x' } })} />
    );
    expect(celulaDoLabel('Vagas restantes')).toHaveTextContent('0');
    expect(screen.getByText('Esgotando')).toBeInTheDocument();
  });

  it('sem evento em risco → sem badge Esgotando', () => {
    render(<KpiRow kpis={mkKpis({ eventoEmRisco: null })} />);
    expect(screen.queryByText('Esgotando')).not.toBeInTheDocument();
  });
});
