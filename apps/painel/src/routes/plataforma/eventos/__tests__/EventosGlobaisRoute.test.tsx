// =============================================================================
// `/plataforma/eventos` (ADMIN-VISAO onda 4 · S1614-T2). Os casos são os do
// gate da onda: contador que nunca apresenta total truncado como total do
// sistema, coluna Tenant, clique que leva à ficha do tenant dono, e o recorte
// (tenant × status) sem filtro peneirado no cliente.
//
// Hooks de dado mockados — a leitura já tem teste próprio em `_data`.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type * as ReactRouter from 'react-router-dom';
import { EventosGlobaisRoute } from '../EventosGlobaisRoute';
import { mkEvento } from '../../../eventos/_test/fixtures';
import { mkTenant } from '../../_test/fixtures';
import type { ListaGlobalState } from '../../_data/listasGlobais';
import type { Evento } from '@leela/core';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  useEventosGlobais: vi.fn(),
  useTenants: vi.fn(),
}));

vi.mock('../../_data/listasGlobais', () => ({
  useEventosGlobais: mocks.useEventosGlobais,
}));

vi.mock('../../_data/tenants', () => ({
  useTenants: mocks.useTenants,
}));

vi.mock('react-router-dom', async () => {
  const real = await vi.importActual<typeof ReactRouter>('react-router-dom');
  return { ...real, useNavigate: () => mocks.navigate };
});

function estado(over: Partial<ListaGlobalState<Evento>> = {}): ListaGlobalState<Evento> {
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
    <MemoryRouter initialEntries={['/plataforma/eventos']}>
      <EventosGlobaisRoute />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useTenants.mockReturnValue({
    data: [
      mkTenant(),
      mkTenant({ id: 'passo-certo', nome: 'Passo Certo', slug: 'passo-certo' }),
    ],
    loading: false,
    error: null,
  });
  mocks.useEventosGlobais.mockReturnValue(estado());
});

describe('EventosGlobaisRoute · lista e contador', () => {
  it('mostra a coluna Tenant com o NOME do tenant dono do evento', () => {
    mocks.useEventosGlobais.mockReturnValue(
      estado({ itens: [mkEvento({ tenantId: 'castelo-producoes' })] })
    );
    renderRota();

    expect(screen.getByRole('columnheader', { name: 'Tenant' })).toBeInTheDocument();
    expect(screen.getByText('Castelo Produções')).toBeInTheDocument();
  });

  it('tenant fora da lista aparece pelo ID, não como "desconhecido"', () => {
    mocks.useEventosGlobais.mockReturnValue(
      estado({ itens: [mkEvento({ tenantId: 'tenant-sumido' })] })
    );
    renderRota();

    expect(screen.getByText('tenant-sumido')).toBeInTheDocument();
  });

  it('com próxima página, o contador NÃO apresenta o carregado como total', () => {
    mocks.useEventosGlobais.mockReturnValue(
      estado({ itens: [mkEvento({ id: 'e1' }), mkEvento({ id: 'e2' })], temMais: true })
    );
    renderRota();

    expect(
      screen.getByText('Mostrando 2 eventos · há mais para carregar')
    ).toBeInTheDocument();
    expect(screen.queryByText(/de \d+ eventos/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Carregar mais' })).toBeInTheDocument();
  });

  it('sem próxima página, o número vira total do recorte e o botão some', () => {
    mocks.useEventosGlobais.mockReturnValue(estado({ itens: [mkEvento()], temMais: false }));
    renderRota();

    expect(screen.getByText('1 evento · fim da lista')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carregar mais' })).not.toBeInTheDocument();
  });

  it('clicar na linha vai para a ficha do tenant dono', async () => {
    mocks.useEventosGlobais.mockReturnValue(
      estado({ itens: [mkEvento({ tenantId: 'passo-certo' })] })
    );
    renderRota();

    await userEvent.click(screen.getByText('Meia Maratona Floripa 2026'));
    expect(mocks.navigate).toHaveBeenCalledWith('/plataforma/tenants/passo-certo');
  });

  it('a coluna de inscrições diz "Inscrições" (o agregado conta todas)', () => {
    mocks.useEventosGlobais.mockReturnValue(estado({ itens: [mkEvento({ qtdInscritos: 453 })] }));
    renderRota();

    expect(screen.getByRole('columnheader', { name: 'Inscrições' })).toBeInTheDocument();
    expect(screen.getByText('453')).toBeInTheDocument();
  });

  it('não exibe coluna de dinheiro (cifra do master é a ficha do tenant)', () => {
    mocks.useEventosGlobais.mockReturnValue(
      estado({ itens: [mkEvento({ receitaConfirmada: 85617 })] })
    );
    renderRota();

    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });
});

describe('EventosGlobaisRoute · estados', () => {
  it('carregando mostra skeleton, não spinner solto', () => {
    mocks.useEventosGlobais.mockReturnValue(estado({ loading: true }));
    renderRota();

    expect(screen.getByRole('status', { name: 'Carregando eventos' })).toBeInTheDocument();
  });

  it('vazio sem recorte fala da plataforma inteira', () => {
    renderRota();
    expect(screen.getByText('Nenhum evento na plataforma')).toBeInTheDocument();
  });

  it('erro mostra alerta com ação de tentar de novo', async () => {
    const refetch = vi.fn();
    mocks.useEventosGlobais.mockReturnValue(estado({ error: new Error('denied'), refetch }));
    renderRota();

    expect(screen.getByRole('alert')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('EventosGlobaisRoute · recorte', () => {
  // A faceta é LISTA desde 17/08 (leva 20, ADR-020 superado): abre o gatilho
  // "Status" e escolhe o valor. O que o teste trava continua sendo o mesmo — o
  // recorte vai AO HOOK, não peneira na tela.
  it('a lista de status pede o filtro AO HOOK (servidor), não peneira na tela', async () => {
    renderRota();

    await userEvent.click(screen.getByRole('button', { name: /^Status:/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Publicado' }));

    expect(mocks.useEventosGlobais).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'publicado' })
    );
  });

  it('escolher tenant troca o recorte e desliga o filtro de status, com a razão na tela', async () => {
    renderRota();

    await userEvent.click(screen.getByLabelText('Filtrar por tenant'));
    await userEvent.click(screen.getByRole('option', { name: 'Passo Certo' }));

    expect(mocks.useEventosGlobais).toHaveBeenLastCalledWith(
      expect.objectContaining({ tenantId: 'passo-certo' })
    );
    // `disabled` na FilterChips (a condição de reabertura que o ADR-020 pediu
    // e que a lane de 17/08 pagou): o gatilho inteiro desliga, não cada valor.
    expect(screen.getByRole('button', { name: /^Status:/ })).toBeDisabled();
    expect(
      screen.getByText(/O status filtra a lista do sistema inteiro/)
    ).toBeInTheDocument();
  });
});
