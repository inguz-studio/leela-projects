// =============================================================================
// PARSE-1 · os dois campos numéricos da condição de desconto da parceria.
//
// Dois dos dezoito campos do painel que passam pelos parsers do core moravam
// nesta tela SEM MENSAGEM NENHUMA: `validarCondicaoDesconto` devolvia a lista
// de erros, a lista só desabilitava o botão, e quem digitasse "1,234.56" no
// valor ficava olhando um botão morto sem uma palavra na tela. O teto de usos
// ainda era `type="number"`, então o navegador higienizava o texto antes de o
// código ver — a recusa não tinha nem onde nascer.
//
// Estes testes provam o caminho de exibição campo a campo, que é o aceite da
// fila (PARSE-1 · "cada uma das dezoito mensagens ... provado, campo a campo").
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import type { ParceriaAssessoria } from '@leela/core';
import { ParceriaDetailPage } from '../ParceriaDetailPage';
import { REGUA_PONTO_E_VIRGULA } from '../../../../lib/textosDeCampo';
import { mkEvento, ts } from '../../../eventos/_test/fixtures';

const mocks = vi.hoisted(() => ({
  useParceriasAssessoria: vi.fn(),
  useEventosDoOrganizador: vi.fn(),
  useTenantSession: vi.fn(),
}));

vi.mock('../_data/assessorias', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useParceriasAssessoria: mocks.useParceriasAssessoria,
  useEventosDoOrganizador: mocks.useEventosDoOrganizador,
}));
vi.mock('../../../../lib/session/tenantSession', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useTenantSession: mocks.useTenantSession,
}));

const PARCERIA: ParceriaAssessoria = {
  id: '12345678000199',
  tenantId: 'castelo',
  nome: 'Assessoria Litoral',
  documento: { tipo: 'cnpj', valor: '12345678000199' },
  clubeRef: 'litoral',
  responsavelEmail: 'contato@litoral.com.br',
  status: 'ativa',
  criadoEm: ts(new Date('2026-01-01T00:00:00Z')),
  criadoPor: 'uid-marina',
  atualizadoEm: ts(new Date('2026-01-01T00:00:00Z')),
};

function renderPage(): void {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/clubes/assessorias/12345678000199']}>
        <Routes>
          <Route path="/clubes/assessorias/:parceriaId" element={<ParceriaDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

const campoValor = (): HTMLInputElement => screen.getByLabelText(/Percentual \(0–100\)/) as HTMLInputElement;
const campoTeto = (): HTMLInputElement =>
  screen.getByLabelText('Teto de usos (vazio = ilimitado)') as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useTenantSession.mockReturnValue({
    status: 'authenticated',
    uid: 'uid-marina',
    tenantId: 'castelo',
  });
  mocks.useParceriasAssessoria.mockReturnValue({
    data: [PARCERIA],
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
  mocks.useEventosDoOrganizador.mockReturnValue({
    data: [mkEvento()],
    loading: false,
    error: null,
    refetch: vi.fn(),
  });
});

describe('PARSE-1 · a recusa do parser tem onde aparecer na condição de desconto', () => {
  it('valor e teto são campo de TEXTO com teclado numérico', () => {
    renderPage();
    expect(campoValor()).toHaveAttribute('type', 'text');
    expect(campoValor()).toHaveAttribute('inputmode', 'decimal');
    expect(campoTeto()).toHaveAttribute('type', 'text');
    expect(campoTeto()).toHaveAttribute('inputmode', 'numeric');
  });

  it('os dois nascem quietos: campo em branco não acusa quem ainda não digitou', () => {
    renderPage();
    expect(campoValor()).not.toHaveAttribute('aria-invalid');
    expect(campoTeto()).not.toHaveAttribute('aria-invalid');
  });

  it('valor no estilo en-US ensina a pontuação do dinheiro', () => {
    renderPage();
    fireEvent.change(campoValor(), { target: { value: '1,234.56' } });
    expect(
      screen.getByText(
        'Pontuação fora do padrão. Ponto separa milhar e vírgula separa centavos (ex.: 1.234,56).',
      ),
    ).toBeInTheDocument();
    expect(campoValor()).toHaveAttribute('aria-invalid', 'true');
  });

  it('teto com casa decimal diz que contagem não tem casa decimal', () => {
    renderPage();
    fireEvent.change(campoTeto(), { target: { value: '2,5' } });
    expect(
      screen.getByText(
        'A quantidade é um número inteiro, sem casas decimais. Para mil, escreva 1.000 ou 1000.',
      ),
    ).toBeInTheDocument();
    expect(campoTeto()).toHaveAttribute('aria-invalid', 'true');
  });

  it('a régua do ponto e da vírgula fica embaixo do valor da condição', () => {
    renderPage();
    const campo = campoValor();
    expect(document.getElementById(`${campo.id}-hint`)).toHaveTextContent(REGUA_PONTO_E_VIRGULA);
    expect(campo.getAttribute('aria-describedby')).toContain(`${campo.id}-hint`);
  });

  it('BASELINE colar de planilha: "1.000" no teto atravessa o campo intacto e não acusa', () => {
    renderPage();
    fireEvent.change(campoTeto(), { target: { value: '1.000' } });
    expect(campoTeto()).toHaveValue('1.000');
    expect(campoTeto()).not.toHaveAttribute('aria-invalid');
  });
});
