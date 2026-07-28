// =============================================================================
// InscritoSlideInConnected — container do slide-in rico (S203-T3).
//
// Faz o fetch do bloco `[pag]` (join inscrito → pedido → pagamento, ADR-010)
// via `usePedidoEPagamentoDoInscrito` e injeta o resultado no `InscritoSlideIn`
// presentational. Só dispara a query quando há inscrito selecionado (o hook
// controla `enabled`) — reabrir o painel do mesmo inscrito reidrata do cache.
//
// Estorno (E04/E09 · RN-375): o container detém a mutation e o Toast. Passa
// `onEstornar` ao presentational (que abre o ConfirmModal com o valor da linha
// vindo do backend); o VALOR é decisão do servidor — o cliente só envia o
// motivo. A chamada é `requestRefund`, a máquina COM política: o Toast tem de
// dizer QUAL das três coisas aconteceu — dinheiro devolvido, solicitação
// enviada ao gateway aguardando confirmação (RN-372), ou entrada na fila de
// análise (RN-340). Anunciar "estornado" nos três seria mentira. Erro sobe
// intacto (§2.12).
//
// Container/presentational (Kent C. Dodds): a UI é testável sem QueryClient;
// a integração com o gateway de dados fica isolada aqui.
// =============================================================================

import { useToast } from '@leela/design-system';
import type { RequestRefundResult } from '@leela/api-client';
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

/**
 * Traduz o resultado de `requestRefund` no Toast HONESTO (RN-372/375). Pura —
 * testável sem QueryClient. Três desfechos, três frases diferentes:
 *   - `estornado`: o dinheiro voltou (ou já havia voltado, no replay);
 *   - `aguardandoConfirmacao`: o gateway aceitou e ainda não concluiu — nada
 *     de "estornado" aqui, e nada de convidar a tentar de novo (RN-371);
 *   - `em_analise`: fora da janela, quem decide é o organizador na fila.
 */
export function toastDoResultado(res: RequestRefundResult): {
  variant: 'success' | 'info';
  title: string;
  description: string;
} {
  if (res.aguardandoConfirmacao === true) {
    return {
      variant: 'info',
      title: 'Estorno solicitado ao gateway',
      description:
        'A devolução foi enviada e aguarda a confirmação do gateway. ' +
        'Não é preciso repetir: a inscrição fecha sozinha quando ele confirmar.',
    };
  }
  if (res.estado === 'em_analise') {
    return {
      variant: 'info',
      title: 'Pedido de reembolso em análise',
      description:
        'Fora da janela de arrependimento, a decisão é do organizador — ' +
        'o pedido está na fila de reembolsos do financeiro do evento.',
    };
  }
  if (res.estado === 'estornado') {
    const valor =
      typeof res.valorEstornado === 'number' ? formatDinheiro(res.valorEstornado) : 'o valor';
    return {
      variant: 'success',
      title: res.replay
        ? 'Estorno já havia sido processado'
        : `Estorno de ${valor} concluído`,
      description: 'O valor voltou ao pagador pelo gateway. A vaga não retorna sozinha ao lote.',
    };
  }
  // Estado executável sem confirmação nem conclusão: honestidade acima de
  // otimismo — diz o que se sabe e aponta onde conferir.
  return {
    variant: 'info',
    title: 'Pedido de reembolso registrado',
    description: `Estado atual: ${res.estado}. Acompanhe na fila de reembolsos do evento.`,
  };
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
      toast(toastDoResultado(res));
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
