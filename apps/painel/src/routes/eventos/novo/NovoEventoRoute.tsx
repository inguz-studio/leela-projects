// =============================================================================
// NovoEventoRoute — container de `/eventos/novo`. Liga o form à camada de
// MUTATION (lib/query): o submit passa por `useCriarEvento`, que reusa a Cloud
// Function e INVALIDA a lista do organizador no sucesso (read-your-writes — o
// Hub `/eventos` mostra o rascunho sem refresh). Navega ao Overview do rascunho.
// =============================================================================

import { useNavigate } from 'react-router-dom';
import { getLeelaDb, salvarCapaEvento, uploadCapaEvento } from '@leela/api-client';
import { EventoForm } from './EventoForm';
import { useCriarEvento } from '../../../lib/query/mutations';
import { useTenantSession } from '../../../lib/session/tenantSession';
import type { CriarEventoInput } from '../_data/contracts';

export function NovoEventoRoute(): JSX.Element {
  const navigate = useNavigate();
  const session = useTenantSession();
  const criar = useCriarEvento({
    tenantId: session.tenantId ?? '',
    organizadorId: session.uid ?? '',
  });

  return (
    <EventoForm
      onCriarEvento={(input: CriarEventoInput) => criar.mutateAsync(input)}
      onSuccess={(result) => navigate(`/eventos/${result.slug}`)}
      // Capa deferred (CEV · RN-228): sobe APÓS o criarEvento (Rules exigem o
      // doc existir) e persiste `imagemUrl` por merge cirúrgico (RN-153).
      onUploadCapa={(eventoId, file) => uploadCapaEvento(eventoId, file)}
      onSalvarCapa={(eventoId, imagemUrl) => salvarCapaEvento(getLeelaDb(), eventoId, imagemUrl)}
    />
  );
}

NovoEventoRoute.displayName = 'NovoEventoRoute';
