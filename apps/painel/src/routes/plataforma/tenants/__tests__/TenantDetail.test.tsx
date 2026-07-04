import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantDetail } from '../TenantDetail';
import { mkTenant } from '../../_test/fixtures';

const baseProps = {
  loading: false,
  error: null,
  running: false,
  actionError: null,
  onAction: () => {},
  onEditarTermos: () => {},
  onVoltar: () => {},
};

describe('TenantDetail', () => {
  it('skeleton no load', () => {
    render(<TenantDetail {...baseProps} tenant={null} loading />);
    expect(screen.getByRole('status', { name: 'Carregando tenant' })).toBeInTheDocument();
  });

  it('erro/ausência de tenant → alerta + voltar', () => {
    render(<TenantDetail {...baseProps} tenant={null} error={new Error('x')} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Voltar/ })).toBeInTheDocument();
  });

  it('pending → "Aprovar tenant" e dispara onAction para ativo', async () => {
    const onAction = vi.fn();
    render(<TenantDetail {...baseProps} tenant={mkTenant({ status: 'pending' })} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Aprovar tenant' }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ to: 'ativo', confirm: false }));
  });

  it('ativo → "Suspender" com ação confirmável', async () => {
    const onAction = vi.fn();
    render(<TenantDetail {...baseProps} tenant={mkTenant({ status: 'ativo' })} onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: 'Suspender' }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ to: 'suspenso', confirm: true }));
  });

  it('suspenso → card crítico + "Reativar"', () => {
    render(<TenantDetail {...baseProps} tenant={mkTenant({ status: 'suspenso' })} />);
    expect(screen.getByText('Tenant suspenso')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reativar' })).toBeInTheDocument();
  });

  it('exibe KPIs (GMV formatado)', () => {
    render(<TenantDetail {...baseProps} tenant={mkTenant({ status: 'ativo', gmvAcumulado: 85617 })} />);
    expect(screen.getByText(/85\.617/)).toBeInTheDocument();
  });

  it('actionError → alerta com mensagem clara de failed-precondition', () => {
    const err = Object.assign(new Error('fp'), { code: 'functions/failed-precondition' });
    render(<TenantDetail {...baseProps} tenant={mkTenant({ status: 'ativo' })} actionError={err} />);
    expect(screen.getByText(/papel conflitante|transi[çc][ãa]o/i)).toBeInTheDocument();
  });

  it('editar termos dispara o callback', async () => {
    const onEditarTermos = vi.fn();
    render(<TenantDetail {...baseProps} tenant={mkTenant({ status: 'ativo' })} onEditarTermos={onEditarTermos} />);
    await userEvent.click(screen.getByRole('button', { name: /Editar termos/ }));
    expect(onEditarTermos).toHaveBeenCalled();
  });
});
