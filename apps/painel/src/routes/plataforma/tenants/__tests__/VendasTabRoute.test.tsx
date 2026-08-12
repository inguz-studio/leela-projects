// =============================================================================
// Aba Vendas da ficha do tenant (ADMIN-VISAO onda 2 · S1613-T2). Os casos são
// os do gate da onda:
//   (a) venda em modo repassada exibe o FACE CHEIO como líquido;
//   (b) pagamento sem `conciliacao` mostra o rótulo da causa e nunca "R$ 0";
//   (c) o contador não apresenta total truncado como total.
//
// Hook de dado mockado com `vi.hoisted` (molde de EventosGlobaisRoute.test).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { VendasTabRoute } from '../VendasTabRoute';
import { mkVenda } from '../_test/fixtures';
import type { ListaGlobalState } from '../../_data/listasGlobais';
import type { VendaDoTenant } from '../_data/vendas';

const mocks = vi.hoisted(() => ({ useVendasDoTenant: vi.fn() }));

vi.mock('../_data/vendas', () => ({ useVendasDoTenant: mocks.useVendasDoTenant }));

function estado(over: Partial<ListaGlobalState<VendaDoTenant>> = {}): ListaGlobalState<VendaDoTenant> {
  return {
    itens: [],
    loading: false,
    loadingMore: false,
    error: null,
    temMais: false,
    carregarMais: vi.fn(),
    refetch: vi.fn(),
    ...over,
  };
}

function renderRota(): void {
  render(
    <MemoryRouter initialEntries={['/plataforma/tenants/castelo-producoes/vendas']}>
      <Routes>
        <Route path="/plataforma/tenants/:tenantId/vendas" element={<VendasTabRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useVendasDoTenant.mockReturnValue(estado());
});

describe('VendasTab · a economia vem do carimbo (RN-537)', () => {
  it('modo repassada exibe o FACE CHEIO como líquido do produtor (RN-182)', () => {
    mocks.useVendasDoTenant.mockReturnValue(
      estado({
        itens: [
          mkVenda({
            valorFinal: 200,
            taxaRepassada: 20,
            conciliacao: {
              idTransacao: 'tx-repassada',
              gateway: 'asaas',
              taxaValor: 20,
              repasseOrganizador: 200,
            },
          }),
        ],
      })
    );
    renderRota();

    expect(
      screen.getByRole('columnheader', { name: 'Líquido do produtor' })
    ).toBeInTheDocument();
    // Face e líquido são o MESMO número: R$ 200,00 aparece duas vezes.
    expect(screen.getAllByText('R$ 200,00')).toHaveLength(2);
    // `face − taxa` produziria 180 — o número que a tela não pode inventar.
    expect(screen.queryByText('R$ 180,00')).not.toBeInTheDocument();
  });

  it('modo incorporada exibe o líquido gravado, sem recalcular', () => {
    mocks.useVendasDoTenant.mockReturnValue(estado({ itens: [mkVenda()] }));
    renderRota();

    expect(screen.getByText('R$ 20,00')).toBeInTheDocument();
    expect(screen.getByText('R$ 180,00')).toBeInTheDocument();
  });

  it('o cabeçalho da taxa da Leela é "Serviço" (SERV-3)', () => {
    mocks.useVendasDoTenant.mockReturnValue(estado({ itens: [mkVenda()] }));
    renderRota();

    expect(screen.getByRole('columnheader', { name: 'Serviço' })).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: /taxa da plataforma/i })
    ).not.toBeInTheDocument();
  });
});

