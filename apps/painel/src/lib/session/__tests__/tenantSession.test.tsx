// =============================================================================
// useTenantSession — a sessão tenant-scoped ÚNICA do painel (LEELA-DEBT-T1).
//
// Este arquivo nasceu de `routes/eventos/_data/__tests__/session.test.tsx` e
// herda as asserções dele INTEIRAS. O gêmeo de `eventos/repasses/_data` era
// palavra por palavra o mesmo arquivo sobre a mesma lógica copiada e some com a
// unificação — nenhuma asserção dele fica de fora daqui, e o caso de desmonte
// abaixo é a asserção NOVA que nenhuma das cópias tinha. A cadeia de dados de
// clubes (`useClubes` + HubRoute sob o preview-seed) segue provada no lugar
// dela, `routes/clubes/_data/__tests__/session.test.tsx`, agora contra este
// mesmo hook.
//
// O que ele prova: a RESILIÊNCIA do claim sob a sessão de PREVIEW
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
import { useTenantSession } from '../tenantSession';

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

describe('useTenantSession (resiliência do claim de preview)', () => {
  it('token em cache já traz o tenantId → resolve autenticado sem forceRefresh', async () => {
    fireSession(FELIPE);
    mocks.getClaims.mockResolvedValue({ role: 'tenant_owner', tenantId: 'corrida' });

    const { result } = renderHook(() => useTenantSession());

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

    const { result } = renderHook(() => useTenantSession());

    await waitFor(() => expect(result.current.tenantId).toBe('corrida'));
    expect(result.current.status).toBe('authenticated');
    expect(mocks.getClaims).toHaveBeenNthCalledWith(2, true); // provou o refresh
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

  it('getClaims REJEITA nas DUAS tentativas → terminal (autenticado, sem tenant) — NUNCA skeleton eterno', async () => {
    fireSession(FELIPE);
    mocks.getClaims.mockRejectedValue(new Error('token revogado — irrecuperável'));

    const { result } = renderHook(() => useTenantSession());

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

  // ---------------------------------------------------------------------------
  // Asserção NOVA (LEELA-DEBT-T1) — nenhuma das cinco cópias provava o desmonte.
  //
  // Com uma implementação só, o custo de um vazamento aqui multiplica por todas
  // as rotas tenant-scoped do painel: o observador do Firebase é global e cada
  // tela que monta e desmonta deixaria um `setState` órfão atrás de si (aviso de
  // update em componente desmontado, e memória do observador nunca liberada).
  // A guarda `ativo` e o `unsub()` do cleanup são o que impedem isso.
  // ---------------------------------------------------------------------------
  it('desmontar cancela a inscrição e nenhum estado chega depois', async () => {
    const unsub = vi.fn();
    // Portas em objeto (e não em `let`) porque a atribuição acontece DENTRO de
    // um callback: o TS estreitaria a variável solta para `never` no uso.
    const porta: {
      emitir?: (u: unknown) => void;
      liberarClaims?: (c: unknown) => void;
    } = {};
    mocks.onSessionChange.mockImplementation((cb: (u: unknown) => void) => {
      porta.emitir = cb;
      return unsub;
    });
    // Claim que só resolve quando ESTE teste mandar — a janela entre o desmonte
    // e a resposta do token é exatamente onde o `setState` órfão aconteceria.
    mocks.getClaims.mockImplementation(
      () =>
        new Promise((resolve) => {
          porta.liberarClaims = resolve;
        }),
    );

    const { result, unmount } = renderHook(() => useTenantSession());
    porta.emitir?.(FELIPE);
    await waitFor(() => expect(mocks.getClaims).toHaveBeenCalled());

    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);

    porta.liberarClaims?.({ role: 'tenant_owner', tenantId: 'corrida' });
    // Sem a guarda `ativo`, este await entregaria 'authenticated' a um hook
    // desmontado. O estado congela no último valor de antes do desmonte.
    await Promise.resolve();
    expect(result.current.status).toBe('loading');
    expect(result.current.tenantId).toBeNull();
  });
});
