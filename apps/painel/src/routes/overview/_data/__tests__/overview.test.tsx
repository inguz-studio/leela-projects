// Hook de dados da Visão Geral — foco na propagação honesta de erro (#39):
// o erro da fonte-mãe (eventos) NÃO pode deixar as inscrições em skeleton
// eterno. `useInscricoesRecentes` com `eventosError` curto-circuita antes de
// qualquer fetch — não precisa de emulator nem mock de rede.
//
// Pós-UX-DADOS: o hook usa `useQuery`, então o render precisa de um
// QueryClientProvider. O client de teste desliga retry (falha determinística,
// zero flake — Kent C. Dodds) e gcTime 0 (nenhum vazamento entre casos).
import { describe, expect, it } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { useInscricoesRecentes } from '../overview';

function wrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children);
}

describe('useInscricoesRecentes — propagação de erro (#39)', () => {
  it('erro dos eventos → erro real, nunca loading eterno', async () => {
    const boom = new Error('listar eventos falhou');
    const { result } = renderHook(() => useInscricoesRecentes(null, boom), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(boom);
    expect(result.current.data).toBeNull();
  });

  it('eventos ainda null e sem erro → segue em loading (não finge vazio)', () => {
    const { result } = renderHook(() => useInscricoesRecentes(null, null), {
      wrapper: wrapper(),
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('sem eventos ativos → vazio honesto (lista vazia, não erro)', async () => {
    const { result } = renderHook(() => useInscricoesRecentes([], null), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual([]);
  });

  it('expõe refetch estável', () => {
    const { result } = renderHook(() => useInscricoesRecentes(null, null), {
      wrapper: wrapper(),
    });
    expect(typeof result.current.refetch).toBe('function');
  });
});
