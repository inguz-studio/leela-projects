// =============================================================================
// NovoEventoRoute — container de `/eventos/novo`. Liga o form à camada de
// MUTATION (lib/query): o submit passa por `useCriarEvento`, que reusa a Cloud
// Function e INVALIDA a lista do organizador no sucesso (read-your-writes — o
// Hub `/eventos` mostra o rascunho sem refresh). Navega ao Overview do rascunho.
// =============================================================================

import { useNavigate } from 'react-router-dom';
import { EventoForm } from './EventoForm';
import { useCriarEvento } from '../../../lib/query/mutations';
import { useEventosSession } from '../_data/session';
import type { CriarEventoInput } from '../_data/contracts';

export function NovoEventoRoute(): JSX.Element {
  const navigate = useNavigate();
  const session = useEventosSession();
  const criar = useCriarEvento({
    tenantId: session.tenantId ?? '',
    organizadorId: session.uid ?? '',
  });

  return (
    <EventoForm
      onCriarEvento={(input: CriarEventoInput) => criar.mutateAsync(input)}
      onSuccess={(result) => navigate(`/eventos/${result.slug}`)}
    />
  );
}

NovoEventoRoute.displayName = 'NovoEventoRoute';
