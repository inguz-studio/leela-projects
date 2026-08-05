'use client';

import { XCircle } from 'lucide-react';

/**
 * "Este pedido não foi concluído" — o estado TERMINAL não-pago
 * (REV-S1225 · RN-470).
 *
 * POR QUE ELE EXISTE: a S1225-T3 tratava "não é `pago`" como "está em
 * confirmação". O `status` do pedido tem quatro valores
 * (`packages/core/src/pedidos/pedido.ts`) e TRÊS são terminais — `pago`,
 * `falhou` e `cancelado`. A matriz `TRANSICOES_STATUS_PEDIDO` não deixa
 * `falhou` nem `cancelado` voltarem a `pendente`: são respostas JÁ CONHECIDAS.
 * Dizer "Estamos confirmando o seu pedido" por cima de um deles, e ainda
 * mandar esperar um e-mail com o acesso do ingresso, é a mesma classe de
 * mentira que a S1225 veio matar (a copy do PIX que prometia confirmação
 * automática sem canal que a cumprisse).
 *
 * O critério que isto cumpre é da própria spec da rodada: *"nunca 'Estamos
 * confirmando' sobre uma recusa já conhecida"* — escrito para o cartão e
 * válido, pela mesma razão, para todo estado final.
 *
 * O QUE ELE AFIRMA, e só: que a cobrança não foi confirmada e que este pedido
 * não vale mais. Não afirma que nada saiu da conta de ninguém (uma tentativa
 * de cartão pode ter deixado pré-autorização) e não promete estorno — os dois
 * seriam afirmações que esta tela não tem como sustentar.
 *
 * ACESSIBILIDADE: `role="alert"` — ao contrário da espera (que é `status`
 * polite), um desfecho final que muda o que a pessoa precisa fazer é
 * exatamente o que o canal de alerta existe para anunciar.
 *
 * CONTRASTE: par `feedback-warning-fg` × `feedback-warning-surface` com borda
 * `feedback-warning` — trio auditado na matriz de contraste do DS
 * (`packages/design-system/src/theme/__tests__/contrast.test.ts`), definido
 * nos quatro temas. Não é `danger`: a pessoa não errou nada, e o vermelho
 * desta tela é o canal da recusa do servidor no cartão.
 */
export function AvisoPedidoEncerrado(): React.JSX.Element {
  return (
    <section
      role="alert"
      className="flex items-start gap-3 rounded-ds-lg border border-feedback-warning bg-feedback-warning-surface p-5"
    >
      <XCircle
        size={18}
        strokeWidth={2}
        aria-hidden
        className="mt-1 shrink-0 text-feedback-warning-fg"
      />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-feedback-warning-fg">
          Este pedido não foi concluído
        </h2>
        <p className="text-sm text-feedback-warning-fg">
          A cobrança não foi confirmada e este pedido não vale mais. Nenhum ingresso será
          emitido por ele. Se você ainda quer participar, comece uma nova compra.
        </p>
      </div>
    </section>
  );
}

/**
 * Estados TERMINAIS não-pagos do pedido. Fonte: `TRANSICOES_STATUS_PEDIDO`
 * (core) — `falhou: []` e `cancelado: []`, nenhum dos dois transiciona.
 * Mantido aqui, ao lado da copy que ele governa, para que a próxima pessoa que
 * mexer no estado da tela tropece na regra antes de escrever a frase errada.
 */
export function pedidoEncerradoSemPagamento(status: string | null | undefined): boolean {
  return status === 'falhou' || status === 'cancelado';
}
