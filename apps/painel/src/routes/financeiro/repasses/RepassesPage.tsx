// =============================================================================
// RepassesPage — container da rota `/financeiro/repasses` (E09s-L3). Liga a
// sessão do organizador (tenantId) às leituras do repasse e passa tudo ao
// RepassesView. Enquanto a sessão resolve o claim, os blocos ficam em Skeleton
// (o container marca `loading`); nenhuma soma de dinheiro acontece aqui.
// =============================================================================

import { useCallback } from 'react';
import { useToast } from '@leela/design-system';
import type { SaveDadosBancariosInput } from '@leela/api-client';
import { useFinanceiroSession } from '../_data/session';
import { useRequestRepasse, useSaveDadosBancarios } from '../../../lib/query/mutations';
import { useDadosBancarios, useHistoricoRepasses, useSaldoRepasse } from './_data/repasses';
import { useRepassesPorEvento } from './_data/repassesPorEvento';
import { repasseErrorMessage } from './_lib/erros';
import { RepassesView } from './RepassesView';

export function RepassesPage(): JSX.Element {
  const session = useFinanceiroSession();
  const carregandoSessao = session.status === 'loading';
  const tenantId = session.tenantId;
  const { toast } = useToast();

  const saldo = useSaldoRepasse(tenantId);
  const porEvento = useRepassesPorEvento(tenantId, session.uid);
  const dados = useDadosBancarios(tenantId);
  const historico = useHistoricoRepasses(tenantId);
  const salvarDados = useSaveDadosBancarios(tenantId ?? '');
  const solicitar = useRequestRepasse(tenantId ?? '');

  // Salva os dados bancários; resolve `true` em sucesso (a section sai do modo
  // edição). Sucesso → Toast + read-your-writes (a query invalidada traz o
  // mascarado); falha → o erro fica inline no form (saveError). RN-354: nunca
  // exibimos o número em claro (o callable devolve só o mascarado).
  const onSubmitDados = useCallback(
    async (input: SaveDadosBancariosInput): Promise<boolean> => {
      try {
        await salvarDados.mutateAsync(input);
        toast({
          variant: 'success',
          title: 'Dados bancários salvos',
          description: 'Guardados com segurança — só os dígitos finais ficam visíveis.',
        });
        return true;
      } catch {
        return false;
      }
    },
    [salvarDados, toast],
  );

  // Solicita o repasse. O servidor relê o disponível e é autoritativo (RN-352):
  // failed-precondition ⇒ Toast danger (a UI não adivinha o motivo). Sucesso ⇒
  // Toast + o histórico ganha o item em `solicitado` (query invalidada).
  const onSolicitar = useCallback(
    async (valor: number): Promise<boolean> => {
      try {
        await solicitar.mutateAsync({ valor });
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
      dbSaving={salvarDados.isPending}
      dbSaveError={repasseErrorMessage(salvarDados.error, 'dados') || undefined}
      onSubmitDados={onSubmitDados}
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
