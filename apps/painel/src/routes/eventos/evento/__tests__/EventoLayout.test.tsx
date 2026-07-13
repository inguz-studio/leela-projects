// Fix review Onda1 #16 (metade E03): staff em `/eventos/:slug` de OUTRO
// organizador do tenant recebia "Evento não encontrado" (404 seco). O detalhe
// agora distingue escopo de inexistência via fallback getEvento (decisão
// E02-L1-SUMMARY §5: painel/agregado por uid individual).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Evento } from '@leela/core';
import { mkEvento } from '../../_test/fixtures';
// Import ESTÁTICO (não dinâmico) — ver nota de root-cause em renderLayoutEm.
import { EventoLayout } from '../EventoLayout';

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

// ROOT-CAUSE do flaky (CONS-2): a versão anterior fazia `await import('../EventoLayout')`
// DENTRO de cada caso. Esse import dinâmico força a transformação/instanciação do
// grafo de módulos de EventoLayout NO caminho crítico do teste; sob a suíte cheia
// em 8GB (workers em paralelo + pressão de GC) essa latência empurra a cadeia de
// 2 queries do react-query além do timeout padrão de 1000ms do `findBy` → falha
// intermitente. Isolado (~1.3s) sobra folga; na suíte cheia, não. Correção do
// PADRÃO: import ESTÁTICO no topo (o `vi.mock` é içado acima dos imports, então o
// api-client mockado continua valendo) — a carga do módulo sai do caminho crítico
// e vai pro load do arquivo, pago uma vez. Sem timeout inflado, sem retry.
function renderLayoutEm(slug: string) {
  // Client de teste: retry off (rejeição determinística, sem 3 tentativas —
  // permission-denied resolve na hora) e gcTime 0 (sem vazamento entre casos).
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/eventos/${slug}`]}>
        <Routes>
          <Route path="/eventos/:slug/*" element={<EventoLayout />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
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
    renderLayoutEm('meia-floripa-2026');

    expect(
      await screen.findByText('Este evento é de outro organizador'),
    ).toBeInTheDocument();
    expect(screen.getByText(/apenas os eventos criados por você/i)).toBeInTheDocument();
    expect(screen.queryByText('Evento não encontrado')).not.toBeInTheDocument();
  });

  it('evento inexistente → segue "Evento não encontrado"', async () => {
    mocks.getEvento.mockResolvedValue(null);
    renderLayoutEm('nao-existe');

    expect(await screen.findByText('Evento não encontrado')).toBeInTheDocument();
  });

  it('cross-tenant (Rules negam a leitura) → também "não encontrado", sem vazar existência', async () => {
    mocks.getEvento.mockRejectedValue({ code: 'permission-denied' });
    renderLayoutEm('evento-do-tenant-b');

    expect(await screen.findByText('Evento não encontrado')).toBeInTheDocument();
  });

  it('evento MEU fora da 1ª página da lista abre normalmente (mitiga #33)', async () => {
    mocks.getEvento.mockResolvedValue(
      mkEvento({ organizadorId: STAFF_UID, tenantId: TENANT_ID }),
    );
    renderLayoutEm('meia-floripa-2026');

    expect(
      await screen.findByRole('heading', { level: 1, name: /Meia Maratona Floripa 2026/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Evento não encontrado')).not.toBeInTheDocument();
  });
});
