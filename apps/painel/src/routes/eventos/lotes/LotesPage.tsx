// =============================================================================
// LotesPage — container da rota `/eventos/:slug/lotes` (S300 · E04 · ADR-012).
// Lê os lotes do evento, agrupa por modalidade (LotesView), e orquestra o
// LoteModal (criar/editar) e o ConfirmModal de remoção (§2.15). Escrita via
// useLoteMutations → invalida a chave dos lotes (read-your-writes, ADR-010).
// =============================================================================

import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { ConfirmModal, useToast } from '@leela/design-system';
import type { Lote } from '@leela/core';
import { LotesView } from './LotesView';
import { LoteModal } from './LoteModal';
import { CapacidadeModal } from './CapacidadeModal';
import { useLoteMutations, useLotes } from '../_data/lotes';
import { useAjustarCapacidadeLote } from '../../../lib/query/mutations';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function LotesPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { toast } = useToast();
  const { data: lotes, loading, error } = useLotes(evento.id);
  const { salvar, remover } = useLoteMutations(evento.id);
  const ajustarCapacidade = useAjustarCapacidadeLote(evento.id);

  // Estado do modal de criar/editar.
  const [modalAberto, setModalAberto] = React.useState(false);
  const [modalidadeCtx, setModalidadeCtx] = React.useState<string>('');
  const [loteEmEdicao, setLoteEmEdicao] = React.useState<Lote | null>(null);

  // Estado do modal de capacidade (S307-T2 · reabrir vagas).
  const [loteCapacidade, setLoteCapacidade] = React.useState<Lote | null>(null);

  // Estado do ConfirmModal de remoção.
  const [loteParaRemover, setLoteParaRemover] = React.useState<Lote | null>(null);
  const [removendo, setRemovendo] = React.useState(false);

  const todosLotes = lotes ?? [];

  async function aplicarCapacidade(
    loteId: string,
    novaCapacidade: number,
    motivo: string,
  ): Promise<void> {
    await ajustarCapacidade.mutateAsync({ eventoId: evento.id, loteId, novaCapacidade, motivo });
  }

  function abrirNovo(modalidade: string): void {
    setModalidadeCtx(modalidade);
    setLoteEmEdicao(null);
    setModalAberto(true);
  }

  function abrirEdicao(lote: Lote): void {
    setModalidadeCtx(lote.modalidade);
    setLoteEmEdicao(lote);
    setModalAberto(true);
  }

  async function confirmarRemocao(): Promise<void> {
    if (!loteParaRemover) return;
    setRemovendo(true);
    try {
      await remover(loteParaRemover.id);
      toast({ title: 'Lote removido', variant: 'success' });
      setLoteParaRemover(null);
    } catch {
      toast({ title: 'Falha ao remover o lote', variant: 'danger' });
    } finally {
      setRemovendo(false);
    }
  }

  return (
    <>
      <LotesView
        evento={evento}
        lotes={todosLotes}
        loading={loading}
        error={error}
        onNovoLote={abrirNovo}
        onEditarLote={abrirEdicao}
        onRemoverLote={setLoteParaRemover}
        onAjustarCapacidade={setLoteCapacidade}
      />

      <CapacidadeModal
        open={loteCapacidade !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setLoteCapacidade(null);
        }}
        lote={loteCapacidade}
        onAjustar={aplicarCapacidade}
      />

      <LoteModal
        open={modalAberto}
        onOpenChange={setModalAberto}
        modalidade={modalidadeCtx}
        lote={loteEmEdicao}
        lotesDoEvento={todosLotes}
        onSalvar={salvar}
      />

      <ConfirmModal
        open={loteParaRemover !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setLoteParaRemover(null);
        }}
        title="Remover lote"
        {...(loteParaRemover
          ? { description: `${loteParaRemover.nome} · ${loteParaRemover.modalidade}` }
          : {})}
        loses={['O degrau de preço deste lote sai da modalidade']}
        keeps={['Os demais lotes e as vendas já registradas permanecem']}
        confirmLabel="Remover lote"
        loading={removendo}
        onConfirm={() => void confirmarRemocao()}
      />
    </>
  );
}

LotesPage.displayName = 'LotesPage';
