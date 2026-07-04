// =============================================================================
// HubRoute — container da tela `/eventos`. Liga o hook de dados à navegação.
// =============================================================================

import { useNavigate } from 'react-router-dom';
import { HubEventos } from './HubEventos';
import { useEventos } from '../_data/eventos';

export function HubRoute(): JSX.Element {
  const navigate = useNavigate();
  const { data, loading, error } = useEventos();

  return (
    <HubEventos
      eventos={data}
      loading={loading}
      error={error}
      onNovoEvento={() => navigate('/eventos/novo')}
      onAbrirEvento={(slug) => navigate(`/eventos/${slug}`)}
    />
  );
}

HubRoute.displayName = 'HubRoute';
