// =============================================================================
// RepassesPage — container da rota `/eventos/repasses` (E09s-L3). Liga a
// sessão do organizador (tenantId) às leituras do repasse e passa tudo ao
// RepassesView. Enquanto a sessão resolve o claim, os blocos ficam em Skeleton
// (o container marca `loading`); nenhuma soma de dinheiro acontece aqui.
//
// RN-366: o repasse pertence à ORIGEM do dinheiro — hoje eventos, amanhã o
// clube pago com a própria subdivisão, sem herdar nada daqui. O que mudou na
// rodada IA-MENU foi o ENDEREÇO (`/financeiro/repasses` → `/eventos/repasses`);
// RN-334 (saldo único), RN-349 (quebra por evento) e RN-358 (consolidado
// declarado na mesma superfície) seguem vigentes, sem uma vírgula de diferença.
// =============================================================================

import { useCallback } from 'react';
import { useToast } from '@leela/design-system';
import { useTenantSession } from '../../../lib/session/tenantSession';
import { useRequestRepasse } from '../../../lib/query/mutations';
import { useDadosBancarios, useHistoricoRepasses, useSaldoRepasse } from './_data/repasses';
import { useRepassesPorEvento } from './_data/repassesPorEvento';
import { repasseErrorMessage } from './_lib/erros';
import { RepassesView } from './RepassesView';

export function RepassesPage(): JSX.Element {
  const session = useTenantSession();
  const carregandoSessao = session.status === 'loading';
  const tenantId = session.tenantId;
  const { toast } = useToast();

  const saldo = useSaldoRepasse(tenantId);
  const porEvento = useRepassesPorEvento(tenantId, session.uid);
  // Leitura apenas: o SAVE dos dados bancários mudou de casa (RN-366 · IAM-T5
  // → Configurações › Dados de recebimento). Aqui o dado serve ao pré-requisito
  // do saque e ao resumo mascarado dentro do modal.
  const dados = useDadosBancarios(tenantId);
  const historico = useHistoricoRepasses(tenantId);
  const solicitar = useRequestRepasse(tenantId ?? '');

  // Solicita o repasse. O servidor relê os DOIS tetos e é autoritativo
  // (RN-352 tenant + RN-368 evento): failed-precondition ⇒ Toast danger, com a
  // frase que o `repasseErrorMessage` deriva do erro TIPADO — a UI não adivinha
  // o motivo, mas também não esconde o número que o servidor mandou. Sucesso ⇒
  // Toast + o histórico ganha o item em `solicitado` (query invalidada).
  // RN-369: `eventoId` é obrigatório — o servidor valida que o evento é do
  // próprio tenant e grava a associação.
  const onSolicitar = useCallback(
    async (valor: number, eventoId: string): Promise<boolean> => {
      try {
        await solicitar.mutateAsync({ valor, eventoId });
        toast({
          variant: 'success',
          title: 'Repasse solicitado',
          description: 'Acompanhe o status no histórico abaixo.',
        });
        return true;
      } catch (err) {
        toast({
          variant: 'danger',
          title: 'Não foi possível solicitar',
          description: repasseErrorMessage(err, 'solicitacao'),
        });
        return false;
      }
    },
    [solicitar, toast],
  );

  return (
    <RepassesView
      saldo={saldo.data}
      saldoLoading={carregandoSessao || saldo.loading}
      saldoError={saldo.error}
      onRetrySaldo={saldo.refetch}
      porEvento={porEvento.data}
      porEventoLoading={carregandoSessao || porEvento.loading}
      porEventoError={porEvento.error}
      onRetryPorEvento={porEvento.refetch}
      dadosBancarios={dados.data}
      dbLoading={carregandoSessao || dados.loading}
      dbError={dados.error}
      onRetryDb={dados.refetch}
      solicitarRunning={solicitar.isPending}
      onSolicitar={onSolicitar}
      historico={historico.data}
      histLoading={carregandoSessao || historico.loading}
      histError={historico.error}
      onRetryHist={historico.refetch}
    />
  );
}

RepassesPage.displayName = 'RepassesPage';
