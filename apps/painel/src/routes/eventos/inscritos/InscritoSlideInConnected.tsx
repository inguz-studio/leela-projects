// =============================================================================
// InscritoSlideInConnected — container do slide-in rico (S203-T3).
//
// Faz o fetch do bloco `[pag]` (join inscrito → pedido → pagamento, ADR-010)
// via `usePedidoEPagamentoDoInscrito` e injeta o resultado no `InscritoSlideIn`
// presentational. Só dispara a query quando há inscrito selecionado (o hook
// controla `enabled`) — reabrir o painel do mesmo inscrito reidrata do cache.
//
// Estorno (E04 · FABLE-B): o container detém a mutation e o Toast. Passa
// `onEstornar` ao presentational (que abre o ConfirmModal com o valor do
// backend); o VALOR é decisão do servidor — o cliente só envia o motivo. O
// callable é idempotente (saga do FABLE-B); o resultado (valorEstornado,
// duplicado, integral) alimenta um Toast honesto. Erro sobe intacto (§2.12).
//
// Container/presentational (Kent C. Dodds): a UI é testável sem QueryClient;
// a integração com o gateway de dados fica isolada aqui.
// =============================================================================

import { useToast } from '@leela/design-system';
import type { Inscrito } from '@leela/core';
import { InscritoSlideIn } from './InscritoSlideIn';
import { usePedidoEPagamentoDoInscrito } from '../_data/inscritos';
import { useEstornarInscrito } from '../../../lib/query/mutations';
import { formatDinheiro } from '../_lib/format';

export interface InscritoSlideInConnectedProps {
  /** Evento dono da inscrição (docId = slug) — chave do join `[pag]`. */
  eventoId: string;
  /** Inscrito em foco; null = painel fechado (query idle). */
  inscrito: Inscrito | null;
  onClose: () => void;
}

/**
 * Mensagem do erro do callable, exibida COMO VEM (§2.12) — as guardas do
 * FABLE-B já retornam textos orientados ao organizador (ex.: "Pagamento já
 * integralmente estornado…"). Fallback só quando o erro não traz mensagem.
 */
function mensagemErroEstorno(err: unknown): string {
  if (typeof err === 'object' && err !== null) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === 'string' && msg.trim().length > 0) return msg;
  }
  return 'Tente novamente em instantes.';
}

export function InscritoSlideInConnected({
  eventoId,
  inscrito,
  onClose,
}: InscritoSlideInConnectedProps): JSX.Element | null {
  const { data, loading, error } = usePedidoEPagamentoDoInscrito(eventoId, inscrito);
  const { toast } = useToast();
  const estornoMutation = useEstornarInscrito(eventoId);

  async function estornar(motivo: string): Promise<void> {
    const pedidoId = data?.pedido?.id;
    // O pedido do inscrito precisa estar carregado (o slide-in só oferece a
    // ação quando o bloco [pag] tem pedido pago) — guarda defensiva.
    if (!pedidoId || !inscrito) return;
    try {
      const res = await estornoMutation.mutateAsync({
        pedidoId,
        inscritoId: inscrito.id,
        motivo,
      });
      toast({
        variant: 'success',
        title: res.duplicado
          ? 'Estorno já havia sido processado'
          : `Estorno de ${formatDinheiro(res.valorEstornado)} enviado`,
        description: res.pagamentoEstornadoIntegral
          ? 'Pagamento integralmente estornado.'
          : 'O valor volta ao pagador pelo gateway.',
      });
    } catch (err) {
      toast({
        variant: 'danger',
        title: 'Não foi possível estornar',
        description: mensagemErroEstorno(err),
      });
      throw err; // mantém o ConfirmModal aberto para nova tentativa
    }
  }

  return (
    <InscritoSlideIn
      inscrito={inscrito}
      pedidoEPagamento={data}
      loadingPagamento={loading}
      erroPagamento={error}
      onClose={onClose}
      onEstornar={estornar}
      estornando={estornoMutation.isPending}
    />
  );
}

InscritoSlideInConnected.displayName = 'InscritoSlideInConnected';
