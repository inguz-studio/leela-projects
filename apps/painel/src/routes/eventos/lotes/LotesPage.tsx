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
import {
  MOTIVO_DESATIVACAO_LOTE,
  payloadDesativarPelaJanela,
  viaDesativacao,
} from './_lib/loteForm';
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

  // Estado do ConfirmModal de desativação (frente E — encerrar a venda agora).
  const [loteParaDesativar, setLoteParaDesativar] = React.useState<Lote | null>(null);
  const [desativando, setDesativando] = React.useState(false);

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

  /**
   * Desativa o lote: a venda dele para AGORA (frente E). O caminho depende da
   * existência de venda, porque o lote não tem flag `ativo` — sem venda, fecha
   * a janela (`fimEm = agora`); com venda, a janela está congelada pela Rule e
   * a porta autorizada é a capacidade (RN-304, `ajustarCapacidadeLote`, que
   * carimba o motivo na auditoria). Nos dois casos quem já comprou segue
   * comprado: nada aqui escreve em inscrito.
   */
  async function confirmarDesativacao(): Promise<void> {
    if (!loteParaDesativar) return;
    const alvo = loteParaDesativar;
    setDesativando(true);
    try {
      if (viaDesativacao(alvo) === 'capacidade') {
        await ajustarCapacidade.mutateAsync({
          eventoId: evento.id,
          loteId: alvo.id,
          novaCapacidade: alvo.vendidos,
          motivo: MOTIVO_DESATIVACAO_LOTE,
        });
      } else {
        await salvar(alvo.id, payloadDesativarPelaJanela(alvo, new Date()), false);
      }
      toast({ title: 'Lote desativado', variant: 'success' });
      setLoteParaDesativar(null);
    } catch {
      toast({
        title: 'Não foi possível desativar o lote',
        description: 'Tente de novo; se persistir, ajuste a capacidade ou a janela na edição.',
        variant: 'danger',
      });
    } finally {
      setDesativando(false);
    }
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
        onDesativarLote={setLoteParaDesativar}
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
        onAjustarCapacidade={(lote) => {
          // Lote com venda: a vaga só se ajusta pela porta auditada (RN-304).
          // O modal de edição fecha para não empilhar dois diálogos.
          setModalAberto(false);
          setLoteCapacidade(lote);
        }}
      />

      <ConfirmModal
        open={loteParaDesativar !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setLoteParaDesativar(null);
        }}
        title="Desativar lote"
        {...(loteParaDesativar
          ? {
              description:
                `${loteParaDesativar.nome} · ${loteParaDesativar.modalidade} — a venda deste lote para agora, ` +
                'mesmo com a janela ainda vigente.',
            }
          : {})}
        loses={[
          'A venda deste lote para imediatamente',
          'Se houver lote seguinte na modalidade, ele assume o preço vigente',
        ]}
        keeps={[
          'As inscrições já vendidas continuam válidas',
          viaDesativacao(loteParaDesativar ?? { vendidos: 0 }) === 'capacidade'
            ? 'Dá para reabrir depois aumentando a capacidade do lote'
            : 'Dá para reabrir depois editando o fim da janela',
        ]}
        confirmLabel="Desativar lote"
        loading={desativando}
        onConfirm={() => void confirmarDesativacao()}
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
