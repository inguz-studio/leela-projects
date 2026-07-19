// =============================================================================
// InfluenciadoresPage (R9-E · S-R9-11-T8 · RN-319, lado do ORGANIZADOR) — na
// aba Clubs, vê as vendas/conversões + comissão dos afiliados do PRÓPRIO tenant.
// Testa os estados da tela (vazio/dados/erro), KPIs somados, busca, e o registro
// de repasse manual de comissão (FASE 2 · idempotência amigável).
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { InfluenciadoresPage } from '../InfluenciadoresPage';
import type { AfiliadoDoTenant } from '@leela/api-client';

const mocks = vi.hoisted(() => ({
  getAfiliadosDoTenant: vi.fn(),
  registrarRepasseComissao: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  getAfiliadosDoTenant: mocks.getAfiliadosDoTenant,
  registrarRepasseComissao: mocks.registrarRepasseComissao,
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
    comissao: null,
    comissaoAcumulada: 0,
    comissaoRepassada: 0,
    saldoComissao: 0,
    ultimasConversoes: [],
    ultimosRepasses: [],
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
    <ToastProvider>
      <MemoryRouter initialEntries={['/clubes/influenciadores']}>
        <InfluenciadoresPage />
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  mocks.getAfiliadosDoTenant.mockReset();
  mocks.registrarRepasseComissao.mockReset();
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

  it('saldo negativo aparece como dívida e não oferece repasse', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({
      afiliados: [
        afiliado({
          comissao: { tipo: 'percentual', percentual: 10 },
          comissaoAcumulada: 100,
          comissaoRepassada: 300,
          saldoComissao: -200,
        }),
      ],
    });
    renderPage();
    expect(await screen.findByText('-R$ 200,00 (dívida)')).toBeInTheDocument();
    expect(screen.getByText('Em dívida')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar repasse' })).not.toBeInTheDocument();
  });

  it('registra repasse do saldo com idempotência e atualiza o toast', async () => {
    mocks.getAfiliadosDoTenant.mockResolvedValue({
      afiliados: [
        afiliado({
          comissao: { tipo: 'percentual', percentual: 10 },
          comissaoAcumulada: 500,
          comissaoRepassada: 0,
          saldoComissao: 500,
        }),
      ],
    });
    mocks.registrarRepasseComissao.mockResolvedValue({
      ok: true,
      repasseId: 'r1',
      duplicado: false,
      saldoComissao: 0,
    });
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: 'Registrar repasse' }));
    // ConfirmModal aberto com o valor do saldo.
    expect(await screen.findByText(/Repasse de R\$\s*500,00/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar repasse' }));
    await vi.waitFor(() => expect(mocks.registrarRepasseComissao).toHaveBeenCalledTimes(1));
    const arg = mocks.registrarRepasseComissao.mock.calls[0]![0];
    expect(arg).toMatchObject({ eventoId: 'evt-1', afiliadoId: 'DIONEY10', valor: 500 });
    expect(typeof arg.repasseId).toBe('string');
    expect(arg.repasseId.length).toBeGreaterThanOrEqual(8);
    expect(await screen.findByText('Repasse registrado')).toBeInTheDocument();
  });
});
