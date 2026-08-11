// =============================================================================
// HubRoute — container da tela `/clubes`. Liga o hook de dados + sessão à
// navegação. A separação Zona A/Zona B usa o uid do profissional logado.
// =============================================================================

import { useNavigate } from 'react-router-dom';
import { HubClubes } from './HubClubes';
import { useClubes } from '../_data/clubes';
import { useTenantSession } from '../../../lib/session/tenantSession';

export function HubRoute(): JSX.Element {
  const navigate = useNavigate();
  const { data, loading, error } = useClubes();
  const session = useTenantSession();

  // D-1008-R16: o menu secundário da área saiu daqui — quem o desenha é o
  // ClubesAreaLayout (moldura), para nenhuma aba da área nascer órfã.
  return (
    <HubClubes
      clubes={data}
      loading={loading}
      error={error}
      ownUserId={session.uid}
      onCriarClube={() => navigate('/clubes/novo')}
      onAbrirClube={(slug) => navigate(`/clubes/${slug}`)}
    />
  );
}

HubRoute.displayName = 'HubRoute';
