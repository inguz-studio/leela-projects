// =============================================================================
// LotesPage — container da rota `/eventos/:slug/lotes` (S300 · S316-T4 · E04 ·
// ADR-012 · RN-578/501/502 — a RN-500 foi revogada pelo dono em 28/08). A rota
// e o id da aba NÃO mudam (RN-399); o que a pessoa lê é "Modalidades".
//
// Orquestra dois níveis:
//   PAI  — modalidade: acrescentar, renomear, remover, INATIVAR, OCULTAR e
//          REATIVAR pela porta única `editarModalidadesEvento` (RN-578).
//          Nenhuma escrita direta. Adicionar é SEMPRE oferecido (a fronteira
//          do evento caiu com a RN-500); renomear/remover são recusados pelo
//          SERVIDOR quando a modalidade já vendeu — a tela espelha com o que
//          conhece (lotes com vendidos/reservas), e a Function é a autoridade.
//   FILHO — lote: `LoteModal` (criar/editar — com a DATA FINAL editável mesmo
//          em lote vendido, RN-579), `CapacidadeModal` e os dois
//          `ConfirmModal` de sempre, por escrita direta + Rules.
//
// ⛔ A recusa da remoção (RN-502/RN-578) chega à tela NOMEANDO quem impede ou
// a venda que protege. Ela vive no corpo do `ConfirmModal`, não num toast que
// some. Virar "falha ao salvar" recriaria o defeito da SEAL-LOTES (`2a97a592`).
//
// MOTIVO (V2708-26, 28/08): a UI NÃO pergunta mais motivo ao organizador. Os
// gestos automatizados continuam carimbando a ORIGEM na trilha (constantes
// abaixo) — informação de graça para a auditoria, zero atrito para a pessoa.
// =============================================================================

import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Alert, ConfirmModal, useToast } from '@leela/design-system';
import { type Lote, type OperacaoModalidade } from '@leela/core';
import { LotesView } from './LotesView';
import { LoteModal } from './LoteModal';
import { CapacidadeModal } from './CapacidadeModal';
import { ModalidadeModal, type ModoModalidade } from './ModalidadeModal';
import {
  MOTIVO_DESATIVACAO_LOTE,
  payloadDesativarPelaJanela,
  viaDesativacao,
} from './_lib/loteForm';
import { consequenciasDeRemover, mensagemErroModalidade } from './_lib/modalidadeForm';
import { useLoteMutations, useLotes } from '../_data/lotes';
import {
  useAjustarCapacidadeLote,
  useEditarModalidadesEvento,
} from '../../../lib/query/mutations';
import type { EventoOutletContext } from '../evento/EventoLayout';

/**
 * Carimbo de origem do gesto de remoção (trilha RN-304). Não é pergunta à
 * pessoa (V2708-26): é o registro de POR QUAL TELA a operação passou.
 */
const MOTIVO_REMOCAO_MODALIDADE = 'Removida pelo organizador na tela de Modalidades do evento.';

/** Rótulo do toast por transição de estado (RN-578). */
const ROTULO_TRANSICAO: Record<'inativar' | 'ocultar' | 'reativar', string> = {
  inativar: 'inativada — novas vendas suspensas; o que já foi vendido continua válido',
  ocultar: 'oculta da página pública; o que já foi vendido continua válido',
  reativar: 'reativada — voltou a ser ofertada',
};

