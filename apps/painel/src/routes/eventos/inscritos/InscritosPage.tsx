// =============================================================================
// InscritosPage — container da rota `/eventos/:slug/inscritos` (S203-T2).
// Pega o evento do Outlet context e carrega todos os inscritos (cursor 18/pág).
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { InscritosView } from './InscritosView';
import { useTodosInscritos } from '../_data/inscritos';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function InscritosPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { data, loading, error, refetch } = useTodosInscritos(evento.id);

  return (
    <InscritosView
      inscritos={data ?? []}
      loading={loading}
      error={error}
      onRetry={refetch}
      eventoId={evento.id}
      modalidades={evento.modalidades}
    />
  );
}

InscritosPage.displayName = 'InscritosPage';
