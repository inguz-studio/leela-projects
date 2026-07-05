// Hook de dados da Visão Geral — foco na propagação honesta de erro (#39):
// o erro da fonte-mãe (eventos) NÃO pode deixar as inscrições em skeleton
// eterno. `useInscricoesRecentes` com `eventosError` curto-circuita antes de
// qualquer fetch — não precisa de emulator nem mock de rede.
import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInscricoesRecentes } from '../overview';

describe('useInscricoesRecentes — propagação de erro (#39)', () => {
  it('erro dos eventos → erro real, nunca loading eterno', async () => {
    const boom = new Error('listar eventos falhou');
    const { result } = renderHook(() => useInscricoesRecentes(null, boom));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(boom);
    expect(result.current.data).toBeNull();
  });

  it('eventos ainda null e sem erro → segue em loading (não finge vazio)', () => {
    const { result } = renderHook(() => useInscricoesRecentes(null, null));
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('sem eventos ativos → vazio honesto (lista vazia, não erro)', async () => {
    const { result } = renderHook(() => useInscricoesRecentes([], null));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeNull();
    expect(result.current.data).toEqual([]);
  });

  it('expõe refetch estável', () => {
    const { result } = renderHook(() => useInscricoesRecentes(null, null));
    expect(typeof result.current.refetch).toBe('function');
  });
});
