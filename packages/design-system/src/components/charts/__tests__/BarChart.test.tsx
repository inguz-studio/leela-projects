import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
// Recharts não desenha SVG no jsdom (sem layout) — o ChartErrorBoundary garante
// que a estrutura acessível (role img + rótulo + tabela equivalente) sobrevive.
// Testamos esse CONTRATO do componente do DS (Testing Trophy), não o SVG da lib;
// o plot real é provado ao vivo no showroom/preview.
import { BarChart } from '../BarChart';
import { chartCategoryVar, pctOf } from '../chartPalette';

describe('BarChart', () => {
  const data = [
    { label: '21km', value: 148, total: 200 },
    { label: '10km', value: 186, total: 250 },
    { label: '5km', value: 119, total: 150 },
  ];

  it('expõe o gráfico com nome acessível (role img + aria-label)', () => {
    render(<BarChart aria-label="Inscrições por modalidade" data={data} />);
    expect(screen.getByRole('img', { name: 'Inscrições por modalidade' })).toBeInTheDocument();
  });

  it('oferece uma tabela equivalente com categoria, valor e %', () => {
    render(<BarChart aria-label="Inscrições por modalidade" data={data} />);
    const table = screen.getByRole('table', { name: 'Inscrições por modalidade' });
    // Linha do 21km: cabeçalho + "148 / 200" + "74%" (escopo na própria linha —
    // 10km também arredonda p/ 74%, então a asserção é por linha).
    const linha21 = within(table).getByRole('rowheader', { name: '21km' }).closest('tr')!;
    expect(within(linha21).getByText('148 / 200')).toBeInTheDocument();
    expect(within(linha21).getByText(`${pctOf(148, 200)}%`)).toBeInTheDocument();
  });

  it('formata os valores com o formatValue fornecido', () => {
    render(
      <BarChart
        aria-label="Receita"
        data={[{ label: 'A', value: 1000 }]}
        formatValue={(v) => `R$ ${v}`}
      />,
    );
    expect(screen.getByText('R$ 1000')).toBeInTheDocument();
  });
});

describe('chartPalette', () => {
  it('atribui cor por índice fixo, dobrando a 6ª+ série em "Outros" (cat-5)', () => {
    expect(chartCategoryVar(0)).toBe('var(--chart-cat-1)');
    expect(chartCategoryVar(4)).toBe('var(--chart-cat-5)');
    expect(chartCategoryVar(9)).toBe('var(--chart-cat-5)');
    expect(chartCategoryVar(-3)).toBe('var(--chart-cat-1)');
  });

  it('pctOf é honesto com total zero', () => {
    expect(pctOf(50, 0)).toBe(0);
    expect(pctOf(148, 200)).toBe(74);
  });
});
