// =============================================================================
// LotesPage — container da rota `/eventos/:slug/lotes` (S300 · S316-T4 · E04 ·
// ADR-012). A rota e o id da aba NÃO mudam (RN-399); o que a pessoa lê é
// "Modalidades".
//
// Orquestra dois níveis:
//   PAI  — modalidade: acrescentar, renomear e remover pela porta única
//          `editarModalidadesEvento` (RN-500/501/502). Nenhuma escrita direta.
//   FILHO — lote: `LoteModal` (criar/editar), `CapacidadeModal` e os dois
//          `ConfirmModal` de sempre, por escrita direta + Rules. Intocados.
//
// ⛔ A recusa da remoção (RN-502) chega à tela NOMEANDO cada lote, kit e
// campanha que impedem. Ela vive no corpo do `ConfirmModal` de remoção, não num
// toast que some — a pessoa precisa ler os nomes para saber o que apagar. Virar
// "falha ao salvar" aqui recriaria o defeito de endereço da SEAL-LOTES
// (`2a97a592`).
// =============================================================================

import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Alert, ConfirmModal, useToast } from '@leela/design-system';
import { modalidadesEditaveis, type Lote } from '@leela/core';
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
 * Motivo do gesto de remoção. A porta única exige motivo de 3 a 500 caracteres
 * para a trilha (RN-304), e aqui não há campo: pedir uma justificativa escrita
 * dentro de um `ConfirmModal` de duas linhas transformaria um gesto em
 * formulário. O carimbo diz o que foi feito e por qual tela — que é o que a
 * auditoria precisa saber, junto do uid e do de → para que ela já grava.
 */
const MOTIVO_REMOCAO_MODALIDADE = 'Removida pelo organizador na tela de Modalidades do evento.';

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

  // Estado das operações de MODALIDADE (S316-T4).
  const [modalidadeModal, setModalidadeModal] = React.useState<{
    modo: ModoModalidade;
    atual: string;
  } | null>(null);
  const [modalidadeParaRemover, setModalidadeParaRemover] = React.useState<string | null>(null);
  const [removendoModalidade, setRemovendoModalidade] = React.useState(false);
  const [recusaRemocao, setRecusaRemocao] = React.useState<string | null>(null);

  const todosLotes = lotes ?? [];
  // Espelho client-side da fronteira temporal (RN-500 · MODAL-1). `qtdInscritos`
  // conta QUALQUER status, inclusive PIX pendente (RN-487). A Function é a
  // autoridade — isto só evita oferecer o que o servidor vai recusar.
  const podeEditarModalidades = modalidadesEditaveis(evento.qtdInscritos);
  const publicado = evento.status !== 'rascunho';

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
   * Acrescenta ou renomeia pela porta única. O erro NÃO é engolido: sobe para
   * o `ModalidadeModal`, que o ancora no campo com o modal aberto.
   */
  async function confirmarModalidade(nome: string, motivo: string): Promise<void> {
    const modo = modalidadeModal?.modo ?? 'acrescentar';
    if (modo === 'acrescentar') {
      await editarModalidades.mutateAsync({
        eventoId: evento.id,
        operacao: 'acrescentar',
        modalidade: nome,
        motivo,
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
      motivo,
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
   * Remove a modalidade. A recusa (RN-502) fica NO MODAL, com os nomes de quem
   * impede — não vira toast que some antes de a pessoa terminar de ler.
   */
  async function confirmarRemocaoModalidade(motivoDigitado: string): Promise<void> {
    if (!modalidadeParaRemover) return;
    setRemovendoModalidade(true);
    setRecusaRemocao(null);
    // O campo de motivo do `ConfirmModal` é opcional por desenho da peça; a
    // porta única exige de 3 a 500 caracteres para a trilha (RN-304). Quem não
    // escreve nada recebe o carimbo do gesto, que já diz o quê e por qual tela
    // — o uid e o de → para a auditoria grava sozinha.
    const digitado = motivoDigitado.trim();
    const motivo = digitado.length >= 3 ? digitado : MOTIVO_REMOCAO_MODALIDADE;
    try {
      await editarModalidades.mutateAsync({
        eventoId: evento.id,
        operacao: 'remover',
        modalidade: modalidadeParaRemover,
        motivo,
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
        podeEditarModalidades={podeEditarModalidades}
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
        reasonLabel="Motivo (fica no registro do evento)"
        loading={removendoModalidade}
        {...(recusaRemocao
          ? {
              // A recusa NOMEADA da RN-502 ocupa o slot do ALVO, com o diálogo
              // ABERTO: a pessoa precisa ler QUEM impede para saber o que apagar
              // antes de tentar de novo. Num toast ela sumiria antes disso.
              target: (
                <Alert tone="alerta" live="alert" title="Ainda não dá para remover">
                  {recusaRemocao}
                </Alert>
              ),
            }
          : {})}
        onConfirm={(details) => void confirmarRemocaoModalidade(details.reason)}
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
