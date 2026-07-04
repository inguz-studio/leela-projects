// =============================================================================
// MacroDashboardRoute — container de `/plataforma/macro` (S1605-T3). Liga o
// hook de rollups (`platform/rollups`) e delega à MacroDashboard. Linhas da
// tabela navegam para o detalhe do tenant.
// =============================================================================

import { useNavigate } from 'react-router-dom';
import { MacroDashboard } from './MacroDashboard';
import { usePlatformRollups } from '../_data/rollups';

export function MacroDashboardRoute(): JSX.Element {
  const navigate = useNavigate();
  const { data: rollups, loading, error } = usePlatformRollups();

  return (
    <MacroDashboard
      rollups={rollups}
      loading={loading}
      error={error}
      onOpenTenant={(id) => navigate(`/plataforma/tenants/${id}`)}
    />
  );
}

MacroDashboardRoute.displayName = 'MacroDashboardRoute';
