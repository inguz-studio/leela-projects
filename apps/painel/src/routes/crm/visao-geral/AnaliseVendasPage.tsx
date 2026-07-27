// =============================================================================
// AnaliseVendasPage — container de **CRM › Visão geral**, a rota índice `/crm`
// (RN-823, que supersede a parte da RN-821 que fixava `/financeiro` como
// superfície única de análise). Liga a sessão do organizador (tenantId + uid)
// às leituras da análise e passa tudo ao AnaliseVendasView. O filtro por evento
// (RN-821) vive aqui como estado local: `null` = todos os eventos (agregado do
// tenant); um id recorta os 4 blocos para o `…/current` daquele evento. Nenhuma
// soma pesada no cliente — só leituras de agregado ∑ (§2.12).
//
// A tela mudou de ENDEREÇO, não de comportamento: o move da rodada IA-MENU é
// de navegação. A sessão vem do `useTenantSession` (contrato
// `status`/`uid`/`tenantId`), a implementação única do painel desde
// LEELA-DEBT-T1 — nenhuma cópia nova, nem aqui nem nas outras rotas.
// PII: esta é a camada AGREGADA (RN-820/822, supressão k=5 no cohort). Dividir
// a casca de menu com CRM › Clientes (identidade individual, RN-172) NÃO
// autoriza cruzar as duas camadas.
// =============================================================================

import * as React from 'react';
import type { DateRange } from '@leela/design-system';
import { useTenantSession } from '../../../lib/session/tenantSession';
import {
  useDemografiaAnalise,
  useDesempenhoAnalise,
  useEventosParaFiltro,
  useModalidadesAnalise,
  useTamanhosAnalise,
} from './_data/analise';
import { AnaliseVendasView } from './AnaliseVendasView';

export function AnaliseVendasPage(): JSX.Element {
  const session = useTenantSession();
  const carregandoSessao = session.status === 'loading';

  // Filtro por evento (RN-821): null = todos os eventos (agregado do tenant).
  const [eventoId, setEventoId] = React.useState<string | null>(null);
  // Seleção temporal (RN-821): undefined = todo o período. Os agregados são
  // snapshots (não série datada) — o recorte por data é honesto-inerte por ora
  // (a View declara a lacuna); o estado fica pronto p/ quando houver histórico.
  const [intervalo, setIntervalo] = React.useState<DateRange | undefined>(undefined);

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
      intervalo={intervalo}
      onIntervaloChange={setIntervalo}
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
