// =============================================================================
// Gateway de REALTIME — prova o CONTRATO das superfícies vivas: o hook (a) começa
// em loading, (b) reflete cada snapshot do observador do api-client, (c) ESCREVE
// na chave partilhada do cache (Overview↔Financeiro / tabela↔balcão reidratam
// frescos), (d) cancela a assinatura no unmount, (e) sobe o erro do listener.
// Testa COMPORTAMENTO com um observador FALSO (sem Firestore/emulator).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFinanceiroRealtime, useInscritosRealtime } from '../realtime';
import { queryKeys } from '../keys';

const mocks = vi.hoisted(() => ({
  observarFinanceiroEvento: vi.fn(),
  observarInscritos: vi.fn(),
  finUnsub: vi.fn(),
  insUnsub: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  observarFinanceiroEvento: mocks.observarFinanceiroEvento,
  observarInscritos: mocks.observarInscritos,
  getLeelaDb: () => ({}),
}));

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.observarFinanceiroEvento.mockImplementation(() => mocks.finUnsub);
  mocks.observarInscritos.mockImplementation(() => mocks.insUnsub);
});

/** Extrai o objeto `handlers` (3º arg) que o hook passou ao observador. */
function handlersOf(fn: { mock: { calls: unknown[][] } }) {
  return fn.mock.calls[0]?.[2] as {
    next: (v: unknown) => void;
    error?: (e: Error) => void;
  };
}

describe('useFinanceiroRealtime (superfície viva S207)', () => {
  it('começa em loading, reflete o snapshot e ESCREVE na chave partilhada', async () => {
    const client = new QueryClient();
    const { result } = renderHook(() => useFinanceiroRealtime('e1'), {
      wrapper: makeWrapper(client),
    });

    // Assina o evento certo e começa em loading (sem fingir vazio).
    expect(mocks.observarFinanceiroEvento).toHaveBeenCalledTimes(1);
    expect(result.current).toEqual({ data: null, loading: true, error: null });

    const fin = { tenantId: 'castelo', receitaBruta: 12000 };
    act(() => handlersOf(mocks.observarFinanceiroEvento).next(fin));

    await waitFor(() => expect(result.current.data).toEqual(fin));
    expect(result.current.loading).toBe(false);
    // A chave partilhada Overview↔Financeiro recebeu o valor vivo.
    expect(client.getQueryData(queryKeys.financeiro.current('e1'))).toEqual(fin);
  });

  it('null do listener = agregado ainda não computado (ausência honesta)', async () => {
    const client = new QueryClient();
    const { result } = renderHook(() => useFinanceiroRealtime('e1'), {
      wrapper: makeWrapper(client),
    });
    act(() => handlersOf(mocks.observarFinanceiroEvento).next(null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('erro do listener sobe para o estado', async () => {
    const client = new QueryClient();
    const { result } = renderHook(() => useFinanceiroRealtime('e1'), {
      wrapper: makeWrapper(client),
    });
    const boom = new Error('permission-denied');
    act(() => handlersOf(mocks.observarFinanceiroEvento).error?.(boom));
    await waitFor(() => expect(result.current.error).toBe(boom));
    expect(result.current.loading).toBe(false);
  });

  it('cancela a assinatura no unmount (não vaza listener)', () => {
    const client = new QueryClient();
    const { unmount } = renderHook(() => useFinanceiroRealtime('e1'), {
      wrapper: makeWrapper(client),
    });
    expect(mocks.finUnsub).not.toHaveBeenCalled();
    unmount();
    expect(mocks.finUnsub).toHaveBeenCalledTimes(1);
  });

  it('sem evento (null) NÃO assina e segue em loading', () => {
    const client = new QueryClient();
    const { result } = renderHook(() => useFinanceiroRealtime(null), {
      wrapper: makeWrapper(client),
    });
    expect(mocks.observarFinanceiroEvento).not.toHaveBeenCalled();
    expect(result.current).toEqual({ data: null, loading: true, error: null });
  });
});

describe('useInscritosRealtime (superfície viva S204 — balcão)', () => {
  it('reflete o pool ao vivo e escreve na chave partilhada com a tabela densa', async () => {
    const client = new QueryClient();
    const { result } = renderHook(() => useInscritosRealtime('e1'), {
      wrapper: makeWrapper(client),
    });

    expect(mocks.observarInscritos).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(true);

    const pool = [{ id: 'i1', atletaNome: 'Ana' }];
    act(() => handlersOf(mocks.observarInscritos).next(pool));

    await waitFor(() => expect(result.current.data).toEqual(pool));
    expect(client.getQueryData(queryKeys.inscritos.todos('e1'))).toEqual(pool);
  });

  it('cancela a assinatura no unmount', () => {
    const client = new QueryClient();
    const { unmount } = renderHook(() => useInscritosRealtime('e1'), {
      wrapper: makeWrapper(client),
    });
    unmount();
    expect(mocks.insUnsub).toHaveBeenCalledTimes(1);
  });
});
