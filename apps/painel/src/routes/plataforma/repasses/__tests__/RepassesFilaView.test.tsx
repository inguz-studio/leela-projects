import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RepassesFilaView } from '../RepassesFilaView';
import { mkFilaItem } from '../_test/fixtures';

const noop = () => {};

const base = {
  estadoFilter: 'todos' as const,
  tenantFilter: 'todos',
  onEstadoFilterChange: noop,
  onTenantFilterChange: noop,
  onRetry: noop,
  onAprovar: noop,
  onRecusar: noop,
};

const itens = [
  mkFilaItem({ id: 'a', tenantId: 't1', estado: 'solicitado', valor: 8500 }, 'Castelo Produções'),
  mkFilaItem({ id: 'b', tenantId: 't2', estado: 'aprovado', valor: 1200 }, 'Alfa Runs'),
];

describe('RepassesFilaView', () => {
  it('mostra skeleton no load', () => {
    render(<RepassesFilaView {...base} itens={[]} loading error={null} />);
    expect(screen.getByRole('status', { name: 'Carregando fila de repasses' })).toBeInTheDocument();
  });

  it('mostra erro + Tentar novamente e dispara onRetry', async () => {
    const onRetry = vi.fn();
    render(<RepassesFilaView {...base} itens={[]} loading={false} error={new Error('boom')} onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalled();
  });

  it('lista itens com tenant, valor e contador', () => {
    render(<RepassesFilaView {...base} itens={itens} loading={false} error={null} />);
    // "Castelo Produções" aparece na linha da tabela E como opção do seletor.
    expect(screen.getAllByText('Castelo Produções').length).toBeGreaterThan(0);
    expect(screen.getByText('R$ 8.500,00')).toBeInTheDocument();
    expect(screen.getByText('Mostrando 2 de 2 repasses')).toBeInTheDocument();
  });

  it('EmptyState honesto quando não há pendência', () => {
    render(<RepassesFilaView {...base} itens={[]} loading={false} error={null} />);
    expect(screen.getByText(/Nenhum repasse na fila/i)).toBeInTheDocument();
  });

  // A faceta é LISTA desde 17/08 (leva 20): a contagem do recorte fica no
  // gatilho e a contagem por estado, dentro da lista.
  it('a lista de estado mostra contagem e dispara onEstadoFilterChange', async () => {
    const onEstadoFilterChange = vi.fn();
    render(
      <RepassesFilaView {...base} itens={itens} loading={false} error={null} onEstadoFilterChange={onEstadoFilterChange} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Estado' }));
    await userEvent.click(await screen.findByRole('option', { name: /Solicitados/ }));
    expect(onEstadoFilterChange).toHaveBeenCalledWith('solicitado');
  });

  it('seletor de tenant lista só quem está na fila e dispara onTenantFilterChange', async () => {
    const onTenantFilterChange = vi.fn();
    render(
      <RepassesFilaView {...base} itens={itens} loading={false} error={null} onTenantFilterChange={onTenantFilterChange} />,
    );
    // §8: o filtro de tenant abre o painel do DS (Combobox), não o listbox do SO.
    await userEvent.click(screen.getByLabelText('Tenant'));
    await userEvent.click(screen.getByRole('option', { name: 'Alfa Runs' }));
    expect(onTenantFilterChange).toHaveBeenCalledWith('t2');
  });

  it('linha solicitado tem Aprovar e Recusar', async () => {
    const onAprovar = vi.fn();
    const onRecusar = vi.fn();
    render(
      <RepassesFilaView
        {...base}
        itens={[itens[0]!]}
        loading={false}
        error={null}
        onAprovar={onAprovar}
        onRecusar={onRecusar}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Aprovar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Recusar' }));
    expect(onAprovar).toHaveBeenCalledWith(itens[0]);
    expect(onRecusar).toHaveBeenCalledWith(itens[0]);
  });

  it('linha aprovado SEM callback de pagamento não mostra ação de pagar', () => {
    render(<RepassesFilaView {...base} itens={[itens[1]!]} loading={false} error={null} />);
    expect(screen.queryByRole('button', { name: 'Registrar pagamento' })).not.toBeInTheDocument();
  });

  it('linha aprovado COM callback mostra Registrar pagamento e dispara', async () => {
    const onRegistrarPagamento = vi.fn();
    render(
      <RepassesFilaView
        {...base}
        itens={[itens[1]!]}
        loading={false}
        error={null}
        onRegistrarPagamento={onRegistrarPagamento}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }));
    expect(onRegistrarPagamento).toHaveBeenCalledWith(itens[1]);
  });
});
