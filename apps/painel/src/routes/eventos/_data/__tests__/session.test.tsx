// =============================================================================
// useEventosSession — prova a RESILIÊNCIA do claim sob a sessão de PREVIEW
// (hardening irmão do LEELA-CLUBES-FIX). O preview-seed seta o claim `tenantId`
// e em seguida REVOGA os refresh tokens (revokeRefreshTokens). O primeiro token
// que o cliente vê pode (a) ainda não carregar o `tenantId` (token defasado) ou
// (b) falhar ao refrescar. Antes do fix, o hook lia `getClaims()` SEM
// forceRefresh e SEM catch → uma rejeição prendia a sessão em 'loading' PARA
// SEMPRE (query `enabled:false`, nunca resolve nem rejeita) → skeleton eterno.
//
// Testa COMPORTAMENTO com o api-client mockado (sem Firestore/emulator).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEventosSession } from '../session';

const mocks = vi.hoisted(() => ({
  onSessionChange: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  onSessionChange: mocks.onSessionChange,
  getClaims: mocks.getClaims,
}));

/** Faz o observador de sessão emitir `user` (como o onAuthStateChanged faria). */
function fireSession(user: { uid: string; displayName?: string | null } | null): void {
  mocks.onSessionChange.mockImplementation((cb: (u: unknown) => void) => {
    cb(user);
    return () => {};
  });
}

const FELIPE = { uid: 'felipe' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useEventosSession (resiliência do claim de preview)', () => {
  it('token em cache já traz o tenantId → resolve autenticado sem forceRefresh', async () => {
    fireSession(FELIPE);
    mocks.getClaims.mockResolvedValue({ role: 'tenant_owner', tenantId: 'corrida' });

    const { result } = renderHook(() => useEventosSession());

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.uid).toBe('felipe');
    expect(result.current.tenantId).toBe('corrida');
    expect(mocks.getClaims).toHaveBeenCalledTimes(1); // sem refresh forçado
  });

  it('claim AUSENTE no cache → forceRefresh recupera o tenantId (não erra)', async () => {
    fireSession(FELIPE);
    mocks.getClaims.mockImplementation((force?: boolean) =>
      Promise.resolve(force ? { role: 'tenant_owner', tenantId: 'corrida' } : { role: 'tenant_owner' }),
    );

    const { result } = renderHook(() => useEventosSession());

    await waitFor(() => expect(result.current.tenantId).toBe('corrida'));
    expect(result.current.status).toBe('authenticated');
    expect(mocks.getClaims).toHaveBeenNthCalledWith(2, true); // provou o refresh
  });

  it('getClaims REJEITA no cache → forceRefresh recupera (nunca trava em loading)', async () => {
    fireSession(FELIPE);
    mocks.getClaims
      .mockRejectedValueOnce(new Error('auth/user-token-expired'))
      .mockResolvedValue({ role: 'tenant_owner', tenantId: 'corrida' });

    const { result } = renderHook(() => useEventosSession());

    await waitFor(() => expect(result.current.tenantId).toBe('corrida'));
    expect(result.current.status).toBe('authenticated');
  });

  it('getClaims REJEITA nas DUAS tentativas → terminal (autenticado, sem tenant) — NUNCA skeleton eterno', async () => {
    fireSession(FELIPE);
    mocks.getClaims.mockRejectedValue(new Error('token revogado — irrecuperável'));

    const { result } = renderHook(() => useEventosSession());

    await waitFor(() => expect(result.current.status).not.toBe('loading'));
    expect(result.current.status).toBe('authenticated');
    expect(result.current.uid).toBe('felipe');
    expect(result.current.tenantId).toBeNull();
  });

  it('sem usuário → anônimo (não chama getClaims)', async () => {
    fireSession(null);

    const { result } = renderHook(() => useEventosSession());

    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    expect(mocks.getClaims).not.toHaveBeenCalled();
  });
});
