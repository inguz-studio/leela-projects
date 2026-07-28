// =============================================================================
// usePlatformSession — a sexta sessão, e a única que ficou sem o hardening do
// claim (LEELA-DEBT-REV, review antagonista da lane DEBT-SWEEP).
//
// O T1 da DEBT-SWEEP unificou as CINCO cópias tenant-scoped e classificou
// `overview`, `plataforma`, `marcas` e o rodapé do shell como "contratos
// diferentes, não cópias" — e a classificação está certa: esta lê `role`, não
// `tenantId`. Só que o motivo declarado para a unificação ("cinco cópias eram
// cinco lugares para um hardening de autenticação ser esquecido") vale palavra
// por palavra aqui: `overview` recebeu o hardening do `711af42`, `plataforma`
// não. Esta é a última porta do painel que ainda fazia
// `getClaims().then(...)` sem forceRefresh e sem catch.
//
// O que isso custava: `PlatformGuard` pinta Skeleton enquanto `status` é
// 'loading'. Sem catch, uma REJEIÇÃO de `getClaims` nunca chama `setSession` —
// a área inteira de super-admin fica em skeleton eterno, sem erro no console e
// sem caminho de saída. É o MESMO defeito que a rota de Clubes pagou em
// `711af42` (LEELA-CLUBES-FIX), num lugar onde ninguém tinha olhado.
//
// E sem o forceRefresh havia o irmão silencioso: sob o `preview-seed` (que seta
// o claim e revoga os refresh tokens), o primeiro token pode chegar SEM `role`.
// O guard então responde 403 a um admin de verdade — uma resposta errada e
// definitiva, que é pior que o skeleton porque parece deliberada.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePlatformSession } from '../session';

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

const ADMIN = { uid: 'uid-super' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePlatformSession (resiliência do claim de preview)', () => {
  it('token em cache já traz o role → resolve autenticado, sem forceRefresh', async () => {
    fireSession(ADMIN);
    mocks.getClaims.mockResolvedValue({ role: 'platform_admin' });

    const { result } = renderHook(() => usePlatformSession());

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.uid).toBe('uid-super');
    expect(result.current.role).toBe('platform_admin');
    expect(result.current.isAdmin).toBe(true);
    // O caminho saudável não paga refresh nenhum — uma chamada e pronto.
    expect(mocks.getClaims).toHaveBeenCalledTimes(1);
  });

  it('role AUSENTE no cache → forceRefresh recupera (admin não leva 403 na cara)', async () => {
    fireSession(ADMIN);
    // Cache: token emitido ANTES de o claim ser setado pelo preview-seed.
    mocks.getClaims.mockImplementation((force?: boolean) =>
      Promise.resolve(force ? { role: 'platform_admin' } : {}),
    );

    const { result } = renderHook(() => usePlatformSession());

    await waitFor(() => expect(result.current.isAdmin).toBe(true));
    expect(result.current.role).toBe('platform_admin');
    expect(mocks.getClaims).toHaveBeenCalledWith(true);
  });

  it('getClaims REJEITA no cache → forceRefresh recupera (nunca trava em loading)', async () => {
    fireSession(ADMIN);
    mocks.getClaims.mockImplementation((force?: boolean) =>
      force ? Promise.resolve({ role: 'platform_admin' }) : Promise.reject(new Error('token defasado')),
    );

    const { result } = renderHook(() => usePlatformSession());

    await waitFor(() => expect(result.current.status).toBe('authenticated'));
    expect(result.current.isAdmin).toBe(true);
  });

  it('getClaims REJEITA nas DUAS tentativas → terminal sem papel, NUNCA skeleton eterno', async () => {
    fireSession(ADMIN);
    mocks.getClaims.mockRejectedValue(new Error('refresh token revogado'));

    const { result } = renderHook(() => usePlatformSession());

    // A asserção que importa: sair de 'loading'. Enquanto o status é 'loading',
    // o PlatformGuard pinta Skeleton — e sem estado terminal ele pinta para
    // sempre, sem erro visível e sem caminho de saída.
    await waitFor(() => expect(result.current.status).not.toBe('loading'));
    expect(result.current.status).toBe('authenticated');
    expect(result.current.uid).toBe('uid-super');
    // Sem papel confirmado o guard responde 403 — resposta honesta e acionável,
    // que é o desfecho correto quando o token é irrecuperável.
    expect(result.current.role).toBeNull();
    expect(result.current.isAdmin).toBe(false);
  });

  it('sem usuário → anônimo (não chama getClaims)', async () => {
    fireSession(null);

    const { result } = renderHook(() => usePlatformSession());

    await waitFor(() => expect(result.current.status).toBe('anonymous'));
    expect(result.current.uid).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(mocks.getClaims).not.toHaveBeenCalled();
  });
});
