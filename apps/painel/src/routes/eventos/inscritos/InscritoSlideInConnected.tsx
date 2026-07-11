// =============================================================================
// InscritoSlideInConnected — container do slide-in rico (S203-T3).
//
// Faz o fetch do bloco `[pag]` (join inscrito → pedido → pagamento, ADR-010)
// via `usePedidoEPagamentoDoInscrito` e injeta o resultado no `InscritoSlideIn`
// presentational. Só dispara a query quando há inscrito selecionado (o hook
// controla `enabled`) — reabrir o painel do mesmo inscrito reidrata do cache.
//
// Container/presentational (Kent C. Dodds): a UI é testável sem QueryClient;
// a integração com o gateway de dados fica isolada aqui.
// =============================================================================

import type { Inscrito } from '@leela/core';
import { InscritoSlideIn } from './InscritoSlideIn';
import { usePedidoEPagamentoDoInscrito } from '../_data/inscritos';

export interface InscritoSlideInConnectedProps {
  /** Evento dono da inscrição (docId = slug) — chave do join `[pag]`. */
  eventoId: string;
  /** Inscrito em foco; null = painel fechado (query idle). */
  inscrito: Inscrito | null;
  onClose: () => void;
}

export function InscritoSlideInConnected({
  eventoId,
  inscrito,
  onClose,
}: InscritoSlideInConnectedProps): JSX.Element | null {
  const { data, loading, error } = usePedidoEPagamentoDoInscrito(eventoId, inscrito);

  return (
    <InscritoSlideIn
      inscrito={inscrito}
      pedidoEPagamento={data}
      loadingPagamento={loading}
      erroPagamento={error}
      onClose={onClose}
    />
  );
}

InscritoSlideInConnected.displayName = 'InscritoSlideInConnected';
