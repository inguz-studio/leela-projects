// =============================================================================
// AnaliseVendasPage — container da rota índice `/financeiro` (RN-820/RN-821).
// Liga a sessão do organizador (tenantId + uid) às leituras da análise e passa
// tudo ao AnaliseVendasView. O filtro por evento (RN-821) vive aqui como estado
// local: `null` = todos os eventos (agregado do tenant); um id recorta os 4
// blocos para o `…/current` daquele evento. Nenhuma soma pesada no cliente —
// só leituras de agregado ∑ (§2.12).
// =============================================================================

import * as React from 'react';
import { useFinanceiroSession } from '../_data/session';
import {
  useDemografiaAnalise,
  useDesempenhoAnalise,
  useEventosParaFiltro,
  useModalidadesAnalise,
  useTamanhosAnalise,
} from './_data/analise';
import { AnaliseVendasView } from './AnaliseVendasView';

export function AnaliseVendasPage(): JSX.Element {
  const session = useFinanceiroSession();
  const carregandoSessao = session.status === 'loading';

  // Filtro por evento (RN-821): null = todos os eventos (agregado do tenant).
  const [eventoId, setEventoId] = React.useState<string | null>(null);

  const eventos = useEventosParaFiltro(session.tenantId, session.uid);
  const desempenho = useDesempenhoAnalise(eventoId);
  const demografia = useDemografiaAnalise(session.tenantId, session.uid, eventoId);
  const modalidades = useModalidadesAnalise(session.tenantId, session.uid, eventoId);
  const tamanhos = useTamanhosAnalise(session.tenantId, session.uid, eventoId);

  return (
    <AnaliseVendasView
      eventos={eventos.data}
      eventosLoading={carregandoSessao || eventos.loading}
      eventoSelecionado={eventoId}
      onEventoChange={setEventoId}
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
