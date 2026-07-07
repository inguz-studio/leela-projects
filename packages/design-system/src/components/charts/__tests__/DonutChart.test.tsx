import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
// Ver nota em BarChart.test.tsx: Recharts não desenha no jsdom; o boundary mantém
// a legenda/valor-âncora/tabela (o contrato acessível que testamos), não o SVG.
import { DonutChart } from '../DonutChart';

describe('DonutChart', () => {
  const data = [
    { label: '21km', value: 41096 },
    { label: '10km', value: 27397 },
    { label: '5km', value: 17124 },
  ];
  const brl = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

  it('expõe o gráfico com nome acessível e valor-âncora no centro', () => {
    render(
      <DonutChart aria-label="Receita por modalidade" data={data} centerValue="R$ 85,6k" centerLabel="Receita total" />,
    );
    expect(screen.getByRole('img', { name: 'Receita por modalidade' })).toBeInTheDocument();
    expect(screen.getByText('R$ 85,6k')).toBeInTheDocument();
    expect(screen.getByText('Receita total')).toBeInTheDocument();
  });

  it('renderiza a legenda com rótulo, valor e % por fatia (identidade não é só-cor)', () => {
    render(<DonutChart aria-label="Receita por modalidade" data={data} formatValue={brl} />);
    const itens = screen.getAllByRole('listitem');
    expect(itens).toHaveLength(3);
    // 41096 / 85617 ≈ 48%. textContent evita a armadilha do espaço fino do BRL.
    const primeiro = itens[0]!.textContent ?? '';
    expect(primeiro).toContain('21km');
    expect(primeiro).toContain('41.096');
    expect(primeiro).toContain('48%');
  });

  it('lista todas as categorias na legenda', () => {
    render(<DonutChart aria-label="Receita por modalidade" data={data} />);
    ['21km', '10km', '5km'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });
});
