// =============================================================================
// Camada de mutation (lib/query) — prova o CONTRATO do lado escrita: cada
// mutation reusa a função de escrita do api-client E invalida as chaves de
// leitura afetadas no sucesso (read-your-writes, ADR-010). Testa COMPORTAMENTO
// (a lista revalida), não implementação — Kent C. Dodds.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCriarEvento, useSalvarKit } from '../mutations';
import { queryKeys } from '../keys';

const mocks = vi.hoisted(() => ({
  criarEvento: vi.fn(),
  salvarKit: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  criarEvento: mocks.criarEvento,
  salvarKit: mocks.salvarKit,
  getLeelaFunctions: () => ({}),
  getLeelaDb: () => ({}),
}));

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCriarEvento (read-your-writes do GATE S201)', () => {
  it('reusa criarEvento do api-client e invalida a lista do organizador + overview', async () => {
    mocks.criarEvento.mockResolvedValue({ eventoId: 'e1', slug: 'meia-floripa' });
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(
      () => useCriarEvento({ tenantId: 'castelo', organizadorId: 'uid-marina' }),
      { wrapper: makeWrapper(client) },
    );

    await result.current.mutateAsync({
      nome: 'Meia Floripa',
      data: '2099-04-27',
      local: 'Floripa',
      modalidades: ['10k'],
      percursos: [{ nome: '10k', preco: 120 }],
    });

    expect(mocks.criarEvento).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.eventos.doOrganizador('castelo', 'uid-marina'),
      }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.overview });
  });
});

describe('useSalvarKit', () => {
  it('reusa salvarKit e invalida a FAMÍLIA de kits do evento (qualquer reloadKey)', async () => {
    mocks.salvarKit.mockResolvedValue(undefined);
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useSalvarKit('e1'), { wrapper: makeWrapper(client) });

    await result.current.mutateAsync({
      kitId: 'kit_ouro',
      input: { tenantId: 'castelo', nome: 'Kit Ouro', preco: 120, capacidade: 100, modalidades: ['21k'] },
    });

    expect(mocks.salvarKit).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['kits', 'do-evento', 'e1'] }),
    );
  });
});
