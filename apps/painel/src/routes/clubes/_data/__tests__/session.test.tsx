// =============================================================================
// useTenantSession + useClubes — prova a CADEIA de dados da rota de clubes sob a
// sessão de PREVIEW (?preview=corrida). O bug (LEELA-CLUBES-FIX): o preview-seed
// seta o claim `tenantId` e em seguida REVOGA os refresh tokens
// (revokeRefreshTokens). O primeiro token que o cliente vê pode (a) ainda não
// carregar o `tenantId` (token defasado) ou (b) falhar ao refrescar. Como o hook
// lia `getClaims()` SEM forceRefresh e SEM catch, a sessão ficava presa em
// 'loading' PARA SEMPRE → skeleton eterno, sem erro, com a query em
// `enabled:false` (nunca resolve nem rejeita). A Visão Geral sobrevivia porque
// `getOverview` é callable server-side (deriva o tenant de context.auth).
//
// Testa COMPORTAMENTO com o api-client mockado (sem Firestore/emulator).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderHook, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useTenantSession } from '../../../../lib/session/tenantSession';
import { useClubes } from '../clubes';
import { HubRoute } from '../../hub/HubRoute';
import { mkClube } from '../../_test/fixtures';

const mocks = vi.hoisted(() => ({
  onSessionChange: vi.fn(),
  getClaims: vi.fn(),
  listClubesByTenant: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  onSessionChange: mocks.onSessionChange,
  getClaims: mocks.getClaims,
  listClubesByTenant: mocks.listClubesByTenant,
  getLeelaDb: () => ({}),
  getLeelaFunctions: () => ({}),
}));

/** Faz o observador de sessão emitir `user` (como o onAuthStateChanged faria). */
function fireSession(user: { uid: string; email: string } | null): void {
  mocks.onSessionChange.mockImplementation((cb: (u: unknown) => void) => {
    cb(user);
    return () => {};
  });
}

const FELIPE = { uid: 'felipe', email: 'felipe@demo-leela.dev' };

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** QueryClient de teste: sem retry (falha honesta imediata) e sem cache entre casos. */
function testClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listClubesByTenant.mockResolvedValue([]);
});

describe('useTenantSession (resiliência do claim de preview)', () => {
  it('token em cache já traz o tenantId → resolve autenticado sem forceRefresh', async () => {
    fireSession(FELIPE);
    mocks.getClaims.mockResolvedValue({ role: 'tenant_owner', tenantId: 'corrida' });

    const { result } = renderHook(() => useTenantSession());

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.uid).toBe('felipe');
    expect(result.current.tenantId).toBe('corrida');
  });

  it('claim AUSENTE no token em cache → forceRefresh recupera o tenantId (não erra)', async () => {
    fireSession(FELIPE);
    // Cache: token recém-emitido ainda sem o claim (preview-seed acabou de setar).
    mocks.getClaims.mockImplementation((force?: boolean) =>
      Promise.resolve(
        force ? { role: 'tenant_owner', tenantId: 'corrida' } : { role: 'tenant_owner' },
      ),
    );

    const { result } = renderHook(() => useTenantSession());

    await waitFor(() => expect(result.current.tenantId).toBe('corrida'));
    expect(result.current.status).toBe('authenticated');
    // Provou o refresh forçado: 2ª chamada com forceRefresh=true.
    expect(mocks.getClaims).toHaveBeenNthCalledWith(2, true);
  });

  it('getClaims REJEITA no cache → forceRefresh recupera (nunca trava em loading)', async () => {
    fireSession(FELIPE);
    mocks.getClaims
      .mockRejectedValueOnce(new Error('auth/user-token-expired'))
      .mockResolvedValue({ role: 'tenant_owner', tenantId: 'corrida' });

    const { result } = renderHook(() => useTenantSession());

    await waitFor(() => expect(result.current.tenantId).toBe('corrida'));
    expect(result.current.status).toBe('authenticated');
  });

  it('getClaims REJEITA nas DUAS tentativas → resolve terminal (autenticado, sem tenant) — NUNCA skeleton eterno', async () => {
    fireSession(FELIPE);
    mocks.getClaims.mockRejectedValue(new Error('token revogado — irrecuperável'));

    const { result } = renderHook(() => useTenantSession());

    // A garantia central do fix: a sessão SAI de 'loading' mesmo no pior caso.
    await waitFor(() => expect(result.current.status).not.toBe('loading'));
    expect(result.current.status).toBe('authenticated');
    expect(result.current.uid).toBe('felipe');
    expect(result.current.tenantId).toBeNull();
  });

  it('sem usuário → anônimo (não chama getClaims)', async () => {
    fireSession(null);

    const { result } = renderHook(() => useTenantSession());

    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    expect(mocks.getClaims).not.toHaveBeenCalled();
  });
});

describe('useClubes (a rota puxa os dados de seed sob a sessão de preview)', () => {
  it('claim defasado no cache → forceRefresh → os clubes de seed CHEGAM (não fica loading)', async () => {
    fireSession(FELIPE);
    mocks.getClaims.mockImplementation((force?: boolean) =>
      Promise.resolve(
        force ? { role: 'tenant_owner', tenantId: 'corrida' } : { role: 'tenant_owner' },
      ),
    );
    mocks.listClubesByTenant.mockResolvedValue([
      mkClube({ id: 'cps', slug: 'cps', nome: 'Corrida Perfeita Sul', tenantId: 'corrida' }),
    ]);

    const { result } = renderHook(() => useClubes(), { wrapper: makeWrapper(testClient()) });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    // A query disparou com o tenant correto recuperado pelo refresh.
    expect(mocks.listClubesByTenant).toHaveBeenCalledWith(expect.anything(), 'corrida');
  });

  it('getClaims rejeita no cache → forceRefresh → os clubes CHEGAM', async () => {
    fireSession(FELIPE);
    mocks.getClaims
      .mockRejectedValueOnce(new Error('auth/user-token-expired'))
      .mockResolvedValue({ role: 'tenant_owner', tenantId: 'corrida' });
    mocks.listClubesByTenant.mockResolvedValue([
      mkClube({ id: 'cps', slug: 'cps', nome: 'Corrida Perfeita Sul', tenantId: 'corrida' }),
    ]);

    const { result } = renderHook(() => useClubes(), { wrapper: makeWrapper(testClient()) });

    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.error).toBeNull();
  });
});

describe('HubRoute (integração — a tela /clubes pinta os clubes de seed)', () => {
  it('sob ?preview=corrida com claim defasado, a rota renderiza o clube (sai do skeleton)', async () => {
    fireSession(FELIPE);
    mocks.getClaims.mockImplementation((force?: boolean) =>
      Promise.resolve(
        force ? { role: 'tenant_owner', tenantId: 'corrida' } : { role: 'tenant_owner' },
      ),
    );
    mocks.listClubesByTenant.mockResolvedValue([
      mkClube({
        id: 'cps',
        slug: 'cps',
        nome: 'Corrida Perfeita Sul',
        ownerId: 'felipe',
        tenantId: 'corrida',
      }),
    ]);

    render(
      <QueryClientProvider client={testClient()}>
        <MemoryRouter initialEntries={['/clubes']}>
          <HubRoute />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    // Prova: o nome do clube de seed aparece — os dados chegaram à tela.
    expect(
      await screen.findByRole('heading', { name: 'Corrida Perfeita Sul' }),
    ).toBeInTheDocument();
    // E não sobrou skeleton nem alerta de erro.
    expect(screen.queryByRole('status', { name: 'Carregando clubs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
