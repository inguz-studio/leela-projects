// =============================================================================
// ComunicacaoPage — container da rota `/eventos/:slug/comunicacao` (E06-L3).
//
// Duas superfícies numa aba interna (§2.7): "Campanhas" (as mensagens compostas
// — S401-T2, o que o Organizador cria/dispara) e "Histórico de envios" (o log
// FABLE-G por destinatário, PII mascarada). Campanhas é o default: é o novo JOB
// (avisar sem WhatsApp). O log e o ∑ vêm por TanStack Query (ADR-010); a lista
// de campanhas idem. As ações do popover (editar/duplicar/excluir/cancelar/
// relatório) reusam o CRUD provado do api-client e INVALIDAM a chave da lista
// (read-your-writes). 'enviado'/alcance são da Function — nunca do cliente.
// =============================================================================

import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ConfirmModal, Tabs, useToast, type TabItem } from '@leela/design-system';
import type { Campanha, SegmentoCampanha } from '@leela/core';
import { ComunicacaoView } from './ComunicacaoView';
import { CampanhasList } from './CampanhasList';
import { useComunicacoesDoEvento, useResumoComunicacoes } from '../_data/comunicacoes';
import {
  atualizarCampanhaPadrao,
  criarCampanhaPadrao,
  excluirCampanhaPadrao,
  useCampanhas,
} from '../_data/campanhas';
import type { AcaoCampanhaId } from '../_lib/campanhas';
import { queryKeys } from '../../../lib/query/keys';
import type { EventoOutletContext } from '../evento/EventoLayout';

/** O envio de comunicação/campanha entra pelo editor (flip em E06-D3). */
const PODE_ENVIAR = false;

/** Segmento sem o `tamanhoEstimado` (fotografia do envio) — cópia/edição limpa. */
function segmentoLimpo(segmento: SegmentoCampanha): SegmentoCampanha {
  return segmento.referencia !== undefined
    ? { tipo: segmento.tipo, referencia: segmento.referencia }
    : { tipo: segmento.tipo };
}

export function ComunicacaoPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const resumo = useResumoComunicacoes(evento.id);
  const timeline = useComunicacoesDoEvento(evento.id);
  const campanhas = useCampanhas(evento.id);

  const [aba, setAba] = useState<'campanhas' | 'historico'>('campanhas');
  const [alvoExclusao, setAlvoExclusao] = useState<Campanha | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  const base = `/eventos/${evento.slug}/comunicacao`;

  function invalidarLista(): void {
    void queryClient.invalidateQueries({ queryKey: queryKeys.campanhas.doEvento(evento.id) });
  }

  async function duplicar(c: Campanha): Promise<void> {
    try {
      await criarCampanhaPadrao(evento.id, {
        tenantId: evento.tenantId,
        titulo: c.titulo,
        conteudo: c.conteudo,
        canal: [...c.canal],
        origem: 'manual',
        segmento: segmentoLimpo(c.segmento),
        status: 'rascunho',
        ...(c.capaUrl ? { capaUrl: c.capaUrl } : {}),
      });
      invalidarLista();
      toast({ variant: 'success', title: `Campanha "${c.titulo}" duplicada`, description: 'Rascunho criado.' });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível duplicar a campanha' });
    }
  }

  async function cancelarAgendamento(c: Campanha): Promise<void> {
    try {
      await atualizarCampanhaPadrao(evento.id, c.id, {
        titulo: c.titulo,
        conteudo: c.conteudo,
        canal: [...c.canal],
        origem: 'manual',
        segmento: segmentoLimpo(c.segmento),
        status: 'rascunho',
        ...(c.capaUrl ? { capaUrl: c.capaUrl } : {}),
      });
      invalidarLista();
      toast({ variant: 'success', title: 'Agendamento cancelado', description: 'A campanha voltou a rascunho.' });
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível cancelar o agendamento' });
    }
  }

  async function confirmarExclusao(): Promise<void> {
    if (!alvoExclusao) return;
    setExcluindo(true);
    try {
      await excluirCampanhaPadrao(evento.id, alvoExclusao.id);
      invalidarLista();
      toast({ variant: 'success', title: 'Campanha excluída' });
      setAlvoExclusao(null);
    } catch {
      toast({ variant: 'danger', title: 'Não foi possível excluir a campanha' });
    } finally {
      setExcluindo(false);
    }
  }

  function acao(c: Campanha, tipo: AcaoCampanhaId): void {
    switch (tipo) {
      case 'editar':
        navigate(`${base}/nova?id=${c.id}`);
        return;
      case 'duplicar':
        void duplicar(c);
        return;
      case 'excluir':
        setAlvoExclusao(c);
        return;
      case 'cancelar-agendamento':
        void cancelarAgendamento(c);
        return;
      case 'relatorio':
        setAba('historico');
        return;
    }
  }

  const tabs: TabItem[] = [
    {
      id: 'campanhas',
      label: 'Campanhas',
      content: (
        <CampanhasList
          campanhas={campanhas.data}
          loading={campanhas.loading}
          error={campanhas.error}
          onNova={() => navigate(`${base}/nova`)}
          onAcao={acao}
        />
      ),
    },
    {
      id: 'historico',
      label: 'Histórico de envios',
      content: (
        <ComunicacaoView
          resumo={resumo.data}
          timeline={timeline.data}
          loading={resumo.loading || timeline.loading}
          error={resumo.error ?? timeline.error}
          podeEnviar={PODE_ENVIAR}
        />
      ),
    },
  ];

  return (
    <>
      <Tabs
        tabs={tabs}
        value={aba}
        onValueChange={(id) => setAba(id as 'campanhas' | 'historico')}
        aria-label="Comunicação do evento"
      />

      <ConfirmModal
        open={alvoExclusao !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setAlvoExclusao(null);
        }}
        title="Excluir campanha"
        {...(alvoExclusao ? { description: alvoExclusao.titulo } : {})}
        loses={['O rascunho/agendamento desta campanha']}
        keeps={['As campanhas já enviadas e o histórico de envios']}
        confirmLabel="Excluir campanha"
        loading={excluindo}
        onConfirm={() => void confirmarExclusao()}
      />
    </>
  );
}

ComunicacaoPage.displayName = 'ComunicacaoPage';
