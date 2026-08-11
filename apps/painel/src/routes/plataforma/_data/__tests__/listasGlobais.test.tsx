// =============================================================================
// Hooks das listas globais (ADMIN-VISAO onda 4). O que estes casos travam:
//   · qual READER cada recorte usa (global × por tenant) — a decisão da onda 1;
//   · `temMais` sai de `proxCursor`, e é ele que autoriza o contador honesto;
//   · "carregar mais" ANEXA e leva o cursor junto;
//   · trocar de recorte REINICIA a lista (nunca mistura páginas de recortes).
// api-client mockado — sem Firestore.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { mkEvento } from '../../../eventos/_test/fixtures';
import { mkClube } from '../../../clubes/_test/fixtures';
import { useClubesGlobais, useEventosGlobais } from '../listasGlobais';

const mocks = vi.hoisted(() => ({
  listarEventosGlobalPaginado: vi.fn(),
  listarClubesGlobalPaginado: vi.fn(),
  listarEventosDoTenantPaginado: vi.fn(),
  listarClubesDoTenantPaginado: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  getLeelaDb: () => ({}),
  listarEventosGlobalPaginado: mocks.listarEventosGlobalPaginado,
  listarClubesGlobalPaginado: mocks.listarClubesGlobalPaginado,
  listarEventosDoTenantPaginado: mocks.listarEventosDoTenantPaginado,
  listarClubesDoTenantPaginado: mocks.listarClubesDoTenantPaginado,
}));

const CURSOR = { id: 'cursor-1' } as never;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listarEventosGlobalPaginado.mockResolvedValue({ itens: [], proxCursor: null });
  mocks.listarClubesGlobalPaginado.mockResolvedValue({ itens: [], proxCursor: null });
  mocks.listarEventosDoTenantPaginado.mockResolvedValue({ itens: [], proxCursor: null });
  mocks.listarClubesDoTenantPaginado.mockResolvedValue({ itens: [], proxCursor: null });
});

describe('useEventosGlobais', () => {
  it('sem recorte lê a coleção raiz e não passa status', async () => {
    mocks.listarEventosGlobalPaginado.mockResolvedValue({
      itens: [mkEvento()],
      proxCursor: null,
    });

    const { result } = renderHook(() => useEventosGlobais());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.itens).toHaveLength(1);
    expect(result.current.temMais).toBe(false);
    expect(mocks.listarEventosGlobalPaginado).toHaveBeenCalledWith({}, {});
    expect(mocks.listarEventosDoTenantPaginado).not.toHaveBeenCalled();
  });

  it('com status, o filtro vai ao SERVIDOR (nunca peneirado no cliente)', async () => {
    renderHook(() => useEventosGlobais({ status: 'publicado' }));

    await waitFor(() =>
      expect(mocks.listarEventosGlobalPaginado).toHaveBeenCalledWith({}, { status: 'publicado' })
    );
  });

  it('com tenant, usa o reader DO TENANT (decisão da onda 1), não o global', async () => {
    renderHook(() => useEventosGlobais({ tenantId: 'castelo' }));

    await waitFor(() =>
      expect(mocks.listarEventosDoTenantPaginado).toHaveBeenCalledWith({}, 'castelo', {})
    );
    expect(mocks.listarEventosGlobalPaginado).not.toHaveBeenCalled();
  });

  it('`temMais` vem do proxCursor; carregar mais anexa e leva o cursor', async () => {
    mocks.listarEventosGlobalPaginado
      .mockResolvedValueOnce({ itens: [mkEvento({ id: 'e1' })], proxCursor: CURSOR })
      .mockResolvedValueOnce({ itens: [mkEvento({ id: 'e2' })], proxCursor: null });

    const { result } = renderHook(() => useEventosGlobais());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.temMais).toBe(true);

    act(() => result.current.carregarMais());

    await waitFor(() => expect(result.current.itens).toHaveLength(2));
    expect(result.current.itens.map((e) => e.id)).toEqual(['e1', 'e2']);
    expect(result.current.temMais).toBe(false);
    expect(mocks.listarEventosGlobalPaginado).toHaveBeenLastCalledWith({}, { cursor: CURSOR });
  });

  it('trocar de recorte REINICIA a lista (não mistura páginas)', async () => {
    mocks.listarEventosGlobalPaginado.mockResolvedValue({
      itens: [mkEvento({ id: 'e1' })],
      proxCursor: CURSOR,
    });

    const { result, rerender } = renderHook(
      ({ status }: { status: 'todos' | 'publicado' }) =>
        useEventosGlobais(status === 'todos' ? {} : { status }),
      { initialProps: { status: 'todos' } as { status: 'todos' | 'publicado' } }
    );
    await waitFor(() => expect(result.current.itens).toHaveLength(1));

    mocks.listarEventosGlobalPaginado.mockResolvedValue({
      itens: [mkEvento({ id: 'e9' })],
      proxCursor: null,
    });
    rerender({ status: 'publicado' });

    await waitFor(() => expect(result.current.itens.map((e) => e.id)).toEqual(['e9']));
    // A segunda chamada do recorte novo nasce SEM cursor — página 1 de novo.
    expect(mocks.listarEventosGlobalPaginado).toHaveBeenLastCalledWith(
      {},
      { status: 'publicado' }
    );
  });

  it('falha do reader vira erro na mão da tela (sem lista mentirosa)', async () => {
    mocks.listarEventosGlobalPaginado.mockRejectedValue(new Error('permission-denied'));

    const { result } = renderHook(() => useEventosGlobais());

    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.itens).toEqual([]);
    expect(result.current.temMais).toBe(false);
  });
});

describe('useClubesGlobais', () => {
  it('sem recorte lê a coleção raiz de clubes', async () => {
    mocks.listarClubesGlobalPaginado.mockResolvedValue({
      itens: [mkClube()],
      proxCursor: null,
    });

    const { result } = renderHook(() => useClubesGlobais());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.itens).toHaveLength(1);
    expect(mocks.listarClubesGlobalPaginado).toHaveBeenCalledWith({}, {});
  });

  it('com tenant, usa o reader do tenant', async () => {
    renderHook(() => useClubesGlobais({ tenantId: 'castelo' }));

    await waitFor(() =>
      expect(mocks.listarClubesDoTenantPaginado).toHaveBeenCalledWith({}, 'castelo', {})
    );
    expect(mocks.listarClubesGlobalPaginado).not.toHaveBeenCalled();
  });
});
