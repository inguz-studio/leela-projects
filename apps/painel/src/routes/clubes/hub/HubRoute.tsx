// =============================================================================
// HubRoute — container da tela `/clubes`. Liga o hook de dados + sessão à
// navegação. A separação Zona A/Zona B usa o uid do profissional logado.
// =============================================================================

import { useNavigate } from 'react-router-dom';
import { HubClubes } from './HubClubes';
import { ClubesAreaNav } from '../_components/ClubesAreaNav';
import { useClubes } from '../_data/clubes';
import { useTenantSession } from '../../../lib/session/tenantSession';

export function HubRoute(): JSX.Element {
  const navigate = useNavigate();
  const { data, loading, error } = useClubes();
  const session = useTenantSession();

  return (
    <HubClubes
      clubes={data}
      loading={loading}
      error={error}
      ownUserId={session.uid}
      onCriarClube={() => navigate('/clubes/novo')}
      onAbrirClube={(slug) => navigate(`/clubes/${slug}`)}
      // D-1008-R9: os acessos secundários da área agora são o menu canônico.
      areaNav={<ClubesAreaNav ativa="clubes" />}
    />
  );
}

HubRoute.displayName = 'HubRoute';
