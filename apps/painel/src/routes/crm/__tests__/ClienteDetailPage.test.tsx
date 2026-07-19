// =============================================================================
// ClienteDetailPage (E19 · S-R9-13 · RN-172) — detalhe: dados + histórico por
// evento, aniversário derivado (mm-dd), idade AO VIVO, não-encontrado e erro.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ClienteDetailPage } from '../ClienteDetailPage';
import type { CrmCliente } from '@leela/api-client';

const mocks = vi.hoisted(() => ({
  onSessionChange: vi.fn(),
  getClaims: vi.fn(),
  getCrmCliente: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  onSessionChange: mocks.onSessionChange,
  getClaims: mocks.getClaims,
  getCrmCliente: mocks.getCrmCliente,
  getLeelaDb: () => ({}),
}));

function setSession(): void {
  mocks.onSessionChange.mockImplementation((cb: (u: unknown) => void) => {
    cb({ uid: 'u1', email: 'org@demo.dev' });
    return () => {};
  });
  mocks.getClaims.mockResolvedValue({ tenantId: 't1' });
}

function renderDetalhe(key = 'cpf_abc'): void {
  render(
    <MemoryRouter initialEntries={[`/crm/${key}`]}>
      <Routes>
        <Route path="/crm/:clienteKey" element={<ClienteDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const CLIENTE: CrmCliente = {
  clienteKey: 'cpf_abc',
  tenantId: 't1',
  chaveTipo: 'cpf',
  nome: 'Ana Prado',
  genero: 'feminino',
  nascimento: '1990-05-14',
  aniversario: '05-14',
  qtdEventos: 2,
  qtdInscricoes: 3,
  valorGasto: 4500,
  ltv: 4200,
  eventos: {
    'evt-1': { nome: 'Meia de Floripa', qtdInscricoes: 2, qtdEstornadas: 0, valorPago: 3000 },
    'evt-2': { nome: 'Trail da Serra', qtdInscricoes: 1, qtdEstornadas: 1, valorPago: 1200 },
  },
  inscricoes: {},
};

beforeEach(() => {
  mocks.onSessionChange.mockReset();
  mocks.getClaims.mockReset();
  mocks.getCrmCliente.mockReset();
});

describe('ClienteDetailPage', () => {
  it('renderiza dados, aniversário derivado e histórico por evento', async () => {
    setSession();
    mocks.getCrmCliente.mockResolvedValue(CLIENTE);
    renderDetalhe();
    expect(await screen.findByText('Meia de Floripa')).toBeInTheDocument();
    expect(screen.getByText('Trail da Serra')).toBeInTheDocument();
    // Aniversário mm-dd (05-14) → "14 de mai" — nunca idade congelada.
    expect(screen.getByText('14 de mai')).toBeInTheDocument();
    expect(screen.getByText('Feminino')).toBeInTheDocument();
    // KPI LTV.
    expect(screen.getByText('R$ 4.200,00')).toBeInTheDocument();
  });

  it('cliente inexistente (reader null) mostra estado honesto', async () => {
    setSession();
    mocks.getCrmCliente.mockResolvedValue(null);
    renderDetalhe('cpf_removido');
    expect(await screen.findByText('Cliente não encontrado')).toBeInTheDocument();
  });

  it('erro do reader mostra alerta', async () => {
    setSession();
    mocks.getCrmCliente.mockRejectedValue(new Error('permission-denied'));
    renderDetalhe();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar este cliente',
    );
  });
});
