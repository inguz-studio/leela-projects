// =============================================================================
// Aba Eventos da ficha do tenant (ADMIN-VISAO onda 3 · S1612-T3).
//
// Os casos: a leitura pede o recorte por tenant AO HOOK (nunca peneira na
// tela), o contador é honesto, a coluna de inscrições respeita a régua R19 e a
// coluna de dinheiro diz que a receita é CONFIRMADA.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EventosTabRoute } from '../EventosTabRoute';
import { mkEvento } from '../../../eventos/_test/fixtures';
import type { ListaGlobalState } from '../../_data/listasGlobais';
import type { Evento } from '@leela/core';

const mocks = vi.hoisted(() => ({ useEventosGlobais: vi.fn() }));

vi.mock('../../_data/listasGlobais', () => ({ useEventosGlobais: mocks.useEventosGlobais }));

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
    <MemoryRouter initialEntries={['/plataforma/tenants/castelo-producoes/eventos']}>
      <Routes>
        <Route path="/plataforma/tenants/:tenantId/eventos" element={<EventosTabRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useEventosGlobais.mockReturnValue(estado());
});

describe('EventosTabRoute · o recorte é do servidor', () => {
  it('pede a lista do tenant do path, sem filtrar na tela', () => {
    renderRota();

    expect(mocks.useEventosGlobais).toHaveBeenCalledWith({ tenantId: 'castelo-producoes' });
  });

  it('não oferece filtro de status (a leitura por tenant não aceita)', () => {
    mocks.useEventosGlobais.mockReturnValue(estado({ itens: [mkEvento()] }));
    renderRota();

    expect(screen.queryByRole('button', { name: 'Publicado' })).not.toBeInTheDocument();
  });
});

describe('EventosTabRoute · colunas', () => {
  it('a coluna de inscrições diz "Inscrições" (o agregado conta todas — R19)', () => {
    mocks.useEventosGlobais.mockReturnValue(estado({ itens: [mkEvento({ qtdInscritos: 453 })] }));
    renderRota();

    expect(screen.getByRole('columnheader', { name: 'Inscrições' })).toBeInTheDocument();
    expect(screen.getByText('453')).toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: /pagantes/i })
    ).not.toBeInTheDocument();
  });

  it('a coluna de dinheiro diz CONFIRMADA e mostra o campo gravado', () => {
    mocks.useEventosGlobais.mockReturnValue(
      estado({ itens: [mkEvento({ receitaConfirmada: 85617.5 })] })
    );
    renderRota();

    expect(
      screen.getByRole('columnheader', { name: 'Receita confirmada' })
    ).toBeInTheDocument();
    expect(screen.getByText('R$ 85.617,50')).toBeInTheDocument();
  });

  it('a régua de leitura da receita fica na tela, ao lado do número', () => {
    mocks.useEventosGlobais.mockReturnValue(estado({ itens: [mkEvento()] }));
    renderRota();

    expect(screen.getByText(/pedido pendente não entra/i)).toBeInTheDocument();
  });

  it('evento sem modalidade mostra travessão, não lista vazia', () => {
    mocks.useEventosGlobais.mockReturnValue(estado({ itens: [mkEvento({ modalidades: [] })] }));
    renderRota();

    expect(screen.getByRole('columnheader', { name: 'Modalidades' })).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });
});

describe('EventosTabRoute · contador e estados', () => {
  it('com próxima página, o contador NÃO apresenta o carregado como total', () => {
    mocks.useEventosGlobais.mockReturnValue(
      estado({ itens: [mkEvento({ id: 'e1' }), mkEvento({ id: 'e2' })], temMais: true })
    );
    renderRota();

    expect(screen.getByText('Mostrando 2 eventos · há mais para carregar')).toBeInTheDocument();
    expect(screen.queryByText(/de \d+ eventos/)).not.toBeInTheDocument();
  });

  it('sem próxima página, o número vira total do recorte', () => {
    mocks.useEventosGlobais.mockReturnValue(estado({ itens: [mkEvento()] }));
    renderRota();

    expect(screen.getByText('1 evento · fim da lista')).toBeInTheDocument();
  });

  it('vazio fala do tenant, não da plataforma', () => {
    renderRota();
    expect(screen.getByText('Nenhum evento neste tenant')).toBeInTheDocument();
  });

  it('carregando mostra skeleton nomeado', () => {
    mocks.useEventosGlobais.mockReturnValue(estado({ loading: true }));
    renderRota();

    expect(screen.getByRole('status', { name: 'Carregando eventos' })).toBeInTheDocument();
  });
});
