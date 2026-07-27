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
      porStatus: { confirmado: 450, pendente: 2, cancelado: 1, estornado: 0 },
      porKit: { kit_ouro: 100, kit_prata: 150, kit_basico: 200, sem_kit: 3 },
      porModalidade: { '21k': 453 },
    },
    ...over,
  };
}

const norm = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ');

describe('FinanceiroView (S207-T1)', () => {
  // DEC-0727C: eram 4 KPIs, agora são 3 (o card de retenção saiu da conta
  // visível). A asserção do 4º card virou a NEGATIVA dele — mais forte, porque
  // reintroduzi-lo passa a quebrar o teste em vez de passar despercebido.
  it('mostra os 3 KPIs de repasse com o nome do dono (sem taxa da plataforma)', () => {
    const { container } = render(<FinanceiroView slug="e1" financeiro={mkFin()} loading={false} error={null} />);
    expect(norm(container.textContent)).toContain('R$ 85.617');
    expect(screen.getByText('Receita Total')).toBeInTheDocument();
    expect(screen.getByText('Disponível para Repasse')).toBeInTheDocument();
    expect(screen.getByText('Valor Repassado')).toBeInTheDocument();
    expect(screen.queryByText('Valor a ser disponibilizado')).not.toBeInTheDocument();
    // Taxa/margem da plataforma NUNCA aparece (RN-404).
    expect(screen.queryByText(/Taxa Leela/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Receita líquida')).not.toBeInTheDocument();
  });

  it('sem termo comercial: sem alerta RN-406, disponível indeterminado e estado honesto do repasse', () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin({ taxaPct: null, taxaValor: null, receitaLiquida: null })}
        loading={false}
        error={null}
      />,
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // A frase da retenção morreu com o card (DEC-0727C) — a retenção continua
    // existindo na conta, só não é mais um número que o organizador persegue.
    expect(screen.queryByText(/Retenção de até 15% do total/)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        'Sem termo comercial cadastrado: o disponível deste evento ainda não pode ser calculado.',
      ),
    ).toBeInTheDocument();
    // RN-235 · IAM-T7: o hint genérico "Disponível com o módulo de repasses"
    // MORREU. Sem repasse associado, o estado honesto é explícito sobre ESTE
    // evento — e nunca R$ 0,00, que sugeriria movimento que não houve.
    expect(screen.getByText('Nenhum repasse solicitado para este evento')).toBeInTheDocument();
    expect(screen.queryByText(/Disponível com o módulo de repasses/)).not.toBeInTheDocument();
  });

  it('financeiro ausente → EmptyState', () => {
    render(<FinanceiroView slug="e1" financeiro={null} loading={false} error={null} />);
    expect(screen.getByText('Financeiro ainda não disponível')).toBeInTheDocument();
  });

  it('renderiza o bar de inscrições por modalidade (reuso do chart do DS)', () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin({ inscritos: { total: 300, porStatus: { confirmado: 300, pendente: 0, cancelado: 0, estornado: 0 }, porKit: { kit_ouro: 0, kit_prata: 0, kit_basico: 0, sem_kit: 0 }, porModalidade: { '5k': 100, '10k': 200 } } })}
        loading={false}
        error={null}
      />,
    );
    expect(screen.getByRole('img', { name: 'Inscrições por modalidade' })).toBeInTheDocument();
  });

  it('renderiza o donut de receita por modalidade quando o agregado tem receitaPorModalidade', () => {
    render(
      <FinanceiroView
        slug="e1"
        financeiro={mkFin({ receitaPorModalidade: { '5k': 20000, '10k': 40000, '21k': 25617 } })}
        loading={false}
        error={null}
      />,
    );
    expect(screen.getByRole('img', { name: 'Receita por modalidade' })).toBeInTheDocument();
  });

  it('sem receitaPorModalidade → EmptyState honesto no card de receita', () => {
    render(<FinanceiroView slug="e1" financeiro={mkFin()} loading={false} error={null} />);
    expect(screen.getByText('Sem detalhamento de receita')).toBeInTheDocument();
  });

  it('mostra a dependência de backend (forma de pagamento/lote/repasse) sem inventar dado', () => {
    render(<FinanceiroView slug="e1" financeiro={mkFin()} loading={false} error={null} />);
    expect(screen.getByText('Disponível com o módulo de pagamento')).toBeInTheDocument();
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
