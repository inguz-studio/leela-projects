'use client';

import Link from 'next/link';
import { Clock, Loader2, Timer } from 'lucide-react';
import { buttonVariants } from '@leela/design-system/server';
import { cn } from '@/lib/utils';

// =============================================================================
// As telas que o desfecho do pagamento acende (CKPIX-1 · RN-560 e RN-546).
//
// Vivem no mesmo arquivo porque aparecem no mesmo instante e contam a mesma
// história em dois tempos: o que aconteceu, e para onde a pessoa está indo.
// Separá-las convidaria a próxima pessoa a mudar uma frase sem ver a outra — e
// é a soma das duas que o comprador lê.
//
// ⚠️ CANONE-1 (11/08) — *"peça que não existe NASCE no design system,
// documentada e padronizada, antes de ser usada"*. O padrão destes dois blocos
// é AVISO/CALLOUT (ícone + título + corpo, em par de cor semântica), e o design
// system NÃO publica um canônico para ele: o barrel tem 78 componentes e nenhum
// é `Alert`/`Callout`/`Banner`. Este arquivo NÃO inventa um quarto desenho — ele
// repete, linha por linha, a forma dos três avisos que já vivem nesta pasta
// (`AvisoPedidoEncerrado`, `AvisoPedidoEmConfirmacao`, `ProcessandoPagamento`),
// que é a convenção de fato do checkout. O canônico que falta está declarado
// como candidato no handoff da lane e endereçado à Onda 0 Parte B (fundação de
// moldura), que é de quem essa peça é — construí-lo aqui atropelaria aquela lane
// e produziria a quarta forma em vez de uma.
// =============================================================================

/**
 * "Levando você para…" — o loader do redirecionamento (RN-560 · RN-546).
 *
 * VERBATIM DO DONO (11/08): *"cartao aceito, mostra mensagem de sucesso e
 * depois já loader redirecinando para aread o cliente também."* O loader não é
 * enfeite: entre a mensagem e a troca de tela existe um intervalo em que a
 * página some debaixo da pessoa, e sem esta linha o desaparecimento parece
 * defeito.
 *
 * O DESTINO É PARÂMETRO porque os ramos vão para lugares diferentes por decisão
 * do dono — área do cliente nos ramos 1, 2 e 4; página do evento no ramo 5 — e
 * duas cópias deste bloco divergiriam na primeira revisão de copy.
 *
 * O LINK NÃO É REDUNDANTE. Ele é o caminho de quem o temporizador não serve:
 * aba em segundo plano com o timer estrangulado pelo navegador, JavaScript que
 * falhou depois do render, ou a pessoa que simplesmente não quer esperar.
 * Prometer um redirecionamento e não ter para onde clicar quando ele não vem é
 * a classe de tela calada que esta rodada existe para matar.
 *
 * ACESSIBILIDADE: `role="status"` + `aria-live="polite"`. Uma navegação
 * iminente é aviso de cortesia, não emergência — `alert` aqui competiria com o
 * canal de recusa da mesma tela.
 */
export function LevandoParaDestino({
  href,
  frase,
}: {
  /** Para onde a tela está indo — a MESMA rota que o temporizador vai abrir. */
  href: string;
  /** "Levando você para a sua conta…" / "…de volta para o evento…" */
  frase: string;
}): React.JSX.Element {
  return (
    <section
      role="status"
      aria-live="polite"
      data-slot="levando-para-destino"
      className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-surface-raised p-4"
    >
      <div className="flex items-center gap-3">
        <Loader2
          size={18}
          strokeWidth={2}
          aria-hidden
          className="shrink-0 animate-spin text-text-secondary"
        />
        <p className="text-sm font-medium text-text-primary">{frase}</p>
      </div>
      <Link
        href={href}
        data-slot="ir-agora"
        className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }), 'w-fit')}
      >
        Ir agora
      </Link>
    </section>
  );
}

