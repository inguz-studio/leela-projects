// =============================================================================
// RepassesPage — container da rota `/financeiro/repasses` (E09s-L3). Liga a
// sessão do organizador (tenantId) às leituras do repasse e passa tudo ao
// RepassesView. Enquanto a sessão resolve o claim, os blocos ficam em Skeleton
// (o container marca `loading`); nenhuma soma de dinheiro acontece aqui.
// =============================================================================

import { useFinanceiroSession } from '../_data/session';
import { useSaldoRepasse } from './_data/repasses';
import { RepassesView } from './RepassesView';

export function RepassesPage(): JSX.Element {
  const session = useFinanceiroSession();
  const carregandoSessao = session.status === 'loading';

  const saldo = useSaldoRepasse(session.tenantId);

  return (
    <RepassesView
      saldo={saldo.data}
      saldoLoading={carregandoSessao || saldo.loading}
      saldoError={saldo.error}
      onRetrySaldo={saldo.refetch}
    />
  );
}

RepassesPage.displayName = 'RepassesPage';
