// =============================================================================
// KitsCadastroPage — container da rota `/eventos/:slug/kits` (S205-T2).
// Lê kits + catálogo de itens do evento. O modal de item (criar/editar) entra
// em S205-T3 wirado aqui.
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { KitsCadastroView } from './KitsCadastroView';
import { useKits, useItensKit } from '../_data/kits';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function KitsCadastroPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const kits = useKits(evento.id);
  const itens = useItensKit(evento.id);

  return (
    <KitsCadastroView
      slug={evento.slug}
      kits={kits.data ?? []}
      itens={itens.data ?? []}
      loading={kits.loading || itens.loading}
      error={kits.error ?? itens.error}
    />
  );
}

KitsCadastroPage.displayName = 'KitsCadastroPage';
