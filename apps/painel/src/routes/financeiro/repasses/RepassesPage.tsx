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
import { useSaveDadosBancarios } from '../../../lib/query/mutations';
import { useDadosBancarios, useSaldoRepasse } from './_data/repasses';
import { repasseErrorMessage } from './_lib/erros';
import { RepassesView } from './RepassesView';

export function RepassesPage(): JSX.Element {
  const session = useFinanceiroSession();
  const carregandoSessao = session.status === 'loading';
  const tenantId = session.tenantId;
  const { toast } = useToast();

  const saldo = useSaldoRepasse(tenantId);
  const dados = useDadosBancarios(tenantId);
  const salvarDados = useSaveDadosBancarios(tenantId ?? '');

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

  return (
    <RepassesView
      saldo={saldo.data}
      saldoLoading={carregandoSessao || saldo.loading}
      saldoError={saldo.error}
      onRetrySaldo={saldo.refetch}
      dadosBancarios={dados.data}
      dbLoading={carregandoSessao || dados.loading}
      dbError={dados.error}
      onRetryDb={dados.refetch}
      dbSaving={salvarDados.isPending}
      dbSaveError={repasseErrorMessage(salvarDados.error, 'dados') || undefined}
      onSubmitDados={onSubmitDados}
    />
  );
}

RepassesPage.displayName = 'RepassesPage';
