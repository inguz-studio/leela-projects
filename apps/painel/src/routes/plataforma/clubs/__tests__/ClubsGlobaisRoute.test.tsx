// =============================================================================
// `/plataforma/clubs` (ADMIN-VISAO onda 4 · S1614-T3). Além do contador e da
// coluna Tenant, o caso que esta tela precisa travar é o do GATE da spec:
// nenhuma linha pode sugerir receita de clube (RN-104 — pago é promessa, não
// cobrança viva; não existe mensalidade de clube no modelo).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouter from 'react-router-dom';
import { ClubsGlobaisRoute } from '../ClubsGlobaisRoute';
import { mkClube } from '../../../clubes/_test/fixtures';
import { mkTenant } from '../../_test/fixtures';
import type { ListaGlobalState } from '../../_data/listasGlobais';
import type { Clube } from '@leela/core';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useClubesGlobais: vi.fn(),
  useTenants: vi.fn(),
}));

vi.mock('../../_data/listasGlobais', () => ({
  useClubesGlobais: mocks.useClubesGlobais,
}));

vi.mock('../../_data/tenants', () => ({
  useTenants: mocks.useTenants,
}));

vi.mock('react-router-dom', async () => {
  const real = await vi.importActual<typeof ReactRouter>('react-router-dom');
  return { ...real, useNavigate: () => mocks.navigate };
});

function estado(over: Partial<ListaGlobalState<Clube>> = {}): ListaGlobalState<Clube> {
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
    <MemoryRouter initialEntries={['/plataforma/clubs']}>
      <ClubsGlobaisRoute />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useTenants.mockReturnValue({
    data: [mkTenant(), mkTenant({ id: 'passo-certo', nome: 'Passo Certo', slug: 'passo-certo' })],
    loading: false,
    error: null,
  });
  mocks.useClubesGlobais.mockReturnValue(estado());
});

describe('ClubsGlobaisRoute · lista', () => {
  it('coluna Tenant com o nome do dono do clube', () => {
    mocks.useClubesGlobais.mockReturnValue(
      estado({ itens: [mkClube({ tenantId: 'castelo-producoes' })] })
    );
    renderRota();

    expect(screen.getByRole('columnheader', { name: 'Tenant' })).toBeInTheDocument();
    expect(screen.getByText('Castelo Produções')).toBeInTheDocument();
  });

  it('membros e desafios vêm dos agregados, sem cifra em lugar nenhum', () => {
    mocks.useClubesGlobais.mockReturnValue(
      estado({ itens: [mkClube({ qtdMembrosAtivos: 120, qtdDesafiosAtivos: 3 })] })
    );
    renderRota();

    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/mensalidade/i)).not.toBeInTheDocument();
  });

  it('clube `pago_em_breve` diz "em breve" — nenhuma linha sugere receita (RN-104)', () => {
    mocks.useClubesGlobais.mockReturnValue(
      estado({ itens: [mkClube({ modeloEntrada: 'pago_em_breve' })] })
    );
    renderRota();

    expect(screen.getByText('Pago (em breve)')).toBeInTheDocument();
  });

  it('clube gratuito diz gratuito', () => {
    mocks.useClubesGlobais.mockReturnValue(
      estado({ itens: [mkClube({ modeloEntrada: 'gratuito' })] })
    );
    renderRota();

    expect(screen.getByText('Gratuito')).toBeInTheDocument();
  });

  it('não oferece filtro de status — `Clube` não tem esse campo', () => {
    mocks.useClubesGlobais.mockReturnValue(estado({ itens: [mkClube()] }));
    renderRota();

    expect(screen.queryByRole('group', { name: 'Filtrar por status' })).not.toBeInTheDocument();
  });

  it('contador honesto: mostrando enquanto há página, total só no fim', () => {
    mocks.useClubesGlobais.mockReturnValue(
      estado({ itens: [mkClube({ id: 'c1' }), mkClube({ id: 'c2' })], temMais: true })
    );
    const { unmount } = render(
      <MemoryRouter initialEntries={['/plataforma/clubs']}>
        <ClubsGlobaisRoute />
      </MemoryRouter>
    );
    expect(screen.getByText('Mostrando 2 clubs · há mais para carregar')).toBeInTheDocument();
    unmount();

    mocks.useClubesGlobais.mockReturnValue(estado({ itens: [mkClube()], temMais: false }));
    renderRota();
    expect(screen.getByText('1 clube · fim da lista')).toBeInTheDocument();
  });

  it('clicar na linha leva à ficha do tenant dono', async () => {
    mocks.useClubesGlobais.mockReturnValue(
      estado({ itens: [mkClube({ tenantId: 'passo-certo' })] })
    );
    renderRota();

    await userEvent.click(screen.getByText('Corrida Perfeita Sul'));
    expect(mocks.navigate).toHaveBeenCalledWith('/plataforma/tenants/passo-certo');
  });
});

describe('ClubsGlobaisRoute · recorte e estados', () => {
  it('escolher tenant troca o recorte da leitura', async () => {
    renderRota();

    await userEvent.click(screen.getByLabelText('Filtrar por tenant'));
    await userEvent.click(screen.getByRole('option', { name: 'Passo Certo' }));

    expect(mocks.useClubesGlobais).toHaveBeenLastCalledWith(
      expect.objectContaining({ tenantId: 'passo-certo' })
    );
  });

  it('vazio sem recorte fala da plataforma inteira', () => {
    renderRota();
    expect(screen.getByText('Nenhum clube na plataforma')).toBeInTheDocument();
  });

  it('erro mostra alerta com ação de tentar de novo', async () => {
    const refetch = vi.fn();
    mocks.useClubesGlobais.mockReturnValue(estado({ error: new Error('denied'), refetch }));
    renderRota();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalled();
  });
});
