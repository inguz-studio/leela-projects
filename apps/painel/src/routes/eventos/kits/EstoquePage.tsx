// =============================================================================
// EstoquePage — container `/eventos/:slug/kits/estoque` (S205-T4).
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { EstoqueView } from './EstoqueView';
import { useKits } from '../_data/kits';
import { useTodosInscritos } from '../_data/inscritos';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function EstoquePage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const kits = useKits(evento.id);
  const inscritos = useTodosInscritos(evento.id);

  return (
    <EstoqueView
      kits={kits.data ?? []}
      inscritos={inscritos.data ?? []}
      modalidades={evento.modalidades}
      loading={kits.loading || inscritos.loading}
      error={kits.error ?? inscritos.error}
    />
  );
}

EstoquePage.displayName = 'EstoquePage';
