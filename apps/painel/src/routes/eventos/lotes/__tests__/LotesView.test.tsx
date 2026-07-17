import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import type { Lote } from '@leela/core';
import { LotesView } from '../LotesView';
import { mkEvento, ts } from '../../_test/fixtures';
import { inputLocalParaDate } from '../_lib/loteForm';

function mkLote(over: Partial<Lote> & { modalidade: string; ordem: number }): Lote {
  const inicioEm = over.inicioEm ?? ts(inputLocalParaDate('2025-12-01T00:00')!);
  const fimEm = over.fimEm ?? ts(inputLocalParaDate('2026-02-01T00:00')!);
  return {
    id: `${over.modalidade}-lote-${over.ordem}`,
    tenantId: 'castelo',
    nome: `Lote ${over.ordem}`,
    quantidadeLimite: 300,
    preco: 60,
    vendidos: 0,
    criadoEm: ts(new Date('2025-11-01T00:00:00Z')),
    atualizadoEm: ts(new Date('2025-11-01T00:00:00Z')),
    ...over,
    inicioEm,
    fimEm,
  };
}

const AGORA = inputLocalParaDate('2026-03-01T00:00')!;

// 5k: L1 esgotado (150/150, dez–fev), L2 ativo (120/300, fev–abr), L3 agendado (0/300, abr–abr).
const LOTES_5K: Lote[] = [
  mkLote({ modalidade: '5k', ordem: 1, preco: 60, quantidadeLimite: 150, vendidos: 150,
    inicioEm: ts(inputLocalParaDate('2025-12-01T00:00')!), fimEm: ts(inputLocalParaDate('2026-02-01T00:00')!) }),
  mkLote({ modalidade: '5k', ordem: 2, preco: 75, quantidadeLimite: 300, vendidos: 120,
    inicioEm: ts(inputLocalParaDate('2026-02-01T00:00')!), fimEm: ts(inputLocalParaDate('2026-04-01T00:00')!) }),
  mkLote({ modalidade: '5k', ordem: 3, preco: 90, quantidadeLimite: 300, vendidos: 0,
    inicioEm: ts(inputLocalParaDate('2026-04-01T00:00')!), fimEm: ts(inputLocalParaDate('2026-04-26T23:59')!) }),
];

function renderView(over: Partial<Parameters<typeof LotesView>[0]> = {}) {
  return render(
    <LotesView
      evento={mkEvento({ modalidades: ['5k'] })}
      lotes={LOTES_5K}
      loading={false}
      error={null}
      onNovoLote={vi.fn()}
      onEditarLote={vi.fn()}
      onRemoverLote={vi.fn()}
      onAjustarCapacidade={vi.fn()}
      agora={AGORA}
      {...over}
    />,
  );
}

describe('LotesView', () => {
  it('mostra o preço vigente e o lote ativo derivados do kernel', () => {
    renderView();
    const bloco = screen.getByRole('region', { name: /Lotes da modalidade 5k/i });
    // Preço vigente = preço do lote ativo (L2 = R$ 75,00) — RN-301. Aparece no
    // resumo da modalidade E na linha do L2 (consistência derivada do kernel).
    expect(within(bloco).getByText(/Preço vigente/i)).toBeInTheDocument();
    expect(within(bloco).getAllByText('R$ 75,00').length).toBeGreaterThanOrEqual(1);
    // Estado por linha (kernel): 1 Ativo, 1 Esgotado, 1 Agendado.
    expect(within(bloco).getByText('Ativo')).toBeInTheDocument();
    expect(within(bloco).getByText('Esgotado')).toBeInTheDocument();
    expect(within(bloco).getByText('Agendado')).toBeInTheDocument();
  });

  it('bloqueia Remover para lotes com venda (RN-200/300)', () => {
    renderView();
    const removers = screen.getAllByRole('button', { name: 'Remover' });
    // L1 (150/150) e L2 (120/300) vendidos>0 → desabilitados; L3 (0) habilitado.
    const desabilitados = removers.filter((b) => (b as HTMLButtonElement).disabled);
    expect(desabilitados).toHaveLength(2);
  });

  it('modalidade sem lote mostra EmptyState e ainda permite Novo lote', () => {
    renderView({ lotes: [] });
    expect(screen.getByText(/Sem lote configurado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Novo lote/i })).toBeInTheDocument();
  });

  it('estado de carregamento mostra skeleton', () => {
    renderView({ loading: true });
    expect(screen.getByRole('status', { name: /Carregando lotes/i })).toBeInTheDocument();
  });
});
