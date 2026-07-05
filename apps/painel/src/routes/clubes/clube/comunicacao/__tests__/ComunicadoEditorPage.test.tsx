// =============================================================================
// ComunicadoEditorPage — fluxo EDIT vs CREATE (fix S2 do review Onda1).
// Antes do fix, o modo edit chamava SEMPRE criarComunicadoPadrao: salvar a
// edição de um rascunho criava um segundo comunicado (lista duplicada) e
// editar um agendado perdia o agendadoPara original. Estes testes provam:
//   - edit (?id) roteia para atualizarComunicadoPadrao com o MESMO id;
//   - criar não é chamado no modo edit (não duplica);
//   - agendadoPara original sobrevive ao round-trip comunicadoToForm→submit;
//   - create (sem ?id) segue criando com tenantId.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import type { Comunicado } from '@leela/core';
import { ComunicadoEditorPage } from '../ComunicadoEditorPage';
import { mkClube, mkComunicado, ts } from '../../../_test/fixtures';

const mocks = vi.hoisted(() => ({
  useComunicado: vi.fn(),
  criarComunicadoPadrao: vi.fn(),
  atualizarComunicadoPadrao: vi.fn(),
}));

vi.mock('../../../_data/comunicados', () => mocks);

const CLUBE = mkClube({ id: 'cps', slug: 'cps', tenantId: 'castelo' });

function renderPage(url: string): void {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route element={<Outlet context={{ clube: CLUBE }} />}>
            <Route path="/clubes/:slug/comunicacao/nova" element={<ComunicadoEditorPage />} />
            <Route path="/clubes/:slug/comunicacao" element={<div>lista</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

function mockComunicado(c: Comunicado | null): void {
  mocks.useComunicado.mockReturnValue({ data: c, loading: false, error: null });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.criarComunicadoPadrao.mockResolvedValue({ comunicadoId: 'novo' });
  mocks.atualizarComunicadoPadrao.mockResolvedValue(undefined);
});

describe('ComunicadoEditorPage — fluxo edit (fix S2)', () => {
  it('editar rascunho ATUALIZA o doc existente e NÃO cria duplicata', async () => {
    mockComunicado(
      mkComunicado({
        id: 'com-edit',
        status: 'rascunho',
        titulo: 'Treino de sábado',
        conteudo: 'Encontro às 7h na Lagoa para treino conjunto.',
        alcance: 0,
      }),
    );
    renderPage('/clubes/cps/comunicacao/nova?id=com-edit');

    await userEvent.click(screen.getByRole('button', { name: 'Salvar comunicado' }));

    await waitFor(() => expect(mocks.atualizarComunicadoPadrao).toHaveBeenCalledTimes(1));
    expect(mocks.atualizarComunicadoPadrao).toHaveBeenCalledWith(
      'cps',
      'com-edit',
      expect.objectContaining({
        titulo: 'Treino de sábado',
        status: 'rascunho',
      }),
    );
    expect(mocks.criarComunicadoPadrao).not.toHaveBeenCalled();
  });

  it('editar AGENDADO preserva o agendadoPara original no round-trip', async () => {
    // Date construída por componentes locais — determinística em qualquer TZ.
    const original = new Date(2026, 7, 15, 13, 30);
    mockComunicado(
      mkComunicado({
        id: 'com-agendado',
        status: 'agendado',
        agendadoPara: ts(original),
        titulo: 'Aviso da prova',
        conteudo: 'Retirada de kits abre sexta às 10h.',
        alcance: 0,
      }),
    );
    renderPage('/clubes/cps/comunicacao/nova?id=com-agendado');

    // O form nasce pré-preenchido com a data/hora originais (antes: '').
    expect(screen.getByLabelText('Data')).toHaveValue('2026-08-15');
    expect(screen.getByLabelText('Hora')).toHaveValue('13:30');

    await userEvent.click(screen.getByRole('button', { name: 'Agendar comunicado' }));

    await waitFor(() => expect(mocks.atualizarComunicadoPadrao).toHaveBeenCalledTimes(1));
    expect(mocks.atualizarComunicadoPadrao).toHaveBeenCalledWith(
      'cps',
      'com-agendado',
      expect.objectContaining({
        status: 'agendado',
        agendadoPara: original,
      }),
    );
    expect(mocks.criarComunicadoPadrao).not.toHaveBeenCalled();
  });

  it('create (sem ?id) segue criando com tenantId — regressão do caminho novo', async () => {
    mockComunicado(null);
    renderPage('/clubes/cps/comunicacao/nova');

    await userEvent.type(screen.getByLabelText('Título'), 'Nova campanha de push');
    await userEvent.type(screen.getByLabelText('Conteúdo'), 'Conteúdo com mais de dez caracteres.');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar comunicado' }));

    await waitFor(() => expect(mocks.criarComunicadoPadrao).toHaveBeenCalledTimes(1));
    expect(mocks.criarComunicadoPadrao).toHaveBeenCalledWith(
      'cps',
      expect.objectContaining({ tenantId: 'castelo', status: 'rascunho' }),
    );
    expect(mocks.atualizarComunicadoPadrao).not.toHaveBeenCalled();
  });
});
