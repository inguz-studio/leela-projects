// =============================================================================
// DistribuicaoPage — container `/eventos/:slug/kits/distribuicao` (S205-T4).
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { DistribuicaoView } from './DistribuicaoView';
import { useTodosInscritos } from '../_data/inscritos';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function DistribuicaoPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { data, loading, error } = useTodosInscritos(evento.id);

  return (
    <DistribuicaoView
      inscritos={data ?? []}
      modalidades={evento.modalidades}
      loading={loading}
      error={error}
    />
  );
}

DistribuicaoPage.displayName = 'DistribuicaoPage';