/**
 * "O PIX foi cancelado depois que o prazo venceu" — o ramo 2 do dono (RN-560).
 *
 * VERBATIM (11/08): *"se o pix nao foi pago, ser redirecionado avisando que o
 * pix foi canelado após o prazo evncer, e levar tambem para a area do
 * cliente."*
 *
 * POR QUE ELE NÃO É O `AvisoPedidoEncerrado`. Aquele fala do estado terminal
 * SEM causa apurada e continua valendo onde a causa não é conhecida. Este afirma
 * uma causa — o prazo — e só pode aparecer quando a causa está no doc: motivo
 * `pix_expirado` carimbado pela plataforma, ou `falhou` num PIX, que no mapa de
 * eventos do Asaas só nasce de `PAYMENT_OVERDUE`. A distinção é a diferença
 * entre informar e adivinhar.
 *
 * O QUE ELE AFIRMA, e só: que o prazo venceu, que a cobrança morreu com ele e
 * que nada foi cobrado — esta última é segura aqui, e só aqui, porque PIX
 * vencido é PIX não pago (não existe pré-autorização em PIX, ao contrário do
 * cartão, e é por isso que `AvisoPedidoEncerrado` não pode dizer o mesmo).
 *
 * CONTRASTE: trio `feedback-warning-fg` × `feedback-warning-surface` × borda
 * `feedback-warning` — o mesmo par auditado que o `AvisoPedidoEncerrado` usa, e
 * pela mesma razão: a pessoa não errou nada, e o vermelho desta tela é o canal
 * da recusa do cartão.
 */
export function AvisoPixVencido(): React.JSX.Element {
  return (
    <section
      role="alert"
      data-slot="aviso-pix-vencido"
      className="flex items-start gap-3 rounded-ds-lg border border-feedback-warning bg-feedback-warning-surface p-5"
    >
      <Clock
        size={18}
        strokeWidth={2}
        aria-hidden
        className="mt-1 shrink-0 text-feedback-warning-fg"
      />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-feedback-warning-fg">
          O PIX foi cancelado depois que o prazo venceu
        </h2>
        <p className="text-sm text-feedback-warning-fg">
          O código não foi pago dentro do prazo, então a cobrança foi encerrada e nada foi
          cobrado de você. Sua vaga voltou para o evento. Se você ainda quer participar,
          comece uma nova compra.
        </p>
      </div>
    </section>
  );
}

/**
 * "O tempo do seu checkout acabou" — o ramo 5 (RN-546 · ESTOURO-2).
 *
 * VERBATIM (11/08, leva 7): *"Se expirou os 15 minutos, o pedido nao é mais
 * reservado, e damos um refresh, levanto novamente para a tela de landing
 * page."*
 *
 * POR QUE A COPY NÃO DIZ "PEDIDO CANCELADO". A RN-546 é explícita em que o
 * pedido CONTINUA VIVO: o que venceu foi a RESERVA da vaga, não a cobrança —
 * dinheiro em voo não se toca, e a confirmação atrasada ainda entra (RN-498).
 * Dizer "cancelamos seu pedido" a quem pode ter uma cobrança em processamento
 * seria a mentira mais cara desta tela. Ela fala do que de fato mudou: a vaga
 * voltou para o evento.
 *
 * E a última frase existe por causa desse mesmo risco: se o pagamento entrar
 * depois, a compra aparece na conta da pessoa, e ela precisa saber onde olhar
 * antes de tentar comprar de novo e pagar duas vezes.
 */
export function AvisoReservaExpirada(): React.JSX.Element {
  return (
    <section
      role="alert"
      data-slot="aviso-reserva-expirada"
      className="flex items-start gap-3 rounded-ds-lg border border-feedback-warning bg-feedback-warning-surface p-5"
    >
      <Timer
        size={18}
        strokeWidth={2}
        aria-hidden
        className="mt-1 shrink-0 text-feedback-warning-fg"
      />
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-feedback-warning-fg">
          O tempo do seu checkout acabou
        </h2>
        <p className="text-sm text-feedback-warning-fg">
          O pagamento não foi confirmado dentro do prazo, então sua vaga voltou para o
          evento e ficou livre para outra pessoa. Vamos levar você de volta ao evento para
          começar de novo. Se o pagamento entrar depois, a compra aparece em Minha conta.
        </p>
      </div>
    </section>
  );
}
