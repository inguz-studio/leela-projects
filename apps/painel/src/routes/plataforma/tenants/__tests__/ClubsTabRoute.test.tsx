// =============================================================================
// Aba Clubs da ficha do tenant (ADMIN-VISAO onda 3 · S1612-T4).
//
// O GATE DA ONDA, travado aqui: nenhuma linha desta tela sugere receita de
// clube. Não existe mensalidade de clube no modelo (RN-104 — `pago_em_breve` é
// promessa de produto), então nenhum `R$` pode aparecer.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ClubsTabRoute } from '../ClubsTabRoute';
import { mkClube } from '../../../clubes/_test/fixtures';
import type { ListaGlobalState } from '../../_data/listasGlobais';
import type { Clube } from '@leela/core';

const mocks = vi.hoisted(() => ({ useClubesGlobais: vi.fn() }));

vi.mock('../../_data/listasGlobais', () => ({ useClubesGlobais: mocks.useClubesGlobais }));

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
    <MemoryRouter initialEntries={['/plataforma/tenants/castelo-producoes/clubs']}>
      <Routes>
        <Route path="/plataforma/tenants/:tenantId/clubs" element={<ClubsTabRoute />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useClubesGlobais.mockReturnValue(estado());
});

describe('ClubsTabRoute · gate da onda · clube não sugere receita', () => {
  it('clube gratuito não põe cifra nenhuma na tela', () => {
    mocks.useClubesGlobais.mockReturnValue(
      estado({ itens: [mkClube({ modeloEntrada: 'gratuito' })] })
    );
    renderRota();

    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });

  it('clube com entrada paga diz "(em breve)" e continua sem cifra', () => {
    mocks.useClubesGlobais.mockReturnValue(
      estado({ itens: [mkClube({ modeloEntrada: 'pago_em_breve' })] })
    );
    renderRota();

    expect(screen.getByText('Pago (em breve)')).toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });

  it('nenhum cabeçalho de coluna promete dinheiro', () => {
    mocks.useClubesGlobais.mockReturnValue(estado({ itens: [mkClube()] }));
    renderRota();

    for (const proibido of [/receita/i, /valor/i, /mensalidade/i, /faturamento/i]) {
      expect(screen.queryByRole('columnheader', { name: proibido })).not.toBeInTheDocument();
    }
  });
});

describe('ClubsTabRoute · colunas e recorte', () => {
  it('pede a lista do tenant do path', () => {
    renderRota();
    expect(mocks.useClubesGlobais).toHaveBeenCalledWith({ tenantId: 'castelo-producoes' });
  });

  it('mostra as oito colunas da spec', () => {
    mocks.useClubesGlobais.mockReturnValue(estado({ itens: [mkClube()] }));
    renderRota();

    for (const header of [
      'Clube',
      'Tipo',
      'Modalidade',
      'Onde',
      'Visibilidade',
      'Entrada',
      'Membros ativos',
      'Desafios ativos',
    ]) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
    }
  });

  it('não oferece filtro de status (Clube não tem status no modelo)', () => {
    mocks.useClubesGlobais.mockReturnValue(estado({ itens: [mkClube()] }));
    renderRota();

    expect(screen.queryByRole('group', { name: /status/i })).not.toBeInTheDocument();
  });
});

describe('ClubsTabRoute · contador e estados', () => {
  it('com próxima página, o contador NÃO apresenta o carregado como total', () => {
    mocks.useClubesGlobais.mockReturnValue(
      estado({ itens: [mkClube({ id: 'c1' }), mkClube({ id: 'c2' })], temMais: true })
    );
    renderRota();

    expect(screen.getByText('Mostrando 2 clubs · há mais para carregar')).toBeInTheDocument();
    expect(screen.queryByText(/de \d+ clubs/)).not.toBeInTheDocument();
  });

  it('sem próxima página, o número vira total do recorte', () => {
    mocks.useClubesGlobais.mockReturnValue(estado({ itens: [mkClube()] }));
    renderRota();

    expect(screen.getByText('1 clube · fim da lista')).toBeInTheDocument();
  });

  it('vazio fala do tenant, não da plataforma', () => {
    renderRota();
    expect(screen.getByText('Nenhum clube neste tenant')).toBeInTheDocument();
  });

  it('carregando mostra skeleton nomeado', () => {
    mocks.useClubesGlobais.mockReturnValue(estado({ loading: true }));
    renderRota();

    expect(screen.getByRole('status', { name: 'Carregando clubs' })).toBeInTheDocument();
  });
});
