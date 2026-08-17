import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TenantsList } from '../TenantsList';
import { mkTenant } from '../../_test/fixtures';

const noop = () => {};

const tenants = [
  mkTenant({ id: 'passo-certo', nome: 'Passo Certo', slug: 'passo-certo', status: 'pending', eventosAtivos: 0, gmvAcumulado: 0 }),
  mkTenant({ id: 'castelo-producoes', nome: 'Castelo Produções', slug: 'castelo-producoes', status: 'ativo' }),
  mkTenant({ id: 'arena-velha', nome: 'Arena Velha', slug: 'arena-velha', status: 'suspenso', eventosAtivos: 1 }),
];

describe('TenantsList', () => {
  it('mostra skeleton no load', () => {
    render(
      <TenantsList tenants={null} loading error={null} filter="todos" onFilterChange={noop} onOpenTenant={noop} />,
    );
    expect(screen.getByRole('status', { name: 'Carregando tenants' })).toBeInTheDocument();
  });

  it('mostra bloco de erro no fail', () => {
    render(
      <TenantsList
        tenants={null}
        loading={false}
        error={new Error('boom')}
        filter="todos"
        onFilterChange={noop}
        onOpenTenant={noop}
      />,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('lista todos com saúde por tenant e contador', () => {
    render(
      <TenantsList
        tenants={tenants}
        loading={false}
        error={null}
        filter="todos"
        onFilterChange={noop}
        onOpenTenant={noop}
      />,
    );
    expect(screen.getByText('Castelo Produções')).toBeInTheDocument();
    expect(screen.getByText('Passo Certo')).toBeInTheDocument();
    // contador de visíveis (padrão "Mostrando X de Y")
    expect(screen.getByText('Mostrando 3 de 3 tenants')).toBeInTheDocument();
    // saúde: suspenso → Crítico
    expect(screen.getByText('Crítico')).toBeInTheDocument();
  });

  it('filtro pending → só Passo Certo (a lista recebe filter e some o resto)', () => {
    render(
      <TenantsList
        tenants={tenants}
        loading={false}
        error={null}
        filter="pending"
        onFilterChange={noop}
        onOpenTenant={noop}
      />,
    );
    expect(screen.getByText('Passo Certo')).toBeInTheDocument();
    expect(screen.queryByText('Castelo Produções')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 1 de 3 tenants')).toBeInTheDocument();
  });

  // A faceta é LISTA desde 17/08 (leva 20): a contagem por status vive dentro
  // da lista, e o gatilho carrega o nome da faceta em texto.
  it('a lista de filtro mostra a contagem por status e dispara onFilterChange', async () => {
    const onFilterChange = vi.fn();
    render(
      <TenantsList
        tenants={tenants}
        loading={false}
        error={null}
        filter="todos"
        onFilterChange={onFilterChange}
        onOpenTenant={noop}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Status' }));
    await userEvent.click(await screen.findByRole('option', { name: /Aguardando/ }));
    expect(onFilterChange).toHaveBeenCalledWith('pending');
  });

  it('filtro sem match → EmptyState do glossário', () => {
    render(
      <TenantsList
        tenants={[mkTenant({ id: 'a', status: 'ativo' })]}
        loading={false}
        error={null}
        filter="suspenso"
        onFilterChange={noop}
        onOpenTenant={noop}
      />,
    );
    expect(screen.getByText(/Nenhum tenant com esse status/i)).toBeInTheDocument();
    // ResultCount concorda no singular pelo TOTAL (1 tenant carregado), não
    // pelo visível — a mesma honestidade gramatical que a peça já traz para
    // as outras telas convertidas (Onda C6).
    expect(screen.getByText('Mostrando 0 de 1 tenant')).toBeInTheDocument();
  });

  it('abrir tenant chama onOpenTenant com o id', async () => {
    const onOpenTenant = vi.fn();
    render(
      <TenantsList
        tenants={[mkTenant({ id: 'castelo-producoes', nome: 'Castelo Produções' })]}
        loading={false}
        error={null}
        filter="todos"
        onFilterChange={noop}
        onOpenTenant={onOpenTenant}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Abrir' }));
    expect(onOpenTenant).toHaveBeenCalledWith('castelo-producoes');
  });

  it('exibe botão Provisionar só quando onProvisionar é passado', () => {
    const { rerender } = render(
      <TenantsList tenants={tenants} loading={false} error={null} filter="todos" onFilterChange={noop} onOpenTenant={noop} />,
    );
    expect(screen.queryByRole('button', { name: /Provisionar/ })).not.toBeInTheDocument();
    rerender(
      <TenantsList
        tenants={tenants}
        loading={false}
        error={null}
        filter="todos"
        onFilterChange={noop}
        onOpenTenant={noop}
        onProvisionar={noop}
      />,
    );
    expect(screen.getByRole('button', { name: /Provisionar/ })).toBeInTheDocument();
  });
});
