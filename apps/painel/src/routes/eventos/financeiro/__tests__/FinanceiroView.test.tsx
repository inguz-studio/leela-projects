import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FinanceiroView } from '../FinanceiroView';
import type { FinanceiroEvento } from '@leela/api-client';

function mkFin(over: Partial<FinanceiroEvento> = {}): FinanceiroEvento {
  return {
    tenantId: 'castelo',
    receitaBruta: 85617,
    taxaPct: 10.5,
    taxaValor: 8989,
    receitaLiquida: 76628,
    inscritos: {
      total: 453,
      porStatus: { confirmado: 450, pendente: 2, cancelado: 1 },
      porKit: { kit_ouro: 100, kit_prata: 150, kit_basico: 200, sem_kit: 3 },
      porModalidade: { '21k': 453 },
    },
    ...over,
  };
}

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ');

describe('FinanceiroView (S207-T1)', () => {
  it('mostra bruto R$ 85.617 e líquido presentes', () => {
    const { container } = render(<FinanceiroView slug="e1" financeiro={mkFin()} loading={false} error={null} />);
    expect(norm(container.textContent)).toContain('R$ 85.617');
    expect(screen.getByText('Receita líquida')).toBeInTheDocument();
    expect(screen.getByText('10,5%')).toBeInTheDocument();
  });

  it('sem termo: taxa/líquido "—" + alerta RN-406', () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin({ taxaPct: null, taxaValor: null, receitaLiquida: null })}
        loading={false}
        error={null}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('RN-406');
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2);
  });

  it('financeiro ausente → EmptyState', () => {
    render(<FinanceiroView slug="e1" financeiro={null} loading={false} error={null} />);
    expect(screen.getByText('Financeiro ainda não disponível')).toBeInTheDocument();
  });

  it('exportar dispara download do CSV', async () => {
    const createObjectURL = vi.fn(() => 'blob:x');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectURL, configurable: true });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<FinanceiroView slug="e1" financeiro={mkFin()} loading={false} error={null} />);
    await userEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));

    expect(createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });
});
