// =============================================================================
// PARSE-1 · o intervalo da automação (um dos dezoito campos).
//
// Achado RS1-22: quando o texto do intervalo é ilegível, `paraAutomacaoInput`
// simplesmente NÃO copia o campo, o validador do core só olha o intervalo
// quando ele existe, e a automação salva com o padrão de vinte e quatro horas
// — calada. O campo era `type="number"` e não tinha mensagem nenhuma.
//
// A decisão do maestro para este item foi AVISAR, não recusar: o campo passa a
// dizer o que acontece quando fica vazio, e a recusa do parser passa a ter onde
// aparecer quando o texto é ilegível.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import type { Campanha } from '@leela/core';
import type * as ReactRouterDom from 'react-router-dom';
import { AutomacoesPage } from '../AutomacoesPage';
import { mkEvento, ts } from '../../_test/fixtures';

const mocks = vi.hoisted(() => ({
  getLeelaDb: vi.fn(() => ({}) as unknown),
  listarAutomacoes: vi.fn(),
  listarCampanhas: vi.fn(),
}));

vi.mock('@leela/api-client', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getLeelaDb: mocks.getLeelaDb,
  listarAutomacoes: mocks.listarAutomacoes,
  listarCampanhas: mocks.listarCampanhas,
}));

const CAMPANHA: Campanha = {
  id: 'camp-1',
  tenantId: 'castelo',
  titulo: 'Lembrete da véspera',
  conteudo: 'Sua corrida é amanhã. Confira o horário da largada.',
  canal: ['push'],
  origem: 'manual',
  status: 'rascunho',
  segmento: { tipo: 'todos_inscritos' },
  criadoEm: ts(new Date('2026-01-01T00:00:00Z')),
  atualizadoEm: ts(new Date('2026-01-01T00:00:00Z')),
  alcance: 0,
};

const EVENTO = mkEvento();

function renderPage(): void {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/eventos/meia-floripa-2026/comunicacao/automacoes']}>
        <Routes>
          <Route
            path="/eventos/:eventoId/comunicacao/automacoes"
            element={<AutomacoesPage />}
          />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

vi.mock('react-router-dom', async (importOriginal) => {
  const real = await importOriginal<typeof ReactRouterDom>();
  return { ...real, useOutletContext: () => ({ evento: EVENTO }) };
});

const campoOffset = (): HTMLInputElement =>
  screen.getByLabelText('Horas de offset (1–720)') as HTMLInputElement;

/** Troca o gatilho para um que USA offset — o campo só existe nesse caso. */
async function abrirCampoDoIntervalo(): Promise<void> {
  renderPage();
  await waitFor(() => expect(screen.getByLabelText(/Gatilho/i)).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText(/Gatilho/i), { target: { value: 'vespera_evento' } });
  await waitFor(() => expect(campoOffset()).toBeInTheDocument());
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getLeelaDb.mockReturnValue({});
  mocks.listarAutomacoes.mockResolvedValue([]);
  mocks.listarCampanhas.mockResolvedValue([CAMPANHA]);
});

describe('PARSE-1 · a recusa do parser tem onde aparecer no intervalo da automação', () => {
  it('é campo de TEXTO com teclado numérico', async () => {
    await abrirCampoDoIntervalo();
    expect(campoOffset()).toHaveAttribute('type', 'text');
    expect(campoOffset()).toHaveAttribute('inputmode', 'numeric');
  });

  it('intervalo ilegível para de sumir calado: o campo diz o que fazer', async () => {
    await abrirCampoDoIntervalo();
    fireEvent.change(campoOffset(), { target: { value: '2,5' } });
    expect(
      screen.getByText(
        'A quantidade é um número inteiro, sem casas decimais. Para mil, escreva 1.000 ou 1000.',
      ),
    ).toBeInTheDocument();
    expect(campoOffset()).toHaveAttribute('aria-invalid', 'true');
  });

  it('BASELINE colar de planilha: "1.000" atravessa o campo intacto', async () => {
    await abrirCampoDoIntervalo();
    fireEvent.change(campoOffset(), { target: { value: '1.000' } });
    expect(campoOffset()).toHaveValue('1.000');
    expect(campoOffset()).not.toHaveAttribute('aria-invalid');
  });
});
