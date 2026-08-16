/**
 * useSair — encerrar a sessão (Leva 16).
 *
 * O commit que criou o hook diz, com todas as letras, por que ele existe: o que
 * se copiaria junto com as dez linhas de logout é o FAIL-SAFE, "a parte que
 * ninguém lembra de repetir igual". Ele nasceu sem teste — o `RootShell.test`
 * cobre que o item existe, tem ícone e é o último, e nada mais chega perto da
 * rede caindo no meio do `signOut`.
 *
 * É exatamente o caso em que o defeito é caro e invisível: `logout()` rejeita, a
 * navegação não acontece, e a pessoa que clicou em Sair fica parada dentro de
 * uma sessão que ela encerrou — sem erro na tela, porque o `catch` é mudo de
 * propósito.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const logoutMock = vi.hoisted(() => vi.fn<() => Promise<void>>());
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('@leela/api-client', () => ({ logout: logoutMock }));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));

import { useSair } from '../sair';

beforeEach(() => {
  logoutMock.mockReset();
  navigateMock.mockReset();
});

describe('useSair (Leva 16)', () => {
  it('encerra a sessão e leva ao login', async () => {
    logoutMock.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSair());

    await act(async () => {
      await result.current.sair();
    });

    expect(logoutMock).toHaveBeenCalledOnce();
    expect(navigateMock).toHaveBeenCalledWith('/entrar', { replace: true });
  });

  it('FAIL-SAFE: `logout` que rejeita ainda assim leva ao login', async () => {
    // A rede caindo no meio do `signOut` é o erro MAIS provável desta ação, e é
    // o único que prenderia a pessoa numa sessão que ela mandou encerrar.
    logoutMock.mockRejectedValue(new Error('rede caiu no meio do signOut'));
    const { result } = renderHook(() => useSair());

    await act(async () => {
      await result.current.sair();
    });

    expect(navigateMock).toHaveBeenCalledWith('/entrar', { replace: true });
  });

  it('`sair` nunca rejeita — quem chama não precisa de try/catch', async () => {
    logoutMock.mockRejectedValue(new Error('qualquer coisa'));
    const { result } = renderHook(() => useSair());

    await act(async () => {
      await expect(result.current.sair()).resolves.toBeUndefined();
    });
  });

  it('`saindo` sobe no clique e é o que desabilita o disparo duplo', async () => {
    let liberar: (() => void) | undefined;
    logoutMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          liberar = resolve;
        }),
    );
    const { result } = renderHook(() => useSair());
    expect(result.current.saindo).toBe(false);

    act(() => {
      void result.current.sair();
    });
    await waitFor(() => {
      expect(result.current.saindo).toBe(true);
    });

    await act(async () => {
      liberar?.();
    });
    expect(navigateMock).toHaveBeenCalledWith('/entrar', { replace: true });
  });
});