export function LotesPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { toast } = useToast();
  const { data: lotes, loading, error } = useLotes(evento.id);
  const { salvar, remover } = useLoteMutations(evento.id);
  const ajustarCapacidade = useAjustarCapacidadeLote(evento.id);
  const editarModalidades = useEditarModalidadesEvento(evento.id);

  // Estado do modal de criar/editar lote.
  const [modalAberto, setModalAberto] = React.useState(false);
  const [modalidadeCtx, setModalidadeCtx] = React.useState<string>('');
  const [loteEmEdicao, setLoteEmEdicao] = React.useState<Lote | null>(null);

  // Estado do modal de capacidade (S307-T2 · reabrir vagas).
  const [loteCapacidade, setLoteCapacidade] = React.useState<Lote | null>(null);

  // Estado do ConfirmModal de remoção de lote.
  const [loteParaRemover, setLoteParaRemover] = React.useState<Lote | null>(null);
  const [removendo, setRemovendo] = React.useState(false);

  // Estado do ConfirmModal de desativação (frente E — encerrar a venda agora).
  const [loteParaDesativar, setLoteParaDesativar] = React.useState<Lote | null>(null);
  const [desativando, setDesativando] = React.useState(false);

  // Estado das operações de MODALIDADE (S316-T4 · RN-578).
  const [modalidadeModal, setModalidadeModal] = React.useState<{
    modo: ModoModalidade;
    atual: string;
  } | null>(null);
  const [modalidadeParaRemover, setModalidadeParaRemover] = React.useState<string | null>(null);
  const [removendoModalidade, setRemovendoModalidade] = React.useState(false);
  const [recusaRemocao, setRecusaRemocao] = React.useState<string | null>(null);

  const todosLotes = lotes ?? [];
  const publicado = evento.status !== 'rascunho';

  async function aplicarCapacidade(loteId: string, novaCapacidade: number): Promise<void> {
    // V2708-26: sem motivo — a trilha (RN-304) segue com quem/quando/de→para.
    await ajustarCapacidade.mutateAsync({ eventoId: evento.id, loteId, novaCapacidade });
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
   * Acrescenta ou renomeia pela porta única. O erro NÃO é engolido: sobe para
   * o `ModalidadeModal`, que o ancora no campo com o modal aberto.
   */
  async function confirmarModalidade(nome: string): Promise<void> {
    const modo = modalidadeModal?.modo ?? 'acrescentar';
    if (modo === 'acrescentar') {
      await editarModalidades.mutateAsync({
        eventoId: evento.id,
        operacao: 'acrescentar',
        modalidade: nome,
      });
      toast({ title: `Modalidade "${nome}" adicionada`, variant: 'success' });
      return;
    }
    const de = modalidadeModal?.atual ?? '';
    const r = await editarModalidades.mutateAsync({
      eventoId: evento.id,
      operacao: 'renomear',
      modalidade: de,
      novoNome: nome,
    });
    const migrados = r.migracao
      ? `${r.migracao.lotes} lote(s), ${r.migracao.kits} kit(s) e ${r.migracao.campanhas} campanha(s) migraram junto.`
      : undefined;
    toast({
      title: `"${de}" agora é "${nome}"`,
      variant: 'success',
      ...(migrados ? { description: migrados } : {}),
    });
  }

  /**
   * Transição de estado (RN-578): inativar / ocultar / reativar. Sem
   * confirmação — o gesto é reversível por construção (reativar desfaz) e
   * NUNCA toca o que já foi vendido; o toast nomeia o efeito.
   */
  async function transicionarModalidade(
    nome: string,
    operacao: 'inativar' | 'ocultar' | 'reativar',
  ): Promise<void> {
    try {
      await editarModalidades.mutateAsync({
        eventoId: evento.id,
        operacao: operacao as OperacaoModalidade,
        modalidade: nome,
      });
      toast({ title: `"${nome}" ${ROTULO_TRANSICAO[operacao]}`, variant: 'success' });
    } catch (err) {
      toast({
        title: 'Não foi possível mudar o estado da modalidade',
        description: mensagemErroModalidade(err),
        variant: 'danger',
      });
    }
  }

  /**
   * Remove a modalidade. A recusa (RN-502, ou RN-578 quando já vendeu) fica
   * NO MODAL, com os nomes de quem impede — não vira toast que some.
   */
  async function confirmarRemocaoModalidade(): Promise<void> {
    if (!modalidadeParaRemover) return;
    setRemovendoModalidade(true);
    setRecusaRemocao(null);
    try {
      await editarModalidades.mutateAsync({
        eventoId: evento.id,
        operacao: 'remover',
        modalidade: modalidadeParaRemover,
        motivo: MOTIVO_REMOCAO_MODALIDADE,
      });
      toast({ title: `Modalidade "${modalidadeParaRemover}" removida`, variant: 'success' });
      setModalidadeParaRemover(null);
    } catch (err) {
      setRecusaRemocao(mensagemErroModalidade(err));
    } finally {
      setRemovendoModalidade(false);
    }
  }

  /**
   * Desativa o lote: a venda dele para AGORA (frente E). O caminho depende da
   * existência de venda, porque o lote não tem flag `ativo` — sem venda, fecha
   * a janela (`fimEm = agora`); com venda, a porta histórica é a capacidade
   * (RN-304, que carimba a origem na auditoria). Nos dois casos quem já
   * comprou segue comprado: nada aqui escreve em inscrito.
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

  const consequencias = consequenciasDeRemover(
    publicado,
    evento.modalidades.length === 1 && modalidadeParaRemover !== null,
  );

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
        onAdicionarModalidade={() => setModalidadeModal({ modo: 'acrescentar', atual: '' })}
        onRenomearModalidade={(m) => setModalidadeModal({ modo: 'renomear', atual: m })}
        onRemoverModalidade={(m) => {
          setRecusaRemocao(null);
          setModalidadeParaRemover(m);
        }}
        onTransicionarModalidade={(m, op) => void transicionarModalidade(m, op)}
      />

      <ModalidadeModal
        open={modalidadeModal !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setModalidadeModal(null);
        }}
        modo={modalidadeModal?.modo ?? 'acrescentar'}
        modalidades={evento.modalidades}
        modalidadeAtual={modalidadeModal?.atual ?? ''}
        publicado={publicado}
        onConfirmar={confirmarModalidade}
      />

      <ConfirmModal
        open={modalidadeParaRemover !== null}
        onOpenChange={(aberto) => {
          if (!aberto) {
            setModalidadeParaRemover(null);
            setRecusaRemocao(null);
          }
        }}
        title="Remover modalidade"
        {...(modalidadeParaRemover ? { description: modalidadeParaRemover } : {})}
        loses={consequencias.loses}
        keeps={consequencias.keeps}
        confirmLabel="Remover modalidade"
        loading={removendoModalidade}
        {...(recusaRemocao
          ? {
              // A recusa NOMEADA (RN-502/RN-578) ocupa o slot do ALVO, com o
              // diálogo ABERTO: a pessoa precisa ler QUEM impede — ou que a
              // modalidade já vendeu e o caminho é inativar/ocultar. Num toast
              // ela sumiria antes disso.
              target: (
                <Alert tone="alerta" live="alert" title="Ainda não dá para remover">
                  {recusaRemocao}
                </Alert>
              ),
            }
          : {})}
        onConfirm={() => void confirmarRemocaoModalidade()}
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
