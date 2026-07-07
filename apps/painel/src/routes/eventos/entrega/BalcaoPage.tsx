// =============================================================================
// BalcaoPage — container da rota `/eventos/:slug/entrega` (S204-T1).
// Pega o evento do Outlet context, carrega o pool de inscritos (busca) e liga
// os callers das Functions de chip/presença.
// =============================================================================

import { useOutletContext } from 'react-router-dom';
import { BalcaoView } from './BalcaoView';
import { useTodosInscritos } from '../_data/inscritos';
import { useItensKit } from '../_data/kits';
import { useBalcaoMutations } from '../_data/balcao';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function BalcaoPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const { data, loading, error } = useTodosInscritos(evento.id);
  // Catálogo de itens do kit (checklist de conferência). Não bloqueia o balcão:
  // a busca/atendimento dependem só dos inscritos; sem itens o checklist some.
  const { data: itens } = useItensKit(evento.id);
  const { vincular, registrar } = useBalcaoMutations(evento.id);

  return (
    <BalcaoView
      evento={evento}
      inscritos={data ?? []}
      itensKit={itens ?? []}
      loading={loading}
      error={error}
      onVincular={vincular}
      onRegistrar={registrar}
    />
  );
}

BalcaoPage.displayName = 'BalcaoPage';
