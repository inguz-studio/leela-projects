import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    reservas: 0,
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
      onDesativarLote={vi.fn()}
      onAdicionarModalidade={vi.fn()}
      onRenomearModalidade={vi.fn()}
      onRemoverModalidade={vi.fn()}
      podeEditarModalidades
      agora={AGORA}
      {...over}
    />,
  );
}

describe('LotesView', () => {
  it('mostra o preço vigente e o lote ativo derivados do kernel', () => {
    renderView();
    const bloco = screen.getByRole('region', { name: /^Modalidade 5k$/i });
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
    // Ação por ÍCONE (decisão do dono, 17/08): o nome acessível é o rótulo
    // específico da linha, não mais o escrito "Remover".
    const removers = screen.getAllByRole('button', { name: /^Remover lote / });
    // L1 (150/150) e L2 (120/300) vendidos>0 → desabilitados; L3 (0) habilitado.
    const desabilitados = removers.filter((b) => (b as HTMLButtonElement).disabled);
    expect(desabilitados).toHaveLength(2);
  });

  it('modalidade sem lote mostra EmptyState e ainda permite Novo lote', () => {
    renderView({ lotes: [] });
    expect(screen.getByText(/Sem preço configurado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Novo lote/i })).toBeInTheDocument();
  });

  it('estado de carregamento mostra skeleton', () => {
    renderView({ loading: true });
    expect(screen.getByRole('status', { name: /Carregando modalidades/i })).toBeInTheDocument();
  });

  it('bloco de modalidade desenha a superfície pelo Card canônico (família D-1008-R11)', () => {
    renderView();
    const bloco = screen.getByRole('region', { name: /^Modalidade 5k$/i });
    // A receita completa do Card (sob o vidro, o bg cru é filme invisível —
    // ver superficie-cartoes.test.tsx dos kits para a prova na cascata real).
    expect(bloco.className).toContain('bg-card');
    expect(bloco.className).toContain('border-border');
    expect(bloco.className).toContain('shadow-elev-1');
    expect(bloco.className).not.toContain('bg-[var(--surface-raised)]');
  });

  // -------------------------------------------------------------------------
  // Frente D — os três números da vaga, na tabela. Leva 3 do dono
  // (D-1008-R12): a coluna ÚNICA "Vagas (vendidas · disponíveis · total)"
  // virou TRÊS colunas — Vendidos · Disponíveis · Total — por decisão do dono
  // ("simplifique para vendidos, disponiveis e total"). O job continua o
  // mesmo: os três números por lote, sem obrigar a subtração de cabeça.
  // -------------------------------------------------------------------------
  it('mostra Vendidos · Disponíveis · Total em três colunas (D-1008-R12)', () => {
    renderView();
    const bloco = screen.getByRole('region', { name: /^Modalidade 5k$/i });
    expect(within(bloco).getByRole('columnheader', { name: 'Vendidos' })).toBeInTheDocument();
    expect(within(bloco).getByRole('columnheader', { name: 'Disponíveis' })).toBeInTheDocument();
    expect(within(bloco).getByRole('columnheader', { name: 'Total' })).toBeInTheDocument();
    // A coluna única amontoada não volta.
    expect(within(bloco).queryByRole('columnheader', { name: /Vagas \(/ })).not.toBeInTheDocument();
    const linhas = within(bloco).getAllByRole('row');
    // L1 esgotado: 150 vendidas, 0 disponíveis, 150 no total — cada número na
    // SUA célula (índices 3-5: depois de Ordem, Lote, Janela).
    const celulasL1 = within(linhas[1] as HTMLElement).getAllByRole('cell');
    expect(celulasL1[3]).toHaveTextContent('150');
    expect(celulasL1[4]).toHaveTextContent('0');
    expect(celulasL1[5]).toHaveTextContent('150');
    // L2 ativo: 120 de 300 → 180 disponíveis.
    const celulasL2 = within(linhas[2] as HTMLElement).getAllByRole('cell');
    expect(celulasL2[3]).toHaveTextContent('120');
    expect(celulasL2[4]).toHaveTextContent('180');
    expect(celulasL2[5]).toHaveTextContent('300');
  });

  // -------------------------------------------------------------------------
  // Frente E — ação rápida de desativar
  // -------------------------------------------------------------------------
  it('oferece Desativar no lote vigente, mesmo com data e hora dentro da janela', async () => {
    const onDesativarLote = vi.fn();
    renderView({ onDesativarLote });
    const bloco = screen.getByRole('region', { name: /^Modalidade 5k$/i });
    const linhas = within(bloco).getAllByRole('row');
    // L2 é o lote ATIVO no instante de referência (fev–abr, agora = 01/03).
    const desativarL2 = within(linhas[2] as HTMLElement).getByRole('button', {
      name: 'Desativar lote Lote 2 (encerra a venda agora)',
    });
    expect(desativarL2).toBeEnabled();
    await userEvent.click(desativarL2);
    expect(onDesativarLote).toHaveBeenCalledWith(expect.objectContaining({ ordem: 2 }));
  });

  it('não oferece Desativar em lote que já não vende (esgotado ou agendado)', () => {
    renderView();
    const bloco = screen.getByRole('region', { name: /^Modalidade 5k$/i });
    const linhas = within(bloco).getAllByRole('row');
    // L1 esgotado (150/150) e L3 agendado (janela em abril) não têm venda a
    // parar — e o rótulo do ícone DIZ isso (a razão do bloqueio é o nome
    // acessível, o mesmo texto que a dica mostra).
    expect(
      within(linhas[1] as HTMLElement).getByRole('button', {
        name: 'Desativar lote Lote 1 (já não está vendendo)',
      }),
    ).toBeDisabled();
    expect(
      within(linhas[3] as HTMLElement).getByRole('button', {
        name: 'Desativar lote Lote 3 (já não está vendendo)',
      }),
    ).toBeDisabled();
  });
});

