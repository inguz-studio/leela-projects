import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AplicarPlanoModal, type AplicarPlanoModalProps } from '../AplicarPlanoModal';
import { mkPlano } from '../../_test/fixtures';

const tenants = [
  { id: 'castelo-producoes', nome: 'Castelo Produções' },
  { id: 'alfa-runs', nome: 'Alfa Runs' },
];

const base: AplicarPlanoModalProps = {
  open: true,
  onOpenChange: () => {},
  plano: mkPlano({ nome: 'Promoção agressiva', taxaCartaoAVista: 6, taxaPix: 4 }),
  tenants,
  tenantsLoading: false,
  selectedTenantId: '',
  onSelectTenant: () => {},
  applying: false,
  applyError: null,
  onConfirm: () => {},
};

function setup(overrides: Partial<AplicarPlanoModalProps> = {}) {
  const onConfirm = vi.fn();
  const onSelectTenant = vi.fn();
  render(<AplicarPlanoModal {...base} onConfirm={onConfirm} onSelectTenant={onSelectTenant} {...overrides} />);
  return { onConfirm, onSelectTenant };
}

describe('AplicarPlanoModal', () => {
  it('não renderiza nada quando não há plano', () => {
    setup({ plano: null });
    expect(screen.queryByText('Aplicar plano de cobrança')).not.toBeInTheDocument();
  });

  it('mostra o alvo (plano + valores a estampar) e o Select de tenant', () => {
    setup();
    expect(screen.getByText('Promoção agressiva')).toBeInTheDocument();
    expect(screen.getByText('6%')).toBeInTheDocument();
    expect(screen.getByLabelText('Organizador (tenant)')).toBeInTheDocument();
  });

  it('deixa EXPLÍCITA a semântica de estampa sem vínculo vivo (§2.15)', () => {
    setup();
    const nota = screen.getByRole('note');
    expect(nota).toHaveTextContent(/nova versão/i);
    expect(nota).toHaveTextContent(/não altera/i);
  });

  it('desabilita "Aplicar plano" enquanto nenhum tenant está selecionado', () => {
    setup({ selectedTenantId: '' });
    expect(screen.getByRole('button', { name: 'Aplicar plano' })).toBeDisabled();
  });

  it('troca de tenant dispara onSelectTenant', async () => {
    const { onSelectTenant } = setup();
    await userEvent.selectOptions(screen.getByLabelText('Organizador (tenant)'), 'alfa-runs');
    expect(onSelectTenant).toHaveBeenCalledWith('alfa-runs');
  });

  it('com tenant selecionado, "Aplicar plano" chama onConfirm', async () => {
    const { onConfirm } = setup({ selectedTenantId: 'castelo-producoes' });
    const botao = screen.getByRole('button', { name: 'Aplicar plano' });
    expect(botao).toBeEnabled();
    await userEvent.click(botao);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('mostra alerta quando applyError chega', () => {
    setup({ applyError: new Error('boom') });
    expect(screen.getByText(/Não foi possível aplicar o plano/i)).toBeInTheDocument();
  });
});
