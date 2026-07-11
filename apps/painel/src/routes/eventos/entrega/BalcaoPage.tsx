// =============================================================================
// BalcaoPage — container da rota `/eventos/:slug/entrega` (S204-T1).
// Pega o evento do Outlet context, carrega o pool de inscritos (busca) e liga
// os callers das Functions de chip/presença.
//
// `?agora=<ISO>` (opcional) fixa o instante de referência do banner de entrega
// para o gate visual ser DETERMINÍSTICO (ex.: forçar "janela ativa" sem esperar
// o horário real). Puramente presentational — não altera dado nem escrita
// (carimbos seguem via Function). Ausente/ inválido → relógio real.
// =============================================================================

import * as React from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { BalcaoView } from './BalcaoView';
import { useTodosInscritos } from '../_data/inscritos';
import { useItensKit } from '../_data/kits';
import { useBalcaoMutations } from '../_data/balcao';
import type { EventoOutletContext } from '../evento/EventoLayout';

export function BalcaoPage(): JSX.Element {
  const { evento } = useOutletContext<EventoOutletContext>();
  const [params] = useSearchParams();
  const agoraParam = params.get('agora');
  const agora = React.useMemo<Date | undefined>(() => {
    if (!agoraParam) return undefined;
    const d = new Date(agoraParam);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }, [agoraParam]);

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
      agora={agora}
    />
  );
}

BalcaoPage.displayName = 'BalcaoPage';
