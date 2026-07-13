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
import {
  useCriarEvento,
  useCriarPatrocinador,
  useRemoverMembro,
  useSalvarKit,
  useTransferirPropriedade,
  useTransicaoAprovisionamento,
  useTransicionarParceria,
} from '../mutations';
import { queryKeys } from '../keys';

const mocks = vi.hoisted(() => ({
  criarEvento: vi.fn(),
  salvarKit: vi.fn(),
  removerMembro: vi.fn(),
  transferirPropriedade: vi.fn(),
  transicaoAprovisionamento: vi.fn(),
  transicionarParceria: vi.fn(),
  criarPatrocinador: vi.fn(),
}));

vi.mock('@leela/api-client', () => ({
  criarEvento: mocks.criarEvento,
  salvarKit: mocks.salvarKit,
  removerMembro: mocks.removerMembro,
  transferirPropriedade: mocks.transferirPropriedade,
  transicaoAprovisionamento: mocks.transicaoAprovisionamento,
  transicionarParceria: mocks.transicionarParceria,
  criarPatrocinador: mocks.criarPatrocinador,
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

describe('useTransicaoAprovisionamento (RN-226 · read-your-writes)', () => {
  it('reusa a callable transicaoAprovisionamento e invalida o aprovisionamento do evento', async () => {
    mocks.transicaoAprovisionamento.mockResolvedValue({
      sku: 'camiseta__M',
      estado: 'encomendado',
      estoqueFisico: 0,
      aEncomendar: 7,
      alerta: null,
    });
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useTransicaoAprovisionamento('e1'), {
      wrapper: makeWrapper(client),
    });
    await result.current.mutateAsync({ sku: 'camiseta__M', novoEstado: 'encomendado', qtd: 7 });

    // eventoId injetado pelo hook — o caller só conhece SKU/estado/qtd.
    expect(mocks.transicaoAprovisionamento).toHaveBeenCalledWith(
      {},
      { eventoId: 'e1', sku: 'camiseta__M', novoEstado: 'encomendado', qtd: 7 },
    );
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.aprovisionamento.doEvento('e1'),
      }),
    );
  });
});

describe('mutações de clube (read-your-writes · FID-CLUBES-F0)', () => {
  it('useRemoverMembro reusa removerMembro e invalida membros.doClube', async () => {
    mocks.removerMembro.mockResolvedValue({ ok: true });
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useRemoverMembro('clube-corrida'), {
      wrapper: makeWrapper(client),
    });
    await result.current.mutateAsync('membro-1');

    expect(mocks.removerMembro).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.membros.doClube('clube-corrida'),
      }),
    );
  });

  it('useTransferirPropriedade reusa transferirPropriedade e invalida membros.doClube', async () => {
    mocks.transferirPropriedade.mockResolvedValue({ ok: true });
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useTransferirPropriedade('clube-corrida'), {
      wrapper: makeWrapper(client),
    });
    await result.current.mutateAsync('membro-2');

    expect(mocks.transferirPropriedade).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.membros.doClube('clube-corrida'),
      }),
    );
  });

  it('useTransicionarParceria reusa transicionarParceria e invalida parcerias.doClube', async () => {
    mocks.transicionarParceria.mockResolvedValue(undefined);
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useTransicionarParceria('clube-corrida'), {
      wrapper: makeWrapper(client),
    });
    await result.current.mutateAsync({ parceriaId: 'parc-1', status: 'ativa' });

    expect(mocks.transicionarParceria).toHaveBeenCalledWith({}, 'clube-corrida', 'parc-1', 'ativa');
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.parcerias.doClube('clube-corrida'),
      }),
    );
  });

  it('useCriarPatrocinador reusa criarPatrocinador e invalida parcerias.doClube', async () => {
    mocks.criarPatrocinador.mockResolvedValue({ parceriaId: 'parc-nova' });
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCriarPatrocinador('clube-corrida'), {
      wrapper: makeWrapper(client),
    });
    await result.current.mutateAsync({
      tenantId: 'castelo',
      nome: 'Loja X',
      modeloComercial: 'permuta',
      contrapartida: 'Brindes para os 100 primeiros inscritos',
    });

    expect(mocks.criarPatrocinador).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({
        queryKey: queryKeys.parcerias.doClube('clube-corrida'),
      }),
    );
  });
});
