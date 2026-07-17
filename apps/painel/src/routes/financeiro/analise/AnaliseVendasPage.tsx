// =============================================================================
// AnaliseVendasPage — container da rota índice `/financeiro` (RN-820). Liga a
// sessão do organizador (tenantId + uid) às leituras da análise e passa tudo ao
// AnaliseVendasView. O desempenho (getOverview) é callable server-side e não
// depende do claim; modalidades/tamanhos dependem do tenant/organizador —
// enquanto a sessão resolve, ficam em Skeleton. Nenhuma soma pesada no cliente.
// =============================================================================

import { useFinanceiroSession } from '../_data/session';
import {
  useDemografiaTenant,
  useDesempenhoVendas,
  useModalidadesTenant,
  useTamanhosTenant,
} from './_data/analise';
import { AnaliseVendasView } from './AnaliseVendasView';

export function AnaliseVendasPage(): JSX.Element {
  const session = useFinanceiroSession();
  const carregandoSessao = session.status === 'loading';

  const desempenho = useDesempenhoVendas();
  const demografia = useDemografiaTenant(session.tenantId, session.uid);
  const modalidades = useModalidadesTenant(session.tenantId, session.uid);
  const tamanhos = useTamanhosTenant(session.tenantId, session.uid);

  return (
    <AnaliseVendasView
      desempenho={desempenho.data}
      desempenhoLoading={desempenho.loading}
      desempenhoError={desempenho.error}
      onRetryDesempenho={desempenho.refetch}
      demografia={demografia.data}
      demografiaLoading={carregandoSessao || demografia.loading}
      demografiaError={demografia.error}
      onRetryDemografia={demografia.refetch}
      modalidades={modalidades.data}
      modalidadesLoading={carregandoSessao || modalidades.loading}
      modalidadesError={modalidades.error}
      onRetryModalidades={modalidades.refetch}
      tamanhos={tamanhos.data}
      tamanhosLoading={carregandoSessao || tamanhos.loading}
      tamanhosError={tamanhos.error}
      onRetryTamanhos={tamanhos.refetch}
    />
  );
}

AnaliseVendasPage.displayName = 'AnaliseVendasPage';
