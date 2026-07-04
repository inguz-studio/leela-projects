// =============================================================================
// OverviewPage — container do Overview (rota-índice de `/eventos/:slug`).
// Pega o evento do Outlet context (carregado no EventoLayout), deriva alertas
// e busca a atividade recente (últimos inscritos).
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { OverviewDashboard } from './OverviewDashboard';
import { derivaAlertas } from '../../_lib/alertas';
import { useInscritosRecentes } from '../../_data/eventos';
import type { EventoOutletContext } from '../EventoLayout';

export function OverviewPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { data: recentes, loading } = useInscritosRecentes(evento.id);
  const alertas = derivaAlertas(evento);

  return (
    <OverviewDashboard
      qtdInscritos={evento.qtdInscritos}
      receitaConfirmada={evento.receitaConfirmada}
      alertas={alertas}
      inscritosRecentes={recentes}
      inscritosLoading={loading}
    />
  );
}

OverviewPage.displayName = 'OverviewPage';
