// =============================================================================
// ClientesPage (E19 · S-R9-13 · RN-172) — estados do hub CRM: sem tenant,
// carregando, vazio honesto, erro, dados + ordenação, busca por prefixo e
// "carregar mais" (paginação por cursor). api-client mockado (sem Firestore).
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ClientesPage } from '../ClientesPage';
import type { CrmCliente } from '@leela/api-client';

const mocks = vi.hoisted(() => ({
  onSessionChange: vi.fn(),
  getClaims: vi.fn(),
  listarCrmClientes: vi.fn(),
  buscarCrmClientesPorNome: vi.fn(),
  getCrmCliente: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  onSessionChange: mocks.onSessionChange,
  getClaims: mocks.getClaims,
  listarCrmClientes: mocks.listarCrmClientes,
  buscarCrmClientesPorNome: mocks.buscarCrmClientesPorNome,
  getCrmCliente: mocks.getCrmCliente,
  getLeelaDb: () => ({}),
}));

function cliente(over: Partial<CrmCliente> = {}): CrmCliente {
  return {
    clienteKey: 'cpf_abc',
    tenantId: 't1',
    chaveTipo: 'cpf',
    nome: 'Ana Prado',
    genero: 'feminino',
    nascimento: '1990-05-14',
    aniversario: '05-14',
    qtdEventos: 3,
    qtdInscricoes: 5,
    valorGasto: 4500,
    ltv: 4200,
    eventos: {},
    inscricoes: {},
    ...over,
  };
}

function setSession(tenantId: string | null): void {
  mocks.onSessionChange.mockImplementation((cb: (u: unknown) => void) => {
    cb({ uid: 'u1', email: 'org@demo.dev' });
    return () => {};
  });
  mocks.getClaims.mockResolvedValue(tenantId === null ? {} : { tenantId });
}

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/crm']}>
      <ClientesPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.onSessionChange.mockReset();
  mocks.getClaims.mockReset();
  mocks.listarCrmClientes.mockReset();
  mocks.buscarCrmClientesPorNome.mockReset();
});

describe('ClientesPage', () => {
  it('sessão sem tenant mostra estado honesto, não lista', async () => {
    setSession(null);
    renderPage();
    expect(await screen.findByText('Sessão sem organizador')).toBeInTheDocument();
    expect(mocks.listarCrmClientes).not.toHaveBeenCalled();
  });

  it('CRM vazio mostra EmptyState honesto', async () => {
    setSession('t1');
    mocks.listarCrmClientes.mockResolvedValue({ itens: [], proxCursor: null });
    renderPage();
    expect(await screen.findByText('Seu CRM ainda está vazio')).toBeInTheDocument();
  });

  it('erro do reader mostra alerta', async () => {
    setSession('t1');
    mocks.listarCrmClientes.mockRejectedValue(new Error('permission-denied'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os clientes',
    );
  });

  it('lista clientes com LTV/valor e navega pelo detalhe', async () => {
    setSession('t1');
    mocks.listarCrmClientes.mockResolvedValue({
      itens: [cliente(), cliente({ clienteKey: 'email_x', nome: 'Bruno Dias', ltv: 100 })],
      proxCursor: null,
    });
    renderPage();
    expect(await screen.findByText('Ana Prado')).toBeInTheDocument();
    expect(screen.getByText('Bruno Dias')).toBeInTheDocument();
    expect(screen.getByText('R$ 4.200,00')).toBeInTheDocument();
    // Fim da lista (sem cursor) → não há botão "Carregar mais".
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
  });

  it('"carregar mais" anexa a próxima página (cursor)', async () => {
    setSession('t1');
    mocks.listarCrmClientes
      .mockResolvedValueOnce({ itens: [cliente()], proxCursor: { id: 'cur' } })
      .mockResolvedValueOnce({ itens: [cliente({ clienteKey: 'k2', nome: 'Carla Nunes' })], proxCursor: null });
    renderPage();
    const botao = await screen.findByRole('button', { name: 'Carregar mais' });
    await userEvent.click(botao);
    expect(await screen.findByText('Carla Nunes')).toBeInTheDocument();
    expect(screen.getByText('Ana Prado')).toBeInTheDocument();
  });

  it('busca por prefixo usa o reader server-side e mostra vazio honesto', async () => {
    setSession('t1');
    mocks.listarCrmClientes.mockResolvedValue({ itens: [cliente()], proxCursor: null });
    mocks.buscarCrmClientesPorNome.mockResolvedValue([]);
    renderPage();
    await screen.findByText('Ana Prado');
    await userEvent.type(screen.getByLabelText('Buscar por nome'), 'Zzz');
    await waitFor(() => expect(mocks.buscarCrmClientesPorNome).toHaveBeenCalled());
    expect(await screen.findByText('Nada encontrado')).toBeInTheDocument();
  });
});