// ===========================================================================
// S316-T4 · Modalidade é o pai, lote é o filho (leva 22 do dono, 17/08)
// ===========================================================================

describe('LotesView · a modalidade ganha dono (S316-T4)', () => {
  it('⛔ "Adicionar modalidade" existe no topo — a queixa que o dono repetiu três vezes', async () => {
    const onAdicionarModalidade = vi.fn();
    renderView({ onAdicionarModalidade });
    const botao = screen.getByRole('button', { name: /^Adicionar modalidade$/i });
    await userEvent.click(botao);
    expect(onAdicionarModalidade).toHaveBeenCalledTimes(1);
  });

  it('cada bloco de modalidade oferece renomear e remover', async () => {
    const onRenomearModalidade = vi.fn();
    const onRemoverModalidade = vi.fn();
    renderView({ onRenomearModalidade, onRemoverModalidade });
    await userEvent.click(screen.getByRole('button', { name: 'Renomear a modalidade 5k' }));
    await userEvent.click(screen.getByRole('button', { name: 'Remover a modalidade 5k' }));
    expect(onRenomearModalidade).toHaveBeenCalledWith('5k');
    expect(onRemoverModalidade).toHaveBeenCalledWith('5k');
  });

  it('modalidade sem lote é o CONVITE, não a linha vazia', async () => {
    const onNovoLote = vi.fn();
    renderView({ lotes: [], onNovoLote });
    // O bloco existe (o pai passa a ser desenhado), diz que não há preço, e
    // traz o botão que resolve.
    expect(screen.getByRole('region', { name: /^Modalidade 5k$/i })).toBeInTheDocument();
    expect(screen.getByText(/Sem preço configurado/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Configurar o primeiro lote/i }));
    expect(onNovoLote).toHaveBeenCalledWith('5k');
  });

  it('evento sem modalidade nenhuma convida a criar a primeira, em vez de mandar embora', async () => {
    const onAdicionarModalidade = vi.fn();
    renderView({ evento: mkEvento({ modalidades: [] }), lotes: [], onAdicionarModalidade });
    await userEvent.click(
      screen.getByRole('button', { name: /Adicionar a primeira modalidade/i }),
    );
    expect(onAdicionarModalidade).toHaveBeenCalled();
    // ⛔ O texto que declarava a lacuna morreu no mesmo commit que a fecha.
    expect(screen.queryByText(/o painel ainda não edita essa lista/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/não é editável depois de criado/i)).not.toBeInTheDocument();
  });

  it('⛔ COMPAT: lote cuja modalidade saiu da lista VOLTA a aparecer, marcado', () => {
    // A tela antiga filtrava os lotes por `evento.modalidades` e este lote
    // sumia sem erro e sem aviso, com o preço dele ainda no banco e a Rule
    // `modalidadeExisteNoEventoPai` impedindo qualquer conserto.
    renderView({
      evento: mkEvento({ modalidades: ['5k'] }),
      lotes: [...LOTES_5K, mkLote({ modalidade: '21k', ordem: 1 })],
    });
    const orfa = screen.getByRole('region', { name: /^Modalidade 21k$/i });
    expect(within(orfa).getByText(/Fora da lista do evento/i)).toBeInTheDocument();
    expect(within(orfa).getByText(/nenhuma edição destes lotes é gravada/i)).toBeInTheDocument();
    // O lote órfão está VISÍVEL, com o preço dele.
    expect(within(orfa).getByText('Lote 1')).toBeInTheDocument();
    // Renomear/remover não são oferecidos num nome que não está na lista.
    expect(
      within(orfa).queryByRole('button', { name: 'Renomear a modalidade 21k' }),
    ).not.toBeInTheDocument();
  });

  it('evento COM venda: a lista congela, e a tela DIZ por quê (RN-500 · RN-487)', () => {
    renderView({ podeEditarModalidades: false });
    expect(screen.queryByRole('button', { name: /^Adicionar modalidade$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Renomear a modalidade 5k' })).not.toBeInTheDocument();
    expect(screen.getByText(/inclusive PIX pendente/i)).toBeInTheDocument();
    // E o que continua podendo ser feito segue à mão.
    expect(screen.getByRole('button', { name: /Novo lote/i })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Editar lote / }).length).toBe(3);
  });

  it('⛔ L-021: editar um lote continua custando UM toque, como antes', () => {
    // A régua da leva 22: agrupar por modalidade não pode custar um toque a
    // mais no caminho frequente. O botão de editar segue direto na linha do
    // lote — nada foi colapsado, nada virou acordeão.
    renderView();
    const bloco = screen.getByRole('region', { name: /^Modalidade 5k$/i });
    const linhas = within(bloco).getAllByRole('row');
    const editarL2 = within(linhas[2] as HTMLElement).getByRole('button', {
      name: 'Editar lote Lote 2',
    });
    expect(editarL2).toBeVisible();
    expect(editarL2).toBeEnabled();
  });
});
