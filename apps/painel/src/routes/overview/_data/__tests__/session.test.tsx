// =============================================================================
// useOverviewSession — prova a RESILIÊNCIA do claim sob a sessão de PREVIEW
// (hardening irmão do LEELA-CLUBES-FIX). A Visão Geral usa `getOverview`
// (callable server-side) e por isso ESCAPAVA do skeleton eterno de clubes — mas
// o hook ainda expõe `tenantId`/`role` do claim, e a versão antiga fazia
// `getClaims().then()` SEM forceRefresh e SEM catch: sob o preview-seed uma
// rejeição prenderia a sessão em 'loading'. Blindamos pela MESMA razão.
//
// Além da resiliência, prova que `nome` (do displayName, não do claim) e `role`
// sobrevivem em todos os desfechos.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOverviewSession } from '../session';

const mocks = vi.hoisted(() => ({
  onSessionChange: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  onSessionChange: mocks.onSessionChange,
  getClaims: mocks.getClaims,
}));

function fireSession(user: { uid: string; displayName?: string | null } | null): void {
  mocks.onSessionChange.mockImplementation((cb: (u: unknown) => void) => {
    cb(user);
    return () => {};
  });
}

const FELIPE = { uid: 'felipe', displayName: 'Felipe' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useOverviewSession (resiliência do claim de preview)', () => {
  it('token em cache já traz o tenantId → resolve autenticado com nome e role', async () => {
    fireSession(FELIPE);
    mocks.getClaims.mockResolvedValue({ role: 'tenant_owner', tenantId: 'corrida' });

    const { result } = renderHook(() => useOverviewSession());

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.uid).toBe('felipe');
    expect(result.current.tenantId).toBe('corrida');
    expect(result.current.nome).toBe('Felipe');
    expect(result.current.role).toBe('tenant_owner');
    expect(mocks.getClaims).toHaveBeenCalledTimes(1);
  });

  it('claim AUSENTE no cache → forceRefresh recupera tenantId E role (preserva nome)', async () => {
    fireSession(FELIPE);
    // Cache: token recém-emitido ainda sem os claims de tenant/papel.
    mocks.getClaims.mockImplementation((force?: boolean) =>
      Promise.resolve(force ? { role: 'tenant_owner', tenantId: 'corrida' } : {}),
    );

    const { result } = renderHook(() => useOverviewSession());

    await waitFor(() => expect(result.current.tenantId).toBe('corrida'));
    expect(result.current.role).toBe('tenant_owner');
    expect(result.current.nome).toBe('Felipe');
    expect(mocks.getClaims).toHaveBeenNthCalledWith(2, true);
  });

  it('getClaims REJEITA no cache → forceRefresh recupera (nunca trava em loading)', async () => {
    fireSession(FELIPE);
    mocks.getClaims
      .mockRejectedValueOnce(new Error('auth/user-token-expired'))
      .mockResolvedValue({ role: 'staff', tenantId: 'corrida' });

    const { result } = renderHook(() => useOverviewSession());

    await waitFor(() => expect(result.current.tenantId).toBe('corrida'));
    expect(result.current.status).toBe('authenticated');
    expect(result.current.role).toBe('staff');
  });

  it('getClaims REJEITA nas DUAS tentativas → terminal (autenticado, sem tenant/role, com nome)', async () => {
    fireSession(FELIPE);
    mocks.getClaims.mockRejectedValue(new Error('token revogado — irrecuperável'));

    const { result } = renderHook(() => useOverviewSession());

    await waitFor(() => expect(result.current.status).not.toBe('loading'));
    expect(result.current.status).toBe('authenticated');
    expect(result.current.uid).toBe('felipe');
    expect(result.current.tenantId).toBeNull();
    expect(result.current.role).toBeNull();
    // nome (displayName) sobrevive mesmo com o token irrecuperável.
    expect(result.current.nome).toBe('Felipe');
  });

  it('sem usuário → anônimo (não chama getClaims)', async () => {
    fireSession(null);

    const { result } = renderHook(() => useOverviewSession());

    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    expect(mocks.getClaims).not.toHaveBeenCalled();
  });
});
