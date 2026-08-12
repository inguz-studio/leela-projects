// =============================================================================
// Aba Clientes da ficha do tenant (ADMIN-VISAO onda 3 · S1612-T6). Os casos são
// os do gate da tarefa:
//   (a) a LISTA é comportamento e só — nenhum CPF, e-mail, telefone ou endereço
//       aparece na tabela, e nada abre ficha na montagem da tela;
//   (b) os dois números de dinheiro têm rótulos que os separam (régua R19), e o
//       contador de inscrições diz "confirmadas" porque é o que ele conta;
//   (c) o aviso de que a consulta fica registrada aparece ANTES do clique;
//   (d) o contador não apresenta recorte como total.
//
// Hooks de dado mockados com `vi.hoisted` (molde de VendasTabRoute.test).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ClientesTabRoute } from '../ClientesTabRoute';
import type { ListaGlobalState } from '../../_data/listasGlobais';
import type { FichaDoClienteState } from '../_data/clientesTenant';
import type { ClienteTenantView } from '@leela/api-client';

const mocks = vi.hoisted(() => ({
  useClientesDoTenant: vi.fn(),
  useFichaDoCliente: vi.fn(),
}));

vi.mock('../_data/clientesTenant', () => ({
  useClientesDoTenant: mocks.useClientesDoTenant,
  useFichaDoCliente: mocks.useFichaDoCliente,
}));

function mkCliente(over: Partial<ClienteTenantView> = {}): ClienteTenantView {
  return {
    clienteKey: 'k-marina',
    nome: 'Marina Castelo',
    qtdEventos: 3,
    qtdInscricoes: 4,
    valorGasto: 862.5,
    ltv: 780,
    eventos: {
      'meia-maratona-floripa-2026': {
        nome: 'Meia Maratona de Floripa 2026',
        qtdInscricoes: 2,
        qtdEstornadas: 1,
        valorPago: 400,
      },
    },
    ...over,
  };
}

