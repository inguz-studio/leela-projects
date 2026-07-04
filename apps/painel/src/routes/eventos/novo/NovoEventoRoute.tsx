// =============================================================================
// NovoEventoRoute — container de `/eventos/novo`. Injeta a porta criarEvento
// (default L2-pendente) e navega ao Overview do rascunho após criar.
// =============================================================================

import { useNavigate } from 'react-router-dom';
import { EventoForm } from './EventoForm';
import { criarEventoPadrao } from '../_data/criarEvento';

export function NovoEventoRoute(): JSX.Element {
  const navigate = useNavigate();
  return (
    <EventoForm
      onCriarEvento={criarEventoPadrao}
      onSuccess={(result) => navigate(`/eventos/${result.slug}`)}
    />
  );
}

NovoEventoRoute.displayName = 'NovoEventoRoute';
