// =============================================================================
// ReembolsosPage — container da rota
// `/eventos/:slug/financeiro/reembolsos` (S904-T5). Lê a fila de reembolsos + o
// registro de transferências (2 queries) e orquestra a DECISÃO do organizador
// (aprovar/recusar) via ConfirmModal §2.15 → `useDecideRefund` (callable). O
// VALOR estornado é decisão do servidor (RN-337): a UI nunca o envia. Aprovar
// dispara a execução do estorno (reusa FABLE-B); recusar é terminal. Motivo
// opcional entra na trilha. Read-your-writes: a decisão invalida a fila +
// financeiro/current + inscritos (ADR-010).
// =============================================================================

import * as React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ConfirmModal, useToast } from '@leela/design-system';
import type { Reembolso } from '@leela/core';
import {
  reembolsosDoEventoQuery,
  transferenciasDoEventoQuery,
} from '../../../lib/query/queries';
import { useDecideRefund } from '../../../lib/query/mutations';
import { ReembolsosView } from './ReembolsosView';
import type { EventoOutletContext } from '../evento/EventoLayout';

interface Pendente {
  reembolso: Reembolso;
  decisao: 'aprovar' | 'recusar';
}

export function ReembolsosPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { toast } = useToast();
  const reembolsos = useQuery(reembolsosDoEventoQuery(evento.id));
  const transferencias = useQuery(transferenciasDoEventoQuery(evento.id));
  const decidir = useDecideRefund(evento.id);

  const [pendente, setPendente] = React.useState<Pendente | null>(null);

  function abrirDecisao(reembolso: Reembolso, decisao: 'aprovar' | 'recusar'): void {
    setPendente({ reembolso, decisao });
  }

  function confirmar(reason: string): void {
    if (!pendente) return;
    const motivo = reason.trim();
    decidir.mutate(
      {
        eventoId: evento.id,
        inscritoId: pendente.reembolso.inscritoId,
        decisao: pendente.decisao,
        ...(motivo.length > 0 ? { motivo } : {}),
      },
      {
        onSuccess: () => {
          toast({
            variant: 'success',
            title: pendente.decisao === 'aprovar' ? 'Reembolso aprovado' : 'Reembolso recusado',
          });
          setPendente(null);
        },
        onError: () => {
          toast({
            variant: 'danger',
            title: 'Não foi possível decidir',
            description: 'A decisão é do organizador/dono da conta e segue a máquina de estados.',
          });
        },
      },
    );
  }

  const aprovar = pendente?.decisao === 'aprovar';

  return (
    <>
      <ReembolsosView
        reembolsos={reembolsos.data ?? []}
        transferencias={transferencias.data ?? []}
        loading={reembolsos.isPending || transferencias.isPending}
        error={reembolsos.error ?? transferencias.error ?? null}
        onDecidir={abrirDecisao}
        decidindo={decidir.isPending}
      />

      <ConfirmModal
        open={pendente !== null}
        onOpenChange={(aberto) => {
          if (!aberto && !decidir.isPending) setPendente(null);
        }}
        title={aprovar ? 'Aprovar reembolso' : 'Recusar reembolso'}
        {...(pendente
          ? { description: `Inscrição ${pendente.reembolso.inscritoId} · valor definido pelo sistema` }
          : {})}
        loses={
          aprovar
            ? ['A receita desta inscrição é revertida quando o estorno executa']
            : ['A solicitação é encerrada sem devolução ao inscrito']
        }
        keeps={
          aprovar
            ? ['A auditoria registra quem aprovou e quando']
            : ['A inscrição permanece confirmada']
        }
        reasonLabel="Motivo da decisão (opcional)"
        confirmLabel={aprovar ? 'Aprovar e estornar' : 'Recusar reembolso'}
        loading={decidir.isPending}
        onConfirm={({ reason }) => confirmar(reason)}
      />
    </>
  );
}

ReembolsosPage.displayName = 'ReembolsosPage';
