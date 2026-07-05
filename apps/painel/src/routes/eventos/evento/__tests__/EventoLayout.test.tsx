// Fix review Onda1 #16 (metade E03): staff em `/eventos/:slug` de OUTRO
// organizador do tenant recebia "Evento não encontrado" (404 seco). O detalhe
// agora distingue escopo de inexistência via fallback getEvento (decisão
// E02-L1-SUMMARY §5: painel/agregado por uid individual).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Evento } from '@leela/core';
import { mkEvento } from '../../_test/fixtures';

const STAFF_UID = 'uid-staff-castelo';
const TENANT_ID = 'castelo';

const mocks = vi.hoisted(() => ({
  listarEventosDoOrganizador: vi.fn(),
  getEvento: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  getLeelaDb: () => ({}),
  listarEventosDoOrganizador: mocks.listarEventosDoOrganizador,
  getEvento: mocks.getEvento,
  listarInscritos: vi.fn().mockResolvedValue({ itens: [] }),
  onSessionChange: (cb: (user: { uid: string } | null) => void) => {
    cb({ uid: STAFF_UID });
    return () => undefined;
  },
  getClaims: () => Promise.resolve({ role: 'tenant_staff', tenantId: TENANT_ID }),
}));

function renderLayoutEm(slug: string) {
  return import('../EventoLayout').then(({ EventoLayout }) =>
    render(
      <MemoryRouter initialEntries={[`/eventos/${slug}`]}>
        <Routes>
          <Route path="/eventos/:slug/*" element={<EventoLayout />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}

function eventoDeOutroOrganizador(): Evento {
  return mkEvento({ organizadorId: 'uid-marina', tenantId: TENANT_ID });
}

beforeEach(() => {
  vi.clearAllMocks();
  // Staff não tem eventos próprios — lista vazia (agregado por uid, §5)
  mocks.listarEventosDoOrganizador.mockResolvedValue([]);
});

describe('EventoLayout — escopo vs inexistência (review #16)', () => {
  it('evento de OUTRO organizador do tenant → mensagem de escopo, não 404', async () => {
    mocks.getEvento.mockResolvedValue(eventoDeOutroOrganizador());
    await renderLayoutEm('meia-floripa-2026');

    expect(
      await screen.findByText('Este evento é de outro organizador'),
    ).toBeInTheDocument();
    expect(screen.getByText(/apenas os eventos criados por você/i)).toBeInTheDocument();
    expect(screen.queryByText('Evento não encontrado')).not.toBeInTheDocument();
  });

  it('evento inexistente → segue "Evento não encontrado"', async () => {
    mocks.getEvento.mockResolvedValue(null);
    await renderLayoutEm('nao-existe');

    expect(await screen.findByText('Evento não encontrado')).toBeInTheDocument();
  });

  it('cross-tenant (Rules negam a leitura) → também "não encontrado", sem vazar existência', async () => {
    mocks.getEvento.mockRejectedValue({ code: 'permission-denied' });
    await renderLayoutEm('evento-do-tenant-b');

    expect(await screen.findByText('Evento não encontrado')).toBeInTheDocument();
  });

  it('evento MEU fora da 1ª página da lista abre normalmente (mitiga #33)', async () => {
    mocks.getEvento.mockResolvedValue(
      mkEvento({ organizadorId: STAFF_UID, tenantId: TENANT_ID }),
    );
    await renderLayoutEm('meia-floripa-2026');

    expect(
      await screen.findByRole('heading', { level: 1, name: /Meia Maratona Floripa 2026/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Evento não encontrado')).not.toBeInTheDocument();
  });
});
