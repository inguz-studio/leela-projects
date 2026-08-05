// =============================================================================
// LotesPage — desativar o lote (BUILD-LOTES-UX · frente E).
//
// O lote não tem flag `ativo`: o estado é derivado da janela e do contador.
// Então desativar escolhe a porta pela existência de venda, e o que estes
// testes protegem é justamente a ESCOLHA — e o que ela NÃO faz:
//   - sem venda → fecha a janela (`fimEm = agora`), escrita direta de cliente;
//   - com venda → capacidade = vendidos pela Function auditada (RN-304), que é
//     a única porta que a Rule deixa aberta pós-venda;
//   - em nenhum dos dois a venda já feita é desfeita: a capacidade NUNCA desce
//     abaixo do vendido, e nada aqui remove lote nem escreve em inscrito.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@leela/design-system';
import type { Lote } from '@leela/core';
import { LotesPage } from '../LotesPage';
import { mkEvento, ts } from '../../_test/fixtures';


const mocks = vi.hoisted(() => ({
  useLotes: vi.fn(),
  useLoteMutations: vi.fn(),
  useAjustarCapacidadeLote: vi.fn(),
  salvar: vi.fn(),
  remover: vi.fn(),
  ajustarMutateAsync: vi.fn(),
}));

vi.mock('../../_data/lotes', () => ({
  useLotes: mocks.useLotes,
  useLoteMutations: mocks.useLoteMutations,
}));
vi.mock('../../../../lib/query/mutations', () => ({
  useAjustarCapacidadeLote: mocks.useAjustarCapacidadeLote,
}));

const DIA = 24 * 60 * 60 * 1000;

/**
 * Lote VIGENTE agora. A janela é relativa ao relógio real de propósito: a
 * `LotesPage` não injeta `agora` (a tela usa o relógio do navegador), e a ação
 * de desativar só existe enquanto o lote vende. Uma janela com data fixa
 * envelheceria e desligaria o botão sozinha meses depois — o teste viraria
 * verde-falso silencioso.
 */
function mkLote(over: Partial<Lote> & { modalidade: string; ordem: number }): Lote {
  return {
    id: `${over.modalidade}-lote-${over.ordem}`,
    tenantId: 'castelo',
    nome: `Lote ${over.ordem}`,
    quantidadeLimite: 300,
    preco: 75,
    vendidos: 0,
    inicioEm: ts(new Date(Date.now() - DIA)),
    fimEm: ts(new Date(Date.now() + 30 * DIA)),
    criadoEm: ts(new Date('2025-11-01T00:00:00Z')),
    atualizadoEm: ts(new Date('2025-11-01T00:00:00Z')),
    ...over,
  };
}

const EVENTO = mkEvento({ modalidades: ['5k'] });

function renderPage(lotes: Lote[]): void {
  mocks.useLotes.mockReturnValue({ data: lotes, loading: false, error: null });
  mocks.useLoteMutations.mockReturnValue({
    tenantId: 'castelo',
    salvar: mocks.salvar,
    remover: mocks.remover,
  });
  mocks.useAjustarCapacidadeLote.mockReturnValue({ mutateAsync: mocks.ajustarMutateAsync });
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/eventos/x/lotes']}>
        <Routes>
          <Route element={<Outlet context={{ evento: EVENTO }} />}>
            <Route path="/eventos/:slug/lotes" element={<LotesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

/** Abre o ConfirmModal de desativação do lote na linha indicada e confirma. */
async function desativar(nomeDoLote: string): Promise<void> {
  const usuario = userEvent.setup({ delay: null });
  const linha = screen.getByRole('row', { name: new RegExp(nomeDoLote) });
  await usuario.click(within(linha).getByRole('button', { name: 'Desativar' }));
  const dialogo = await screen.findByRole('dialog');
  await usuario.click(within(dialogo).getByRole('button', { name: 'Desativar lote' }));
}

describe('LotesPage · desativar lote (frente E)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.salvar.mockResolvedValue(undefined);
    mocks.ajustarMutateAsync.mockResolvedValue({});
  });

  it('lote SEM venda: fecha a janela agora e não chama a Function de capacidade', async () => {
    const antes = Date.now();
    renderPage([mkLote({ modalidade: '5k', ordem: 1, vendidos: 0 })]);

    await desativar('Lote 1');

    await waitFor(() => expect(mocks.salvar).toHaveBeenCalledTimes(1));
    const [loteId, payload, criar] = mocks.salvar.mock.calls[0] as [string, Record<string, unknown>, boolean];
    expect(loteId).toBe('5k-lote-1');
    expect(criar).toBe(false);
    // O fim vira AGORA — a venda para no instante do clique.
    expect((payload['fimEm'] as Date).getTime()).toBeGreaterThanOrEqual(antes);
    // E nada mais muda: preço, vaga e ordem seguem como estavam.
    expect(payload['preco']).toBe(75);
    expect(payload['quantidadeLimite']).toBe(300);
    expect(payload['ordem']).toBe(1);
    // O contador de venda nunca viaja (∑ exclusivo da Function de virada).
    expect(payload).not.toHaveProperty('vendidos');
    expect(mocks.ajustarMutateAsync).not.toHaveBeenCalled();
    expect(mocks.remover).not.toHaveBeenCalled();
  });

  it('lote COM venda: capacidade = vendidos pela Function auditada, sem tocar a janela', async () => {
    renderPage([mkLote({ modalidade: '5k', ordem: 1, vendidos: 120, quantidadeLimite: 300 })]);

    await desativar('Lote 1');

    await waitFor(() => expect(mocks.ajustarMutateAsync).toHaveBeenCalledTimes(1));
    const [input] = mocks.ajustarMutateAsync.mock.calls[0] as [Record<string, unknown>];
    expect(input['loteId']).toBe('5k-lote-1');
    // Exatamente o vendido: interrompe a venda sem invalidar UMA inscrição
    // sequer. Abaixo disso a própria RN-304 recusaria — e o produto também não
    // deve tentar.
    expect(input['novaCapacidade']).toBe(120);
    expect(input['motivo']).toMatch(/desativa/i);
    expect(String(input['motivo']).length).toBeGreaterThanOrEqual(3);
    // A janela é campo congelado pela Rule em lote vendido: não é reenviada.
    expect(mocks.salvar).not.toHaveBeenCalled();
    expect(mocks.remover).not.toHaveBeenCalled();
  });

  it('a confirmação diz, na tela, que as inscrições já vendidas continuam valendo', async () => {
    renderPage([mkLote({ modalidade: '5k', ordem: 1, vendidos: 120 })]);
    const usuario = userEvent.setup({ delay: null });
    const linha = screen.getByRole('row', { name: /Lote 1/ });
    await usuario.click(within(linha).getByRole('button', { name: 'Desativar' }));

    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent(/venda deste lote para/i);
    expect(dialogo).toHaveTextContent(/inscri..es j. vendidas continuam v.lidas/i);
    // Lote com venda reabre pela capacidade — o texto não promete a via errada.
    expect(dialogo).toHaveTextContent(/aumentando a capacidade/i);
    // Nada foi gravado só por abrir a confirmação.
    expect(mocks.salvar).not.toHaveBeenCalled();
    expect(mocks.ajustarMutateAsync).not.toHaveBeenCalled();
  });
});
