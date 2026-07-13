import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanoFormModal, type PlanoFormModalProps } from '../PlanoFormModal';
import { mkPlano } from '../../_test/fixtures';

const base: PlanoFormModalProps = {
  open: true,
  onOpenChange: () => {},
  plano: null,
  saving: false,
  saveError: null,
  onSave: () => {},
};

function setup(overrides: Partial<PlanoFormModalProps> = {}) {
  const onSave = vi.fn();
  render(<PlanoFormModal {...base} onSave={onSave} {...overrides} />);
  return { onSave };
}

describe('PlanoFormModal', () => {
  it('renderiza os campos de criação (nome, taxa por método, parcelas 2x-12x)', () => {
    setup();
    expect(screen.getByLabelText('Nome do plano')).toBeInTheDocument();
    expect(screen.getByLabelText('Cartão à vista (%)')).toBeInTheDocument();
    expect(screen.getByLabelText('PIX (%)')).toBeInTheDocument();
    expect(screen.getByLabelText('Mensalidade SaaS (R$)')).toBeInTheDocument();
    expect(screen.getByLabelText('2x')).toBeInTheDocument();
    expect(screen.getByLabelText('12x')).toBeInTheDocument();
  });

  it('parte dos defaults canônicos (10% cartão / 8% PIX)', () => {
    setup();
    expect(screen.getByLabelText('Cartão à vista (%)')).toHaveValue(10);
    expect(screen.getByLabelText('PIX (%)')).toHaveValue(8);
  });

  it('submit sem nome → erro inline e não chama onSave', async () => {
    const { onSave } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar plano' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('cria um plano válido chamando onSave com o input mapeado', async () => {
    const { onSave } = setup();
    await userEvent.type(screen.getByLabelText('Nome do plano'), 'Promoção agressiva');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar plano' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    const input = onSave.mock.calls[0]?.[0];
    expect(input).toMatchObject({
      nome: 'Promoção agressiva',
      taxaCartaoAVista: 10,
      taxaPix: 8,
      saasMonthlyFee: 0,
    });
    // tabela 2x-12x completa (o plano é template — não pode nascer furado)
    expect(Object.keys(input.tabelaTaxasParcela)).toHaveLength(11);
    expect(input.tabelaTaxasParcela['2']).toBe(0);
  });

  it('em edição, pré-preenche com os valores do plano', () => {
    setup({ plano: mkPlano({ nome: 'Padrão', taxaCartaoAVista: 10, taxaPix: 8 }) });
    expect(screen.getByLabelText('Nome do plano')).toHaveValue('Padrão');
    expect(screen.getByLabelText('Cartão à vista (%)')).toHaveValue(10);
  });

  it('mostra alerta quando saveError chega', () => {
    setup({ saveError: new Error('boom') });
    expect(screen.getByText(/Não foi possível salvar o plano/i)).toBeInTheDocument();
  });
});
