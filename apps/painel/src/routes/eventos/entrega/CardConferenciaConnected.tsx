// =============================================================================
// CardConferenciaConnected — container do card de conferência do balcão
// (CRED-BUSCA · 17/08). Resolve o join `[pag]` do inscrito em foco e injeta a
// conferência derivada no `CardConferencia` (ADR-010, mesmo desenho do
// `InscritoSlideInConnected`).
//
// POR QUE O JOIN VIVE AQUI E NÃO NA PÁGINA. Ele depende de QUEM o operador
// acabou de escolher, e essa escolha é estado do `AtendimentoPanel`. Subir o
// estado para a `BalcaoPage` mexeria no arranjo de blocos que a onda B da leva
// 22 vai reorganizar em abas — trabalho jogado fora e conflito de merge de
// graça. Os `kits`, que dependem só do evento, seguem carregados na página
// junto com os outros dados, como o `itensKit` já era.
//
// CUSTO: 2 point reads por atendimento, e só quando alguém é escolhido — o
// mesmo contrato do slide-in. A busca não dispara nada: o pool de inscritos já
// está em memória e o filtro é client-side.
//
// ⚠️ ERRO NÃO QUEBRA O BALCÃO. `pedidos`/`pagamentos` exigem `isTenantWriter`
// (`firestore.rules:2739`/`:2599`) e o balcão é servido por papel de EVENTO —
// operador puro recebe negação legítima. O card degrada com a causa escrita, o
// check-in segue funcionando, e nada disso vira toast de erro: a pessoa está na
// frente do operador e a fila não pode parar por um campo de contato.
// =============================================================================

import * as React from 'react';
import type { Inscrito, Kit } from '@leela/core';
import { usePedidoEPagamentoDoInscrito } from '../_data/inscritos';
import { conferenciaDoInscrito, estadoDaCompra } from '../_lib/conferenciaBalcao';
import { CardConferencia } from './CardConferencia';

export interface CardConferenciaConnectedProps {
  eventoId: string;
  /** Participante escolhido na busca — o card só existe depois da escolha. */
  inscrito: Inscrito;
  /** Kits do evento (carregados na página) — acha o cobrado por `kitId`. */
  kits: readonly Kit[];
}

export function CardConferenciaConnected({
  eventoId,
  inscrito,
  kits,
}: CardConferenciaConnectedProps): JSX.Element {
  const { data, loading, error } = usePedidoEPagamentoDoInscrito(eventoId, inscrito);

  const pedido = data?.pedido ?? null;
  const pagamento = data?.pagamento ?? null;

  const conferencia = React.useMemo(
    () => conferenciaDoInscrito({ inscrito, kits, pedido, pagamento }),
    [inscrito, kits, pedido, pagamento],
  );

  return (
    <CardConferencia
      conferencia={conferencia}
      kit={inscrito.kit}
      estadoCompra={estadoDaCompra(loading, error, pedido)}
    />
  );
}

CardConferenciaConnected.displayName = 'CardConferenciaConnected';