describe('VendasTab · ausência de carimbo não é zero', () => {
  it('pagamento pendente mostra o rótulo da causa e NÃO "R$ 0"', () => {
    const venda = mkVenda({ status: 'pendente' });
    delete (venda.pagamento as { conciliacao?: unknown }).conciliacao;
    mocks.useVendasDoTenant.mockReturnValue(estado({ itens: [venda] }));
    renderRota();

    // Serviço e líquido: dois rótulos, mesma causa.
    expect(screen.getAllByText('Aguarda confirmação')).toHaveLength(2);
    expect(screen.queryByText('R$ 0,00')).not.toBeInTheDocument();
    expect(screen.queryByText('R$ 0')).not.toBeInTheDocument();
  });

  it('pagamento que falhou nomeia a causa própria', () => {
    const venda = mkVenda({ status: 'falhou' });
    delete (venda.pagamento as { conciliacao?: unknown }).conciliacao;
    mocks.useVendasDoTenant.mockReturnValue(estado({ itens: [venda] }));
    renderRota();

    expect(screen.getAllByText('Não liquidou')).toHaveLength(2);
  });
});

describe('VendasTab · contador e paginação', () => {
  it('com próxima página, o contador NÃO apresenta o carregado como total', () => {
    mocks.useVendasDoTenant.mockReturnValue(
      estado({
        itens: [
          mkVenda({ id: 'pag-1', pedidoRef: 'ped-1' }, { id: 'ped-1' }),
          mkVenda({ id: 'pag-2', pedidoRef: 'ped-2' }, { id: 'ped-2', codigoPedido: 'P9X4B' }),
        ],
        temMais: true,
      })
    );
    renderRota();

    expect(screen.getByText('Mostrando 2 vendas · há mais para carregar')).toBeInTheDocument();
    expect(screen.queryByText(/de \d+ vendas/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Carregar mais' })).toBeInTheDocument();
  });

  it('sem próxima página, o número vira total do recorte e o botão some', () => {
    mocks.useVendasDoTenant.mockReturnValue(estado({ itens: [mkVenda()], temMais: false }));
    renderRota();

    expect(screen.getByText('1 venda · fim da lista')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
  });

  it('o contador conta linhas de venda, não pagantes (régua R19)', () => {
    // Um pedido de grupo: três inscritos, UMA linha.
    mocks.useVendasDoTenant.mockReturnValue(
      estado({
        itens: [
          mkVenda({}, { inscritoRefs: ['i1', 'i2', 'i3'] }),
        ],
      })
    );
    renderRota();

    // Três inscritos, mas o contador diz UMA venda — e a palavra que ele usa é
    // "venda", nunca uma que prometa pessoas.
    const contador = screen.getByText('1 venda · fim da lista');
    expect(contador).toBeInTheDocument();
    expect(contador.textContent).not.toMatch(/inscrit|pagante/i);
    expect(screen.queryByRole('columnheader', { name: /inscrit|pagante/i })).not.toBeInTheDocument();
  });
});

describe('VendasTab · linha e estados', () => {
  it('mostra o código do pedido formatado e o responsável', () => {
    mocks.useVendasDoTenant.mockReturnValue(estado({ itens: [mkVenda()] }));
    renderRota();

    expect(screen.getByText('PED-K7M2Q')).toBeInTheDocument();
    expect(screen.getByText('Marina Castelo')).toBeInTheDocument();
  });

  it('pedido ilegível não derruba as cifras da linha', () => {
    mocks.useVendasDoTenant.mockReturnValue(estado({ itens: [mkVenda({}, null)] }));
    renderRota();

    expect(screen.getByText('R$ 180,00')).toBeInTheDocument();
    expect(screen.queryByText('PED-K7M2Q')).not.toBeInTheDocument();
  });

  it('carregando mostra skeleton nomeado', () => {
    mocks.useVendasDoTenant.mockReturnValue(estado({ loading: true }));
    renderRota();

    expect(screen.getByRole('status', { name: 'Carregando vendas' })).toBeInTheDocument();
  });

  it('vazio fala do tenant, não da plataforma', () => {
    renderRota();
    expect(screen.getByText('Nenhuma venda neste tenant')).toBeInTheDocument();
  });

  it('erro mostra alerta com ação de tentar de novo', async () => {
    const refetch = vi.fn();
    mocks.useVendasDoTenant.mockReturnValue(estado({ error: new Error('denied'), refetch }));
    renderRota();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalled();
  });
});
