// =============================================================================
// InfluenciadoresPage (R9-E · S-R9-11-T8 · RN-319, lado do ORGANIZADOR) — na
// aba Clubs, vê as vendas/conversões dos afiliados do PRÓPRIO tenant. Testa os
// estados da tela (vazio/dados/erro), os KPIs somados e a busca.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { InfluenciadoresPage } from '../InfluenciadoresPage';
import type { AfiliadoDoTenant } from '@leela/api-client';

const mocks = vi.hoisted(() => ({ getAfiliadosDoTenant: vi.fn() }));

vi.mock('@leela/api-client', () => ({
  getAfiliadosDoTenant: mocks.getAfiliadosDoTenant,
}));

function afiliado(over: Partial<AfiliadoDoTenant> = {}): AfiliadoDoTenant {
  return {
    eventoId: 'evt-1',
    eventoNome: 'Meia de Floripa',
    refCodigo: 'DIONEY10',
    tipo: 'pessoa_fisica',
    status: 'ativo',
    janelaAtribuicaoDias: 7,
    minimoInscricoes: null,
    cupomCodigo: null,
    conversoes: 10,
    valorAtribuido: 3000,
    ultimasConversoes: [],
    nome: 'Dioney Galharte',
    canal: 'instagram',
    clubeRef: null,
    responsavelEmail: 'dioney@exemplo.com',
    documentoMascarado: null,
    ...over,
  };
}

function renderPage(): void {
  render(
    <MemoryRouter initialEntries={['/clubes/influenciadores']}>
      <InfluenciadoresPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.getAfiliadosDoTenant.mockReset();
});

describe('InfluenciadoresPage', () => {
  it('sem afiliados, mostra EmptyState que aponta para a aba Afiliados', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({ afiliados: [] });
    renderPage();
    expect(await screen.findByText('Nenhum influenciador ainda')).toBeInTheDocument();
  });

  it('lista os afiliados do tenant e soma os KPIs', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({
      afiliados: [
        afiliado(),
        afiliado({
          refCodigo: 'CLUBE5',
          nome: 'Floripa Run',
          tipo: 'clube',
          eventoNome: 'Trail da Serra',
          conversoes: 5,
          valorAtribuido: 1500,
        }),
      ],
    });
    renderPage();
    expect(await screen.findByText('Dioney Galharte')).toBeInTheDocument();
    expect(screen.getByText('Floripa Run')).toBeInTheDocument();
    // KPI de inscrições somadas: 10 + 5 = 15; valor 3000 + 1500 = R$ 4.500,00.
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('R$ 4.500,00')).toBeInTheDocument();
  });

  it('a busca filtra por nome/código/evento', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({
      afiliados: [
        afiliado(),
        afiliado({ refCodigo: 'CLUBE5', nome: 'Floripa Run', eventoNome: 'Trail da Serra' }),
      ],
    });
    renderPage();
    await screen.findByText('Dioney Galharte');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar influenciador' }), 'serra');
    expect(screen.getByText('Floripa Run')).toBeInTheDocument();
    expect(screen.queryByText('Dioney Galharte')).not.toBeInTheDocument();
  });

  it('falha do reader mostra alerta honesto', async () => {
    mocks.getAfiliadosDoTenant.mockRejectedValue(new Error('permission-denied'));
    renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os influenciadores',
    );
  });
});