function estado(
  over: Partial<ListaGlobalState<ClienteTenantView>> = {}
): ListaGlobalState<ClienteTenantView> {
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

function fichaState(over: Partial<FichaDoClienteState> = {}): FichaDoClienteState {
  return {
    clienteKey: null,
    nome: '',
    ficha: null,
    loading: false,
    erro: null,
    abrir: vi.fn(),
    fechar: vi.fn(),
    ...over,
  };
}

function renderRota(): void {
  render(
    <MemoryRouter initialEntries={['/plataforma/tenants/castelo-producoes/clientes']}>
      <Routes>
        <Route path="/plataforma/tenants/:tenantId/clientes" element={<ClientesTabRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useClientesDoTenant.mockReturnValue(estado());
  mocks.useFichaDoCliente.mockReturnValue(fichaState());
});

describe('ClientesTab · a lista é comportamento, e só (RN-540)', () => {
  it('não existe coluna de CPF, e-mail, telefone ou endereço', () => {
    mocks.useClientesDoTenant.mockReturnValue(estado({ itens: [mkCliente()] }));
    renderRota();

    expect(screen.queryByRole('columnheader', { name: /cpf|documento/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /e-?mail/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /telefone/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: /endere|cidade/i })
    ).not.toBeInTheDocument();
  });

  it('as colunas são exatamente as do comportamento de compra', () => {
    mocks.useClientesDoTenant.mockReturnValue(estado({ itens: [mkCliente()] }));
    renderRota();

    expect(screen.getByRole('columnheader', { name: 'Cliente' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Eventos' })).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Inscrições confirmadas' })
    ).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Valor gasto' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'LTV' })).toBeInTheDocument();
  });

  it('a montagem da tela NÃO abre ficha nenhuma (nada de consulta em laço)', () => {
    const abrir = vi.fn();
    mocks.useFichaDoCliente.mockReturnValue(fichaState({ abrir }));
    mocks.useClientesDoTenant.mockReturnValue(
      estado({
        itens: [
          mkCliente(),
          mkCliente({ clienteKey: 'k-joao', nome: 'João Prado' }),
          mkCliente({ clienteKey: 'k-ana', nome: 'Ana Reis' }),
        ],
      })
    );
    renderRota();

    expect(abrir).not.toHaveBeenCalled();
  });

  it('o aviso de que a consulta fica registrada aparece ANTES do clique', () => {
    renderRota();

    expect(screen.getByText(/cada abertura fica registrada/i)).toBeInTheDocument();
  });
});

describe('ClientesTab · a régua R19 dos dois números', () => {
  it('valor gasto e LTV têm rótulos distintos e a régua diz o que cada um conta', () => {
    mocks.useClientesDoTenant.mockReturnValue(estado({ itens: [mkCliente()] }));
    renderRota();

    expect(screen.getByText('R$ 862,50')).toBeInTheDocument();
    expect(screen.getByText('R$ 780,00')).toBeInTheDocument();
    expect(screen.getByText(/saiu do bolso da pessoa/i)).toBeInTheDocument();
    expect(screen.getByText(/receita do produtor atribuível/i)).toBeInTheDocument();
  });

  it('a taxa da Leela é chamada de Serviço na régua (SERV-3)', () => {
    renderRota();

    expect(screen.getByText(/com o Serviço somado/)).toBeInTheDocument();
    expect(screen.queryByText(/taxa da plataforma/i)).not.toBeInTheDocument();
  });

  it('a régua diz que a estornada fica fora dos dois números', () => {
    renderRota();

    expect(screen.getByText(/estornada continua no histórico/i)).toBeInTheDocument();
  });
});

describe('ClientesTab · abrir a ficha é um gesto explícito', () => {
  it('o botão da linha abre a ficha daquela pessoa (caminho de teclado)', async () => {
    const abrir = vi.fn();
    const cliente = mkCliente();
    mocks.useFichaDoCliente.mockReturnValue(fichaState({ abrir }));
    mocks.useClientesDoTenant.mockReturnValue(estado({ itens: [cliente] }));
    renderRota();

    await userEvent.click(screen.getByRole('button', { name: 'Abrir ficha' }));

    expect(abrir).toHaveBeenCalledTimes(1);
    expect(abrir).toHaveBeenCalledWith(cliente);
  });

  it('com a ficha em foco, o drawer mostra o nome da pessoa clicada', () => {
    mocks.useFichaDoCliente.mockReturnValue(
      fichaState({ clienteKey: 'k-marina', nome: 'Marina Castelo', loading: true })
    );
    mocks.useClientesDoTenant.mockReturnValue(estado({ itens: [mkCliente()] }));
    renderRota();

    expect(screen.getByRole('dialog', { name: 'Ficha de Marina Castelo' })).toBeInTheDocument();
    expect(
      screen.getByRole('status', { name: 'Carregando a ficha do cliente' })
    ).toBeInTheDocument();
  });

  it('sem ficha em foco, nenhum drawer está na tela', () => {
    mocks.useClientesDoTenant.mockReturnValue(estado({ itens: [mkCliente()] }));
    renderRota();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('ClientesTab · contador e estados', () => {
  it('pede a lista do tenant do path', () => {
    renderRota();

    expect(mocks.useClientesDoTenant).toHaveBeenCalledWith('castelo-producoes');
    expect(mocks.useFichaDoCliente).toHaveBeenCalledWith('castelo-producoes');
  });

  it('com próxima página, o contador NÃO apresenta o carregado como total', () => {
    mocks.useClientesDoTenant.mockReturnValue(
      estado({
        itens: [mkCliente(), mkCliente({ clienteKey: 'k-joao', nome: 'João Prado' })],
        temMais: true,
      })
    );
    renderRota();

    expect(screen.getByText('Mostrando 2 clientes · há mais para carregar')).toBeInTheDocument();
    expect(screen.queryByText(/de \d+ clientes/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Carregar mais' })).toBeInTheDocument();
  });

  it('sem próxima página, o número vira total do recorte e o botão some', () => {
    mocks.useClientesDoTenant.mockReturnValue(estado({ itens: [mkCliente()] }));
    renderRota();

    expect(screen.getByText('1 cliente · fim da lista')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
  });

  it('vazio fala do tenant, não da plataforma', () => {
    renderRota();

    expect(screen.getByText('Nenhum cliente neste tenant')).toBeInTheDocument();
  });

  it('carregando mostra skeleton nomeado', () => {
    mocks.useClientesDoTenant.mockReturnValue(estado({ loading: true }));
    renderRota();

    expect(screen.getByRole('status', { name: 'Carregando clientes' })).toBeInTheDocument();
  });

  it('erro mostra alerta com ação de tentar de novo', async () => {
    const refetch = vi.fn();
    mocks.useClientesDoTenant.mockReturnValue(estado({ error: new Error('denied'), refetch }));
    renderRota();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalled();
  });
});
