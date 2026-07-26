// =============================================================================
// useFinanceiroSession — prova a RESILIÊNCIA do claim sob a sessão de PREVIEW
// (hardening irmão do LEELA-CLUBES-FIX). Mesma fragilidade latente de
// clubes/eventos: o preview-seed seta o claim `tenantId` e REVOGA os refresh
// tokens; o token defasado ou uma rejeição prendiam a sessão em 'loading' PARA
// SEMPRE (as leituras de repasse/análise ficam `enabled:false`) → skeleton
// eterno. O fix (getClaims(false) → getClaims(true) → terminal, com catch)
// garante um estado TERMINAL sempre.
//
// Testa COMPORTAMENTO com o api-client mockado (sem Firestore/emulator).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useFinanceiroSession } from '../session';

const mocks = vi.hoisted(() => ({
  onSessionChange: vi.fn(),
  getClaims: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  onSessionChange: mocks.onSessionChange,
  getClaims: mocks.getClaims,
}));

function fireSession(user: { uid: string } | null): void {
  mocks.onSessionChange.mockImplementation((cb: (u: unknown) => void) => {
    cb(user);
    return () => {};
  });
}

const FELIPE = { uid: 'felipe' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useFinanceiroSession (resiliência do claim de preview)', () => {
  it('token em cache já traz o tenantId → resolve autenticado sem forceRefresh', async () => {
    fireSession(FELIPE);
    mocks.getClaims.mockResolvedValue({ role: 'tenant_owner', tenantId: 'corrida' });

    const { result } = renderHook(() => useFinanceiroSession());

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.uid).toBe('felipe');
    expect(result.current.tenantId).toBe('corrida');
    expect(mocks.getClaims).toHaveBeenCalledTimes(1);
  });

  it('claim AUSENTE no cache → forceRefresh recupera o tenantId (não erra)', async () => {
    fireSession(FELIPE);
    mocks.getClaims.mockImplementation((force?: boolean) =>
      Promise.resolve(force ? { role: 'tenant_owner', tenantId: 'corrida' } : { role: 'tenant_owner' }),
    );

    const { result } = renderHook(() => useFinanceiroSession());

    await waitFor(() => expect(result.current.tenantId).toBe('corrida'));
    expect(result.current.status).toBe('authenticated');
    expect(mocks.getClaims).toHaveBeenNthCalledWith(2, true);
  });

  it('getClaims REJEITA no cache → forceRefresh recupera (nunca trava em loading)', async () => {
    fireSession(FELIPE);
    mocks.getClaims
      .mockRejectedValueOnce(new Error('auth/user-token-expired'))
      .mockResolvedValue({ role: 'tenant_owner', tenantId: 'corrida' });

    const { result } = renderHook(() => useFinanceiroSession());

    await waitFor(() => expect(result.current.tenantId).toBe('corrida'));
    expect(result.current.status).toBe('authenticated');
  });

  it('getClaims REJEITA nas DUAS tentativas → terminal (autenticado, sem tenant) — NUNCA skeleton eterno', async () => {
    fireSession(FELIPE);
    mocks.getClaims.mockRejectedValue(new Error('token revogado — irrecuperável'));

    const { result } = renderHook(() => useFinanceiroSession());

    await waitFor(() => expect(result.current.status).not.toBe('loading'));
    expect(result.current.status).toBe('authenticated');
    expect(result.current.uid).toBe('felipe');
    expect(result.current.tenantId).toBeNull();
  });

  it('sem usuário → anônimo (não chama getClaims)', async () => {
    fireSession(null);

    const { result } = renderHook(() => useFinanceiroSession());

    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    expect(mocks.getClaims).not.toHaveBeenCalled();
  });
});
