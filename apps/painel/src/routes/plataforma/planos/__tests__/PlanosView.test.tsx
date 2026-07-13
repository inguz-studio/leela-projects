import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlanosView, type PlanosViewProps } from '../PlanosView';
import { mkPlano, tabela } from '../_test/fixtures';

function setup(overrides: Partial<PlanosViewProps> = {}) {
  const onRetry = vi.fn();
  const onNovo = vi.fn();
  const onEditar = vi.fn();
  const onAplicar = vi.fn();
  render(
    <PlanosView
      planos={[]}
      loading={false}
      error={null}
      onRetry={onRetry}
      onNovo={onNovo}
      onEditar={onEditar}
      onAplicar={onAplicar}
      {...overrides}
    />,
  );
  return { onRetry, onNovo, onEditar, onAplicar };
}

describe('PlanosView', () => {
  it('mostra skeleton no load', () => {
    setup({ loading: true });
    expect(screen.getByRole('status', { name: 'Carregando planos de cobrança' })).toBeInTheDocument();
  });

  it('mostra erro + Tentar novamente e dispara onRetry', async () => {
    const { onRetry } = setup({ error: new Error('boom') });
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('mostra EmptyState honesto quando o catálogo está vazio', () => {
    setup({ planos: [] });
    expect(screen.getByText('Nenhum plano de cobrança ainda')).toBeInTheDocument();
  });

  it('lista os planos com nome, taxa por método e mensalidade', () => {
    setup({
      planos: [
        mkPlano({ id: 'promo', nome: 'Promoção agressiva', taxaCartaoAVista: 6, taxaPix: 4, saasMonthlyFee: 0 }),
      ],
    });
    expect(screen.getByText('Promoção agressiva')).toBeInTheDocument();
    expect(screen.getByText('6%')).toBeInTheDocument();
    expect(screen.getByText('4%')).toBeInTheDocument();
  });

  it('resume a tabela de parcelas por linha', () => {
    setup({ planos: [mkPlano({ tabelaTaxasParcela: tabela(3) })] });
    expect(screen.getByText('3% em 2x-12x')).toBeInTheDocument();
  });

  it('dispara onNovo ao clicar em Novo plano', async () => {
    const { onNovo } = setup({ planos: [mkPlano()] });
    await userEvent.click(screen.getByRole('button', { name: 'Novo plano' }));
    expect(onNovo).toHaveBeenCalled();
  });

  it('dispara onEditar e onAplicar com o plano da linha', async () => {
    const plano = mkPlano({ id: 'promo', nome: 'Promoção agressiva' });
    const { onEditar, onAplicar } = setup({ planos: [plano] });
    await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
    expect(onEditar).toHaveBeenCalledWith(plano);
    await userEvent.click(screen.getByRole('button', { name: 'Aplicar' }));
    expect(onAplicar).toHaveBeenCalledWith(plano);
  });
});
