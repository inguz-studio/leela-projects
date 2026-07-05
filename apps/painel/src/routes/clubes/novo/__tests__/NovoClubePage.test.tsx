// =============================================================================
// NovoClubePage — fluxo de criação de clube (fix #14 do review Onda1: o CTA
// primário do hub navegava para /clubes/novo, rota inexistente, e caía no
// :slug com "Clube não encontrado"). Prova: rota real registrada, form deriva
// slug do nome, cria via porta com codigoConvite RN-101 válido + ∑ ausentes
// do input (nascem zerados no api-client) e navega para o clube criado.
// =============================================================================
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import { validarCodigoConvite } from '@leela/core';
import { NovoClubePage } from '../NovoClubePage';
import { ClubesRoutes } from '../../ClubesRoutes';

const mocks = vi.hoisted(() => ({
  criarClubePadrao: vi.fn(),
  useClube: vi.fn(),
  useClubesSession: vi.fn(),
}));

// importOriginal: o teste de registro de rota monta o ClubesRoutes inteiro —
// os demais consumidores do módulo (useClubes, useMembros…) seguem reais.
vi.mock('../../_data/clubes', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  criarClubePadrao: mocks.criarClubePadrao,
  useClube: mocks.useClube,
}));
vi.mock('../../_data/session', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useClubesSession: mocks.useClubesSession,
}));

function renderPage(): void {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/clubes/novo']}>
        <Routes>
          <Route path="/clubes/novo" element={<NovoClubePage />} />
          <Route path="/clubes/:slug" element={<div>overview do clube</div>} />
          <Route path="/clubes" element={<div>hub</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useClubesSession.mockReturnValue({
    status: 'authenticated',
    uid: 'uid-marina',
    tenantId: 'castelo',
  });
  mocks.criarClubePadrao.mockImplementation((input: { slug: string }) =>
    Promise.resolve({ slug: input.slug }),
  );
  // Estado "não encontrado" do ClubeLayout — é o que o :slug renderizava
  // quando /clubes/novo caía no coringa (o bug do #14).
  mocks.useClube.mockReturnValue({
    data: null,
    loading: false,
    error: new Error('Clube "novo" não encontrado.'),
  });
});

describe('NovoClubePage (fix #14)', () => {
  it('botão desabilitado sem nome; slug derivado aparece no hint', async () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Criar clube' })).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Nome do clube'), 'Corrida Perfeita Sul!');
    expect(screen.getByText(/be-hero\.com\.br\/c\/corrida-perfeita-sul/)).toBeInTheDocument();
    expect(screen.getByText(/não pode ser alterado depois/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar clube' })).toBeEnabled();
  });

  it('cria o clube com sessão + código RN-101 válido e navega para o novo slug', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Nome do clube'), 'Trilha Norte');
    await userEvent.type(screen.getByLabelText('Descrição'), 'Grupo de trail running.');
    await userEvent.click(screen.getByRole('button', { name: 'Criar clube' }));

    await waitFor(() => expect(mocks.criarClubePadrao).toHaveBeenCalledTimes(1));
    const input = mocks.criarClubePadrao.mock.calls[0]?.[0] as {
      tenantId: string; ownerId: string; slug: string; nome: string;
      codigoConvite: string; modeloEntrada: string;
    };
    expect(input).toMatchObject({
      tenantId: 'castelo',
      ownerId: 'uid-marina',
      slug: 'trilha-norte',
      nome: 'Trilha Norte',
      modeloEntrada: 'gratuito',
    });
    // RN-101: código gerado no submit é válido (5 chars, sem 0/O/1/I/L)
    expect(validarCodigoConvite(input.codigoConvite)).toBe(true);
    // ∑ nunca saem do form (nascem zerados no api-client)
    expect(input).not.toHaveProperty('qtdMembrosAtivos');

    await screen.findByText('overview do clube');
  });

  it('erro do write (ex.: slug em uso) mostra toast honesto e NÃO navega', async () => {
    mocks.criarClubePadrao.mockRejectedValue(new Error('permission-denied'));
    renderPage();
    await userEvent.type(screen.getByLabelText('Nome do clube'), 'Trilha Norte');
    await userEvent.click(screen.getByRole('button', { name: 'Criar clube' }));

    await screen.findByText('Não foi possível criar o clube');
    expect(screen.getByText(/"trilha-norte" pode já estar em uso/)).toBeInTheDocument();
    expect(screen.queryByText('overview do clube')).not.toBeInTheDocument();
  });

  it('modelo Pago desabilitado com "Em breve" (RN-104)', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Pago' })).toBeDisabled();
    expect(screen.getByText('Em breve')).toBeInTheDocument();
  });

  // Prova de REGISTRO da rota (a raiz do #14): monta o ClubesRoutes real.
  // No código antigo /clubes/novo caía no coringa :slug e o ClubeLayout
  // renderizava "Clube não encontrado" — este teste falha lá.
  it('rota /clubes/novo registrada antes do coringa :slug — não cai em "Clube não encontrado"', async () => {
    render(
      <MemoryRouter initialEntries={['/clubes/novo']}>
        <Routes>
          <Route path="/clubes/*" element={<ClubesRoutes />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Criar clube' })).toBeInTheDocument();
    expect(screen.queryByText('Clube não encontrado')).not.toBeInTheDocument();
  });
});
