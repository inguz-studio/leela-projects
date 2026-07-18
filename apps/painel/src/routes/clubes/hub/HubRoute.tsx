// =============================================================================
// HubRoute — container da tela `/clubes`. Liga o hook de dados + sessão à
// navegação. A separação Zona A/Zona B usa o uid do profissional logado.
// =============================================================================

import { useNavigate } from 'react-router-dom';
import { HubClubes } from './HubClubes';
import { useClubes } from '../_data/clubes';
import { useClubesSession } from '../_data/session';

export function HubRoute(): JSX.Element {
  const navigate = useNavigate();
  const { data, loading, error } = useClubes();
  const session = useClubesSession();

  return (
    <HubClubes
      clubes={data}
      loading={loading}
      error={error}
      ownUserId={session.uid}
      onCriarClube={() => navigate('/clubes/novo')}
      onAbrirClube={(slug) => navigate(`/clubes/${slug}`)}
      onAbrirAssessorias={() => navigate('/clubes/assessorias')}
      onAbrirInfluenciadores={() => navigate('/clubes/influenciadores')}
      onAbrirMinhasAfiliacoes={() => navigate('/clubes/minhas-afiliacoes')}
    />
  );
}

HubRoute.displayName = 'HubRoute';
