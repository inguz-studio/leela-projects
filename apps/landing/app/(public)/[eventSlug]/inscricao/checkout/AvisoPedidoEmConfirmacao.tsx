'use client';

import Link from 'next/link';
import { Mail } from 'lucide-react';
import { buttonVariants } from '@leela/design-system/server';
import { ctaMeusPedidos } from '@/lib/areaDoCliente';
import { cn } from '@/lib/utils';

/**
 * "Estamos confirmando o seu pedido" — a v1 do feedback pós-pagamento
 * (S1225-T2 · RN-470).
 *
 * VERBATIM DO DONO (DEC-0804): *"precisamos dar uma resposta para ele ou em
 * tela, no caso de pix ou em cartao também. Mas de inicio podemos colocar a
 * mensagem 'Estamos confirmando o seu pedido' e abaixo, um CTA para ele
 * visualizar os proprios pedidos dentro do sistema, e uma orientação para
 * confirmar a caixa de e-mail pois enviaremos o acesso do ingresso por lá."*
 *
 * POR QUE UM COMPONENTE, e não a frase repetida em duas telas: os três
 * elementos que o dono fixou aparecem JUNTOS em todo estado não-final, e são
 * dois estados em dois arquivos diferentes (o PIX real, que espera o webhook
 * na tela de pagamento; e o cartão de resposta indeterminada, que chega à tela
 * de confirmação). Duas cópias da mesma frase divergem na primeira revisão de
 * copy — e esta é a frase que o dono escreveu.
 *
 * O CTA "ver meus pedidos" CHEGOU (S1225-T4). Ele esperava a área do cliente
 * (S1222-T2) existir, porque a dependência é dura (`04-fila-codigo.md`):
 * apontar CTA para rota inexistente repetiria o erro que a ordem C1→C2 da fila
 * ADMINSEP já proibiu, trocar tela feia por 404. Quem responde se ele pode
 * aparecer é `ctaMeusPedidos()`, sobre a MESMA trava que decide o destino do
 * `/definir-senha` — uma constante, não três telas opinando.
 *
 * O QUE ESTE BLOCO NUNCA DIZ: que a confirmação chega sozinha nesta tela.
 * Não há `onSnapshot` nem polling no checkout (v2, RN-470), então prometer
 * atualização automática seria a mesma mentira que a copy do PIX contava até
 * a S1225-T2 (`StepPagamento.tsx`, "a confirmação chega sozinha, em segundos").
 * O canal que a plataforma tem é o e-mail, e é dele que a orientação fala.
 *
 * RN-421 / item 60 — isto é AVISO, nunca garantia de emissão: "estamos
 * confirmando" não afirma que o ingresso foi emitido.
 *
 * ACESSIBILIDADE: `role="status"` + `aria-live="polite"`, pelo mesmo motivo
 * documentado em `ProcessandoPagamento` — anunciar uma espera com a urgência
 * de `alert` (o canal de recusa desta tela) treina a pessoa a ignorar os dois.
 *
 * CONTRASTE: par `feedback-info-fg` × `feedback-info-surface` com borda
 * `feedback-info` — os mesmos três tokens já auditados na matriz de contraste
 * do DS e já usados por `ProcessandoPagamento`. Zero cor literal: no tema
 * brasa a família `info` resolve para o rosa heroico, e quem sabe disso é o
 * token, não este arquivo.
 */
export function AvisoPedidoEmConfirmacao({
  email,
  children,
}: {
  /**
   * E-mail da compra. Vazio = não conhecido nesta tela; a orientação continua
   * de pé, só não nomeia a caixa (dizer "confira o e-mail X" com X errado é
   * pior do que não dizer X).
   */
  email?: string;
  /**
   * Conteúdo extra DENTRO do mesmo bloco (S1225-T3) — hoje: a copy de
   * segurança de dinheiro e o botão de retomada do cartão de desfecho
   * desconhecido. Entra como filho, e não como um segundo `<section
   * role="status">` ao lado, porque duas live regions para um estado só
   * anunciam a mesma coisa duas vezes ao leitor de tela e dão dois títulos à
   * mesma história.
   */
  children?: React.ReactNode;
}): React.JSX.Element {
  const cta = ctaMeusPedidos();
  return (
    <section
      role="status"
      aria-live="polite"
      className="flex flex-col gap-3 rounded-ds-lg border border-feedback-info bg-feedback-info-surface p-5"
    >
      <h2 className="text-lg font-bold text-feedback-info-fg">
        Estamos confirmando o seu pedido
      </h2>
      <div className="flex items-start gap-3">
        <Mail
          size={18}
          strokeWidth={2}
          aria-hidden
          className="mt-0.5 shrink-0 text-feedback-info-fg"
        />
        <p className="text-sm text-feedback-info-fg">
          {email !== undefined && email.length > 0 ? (
            <>
              Confira a caixa de entrada de <strong>{email}</strong> — o acesso do seu ingresso
              vai por lá.
            </>
          ) : (
            <>
              Confira a caixa de entrada do e-mail que você informou na compra — o acesso do
              seu ingresso vai por lá.
            </>
          )}{' '}
          Se não encontrar em alguns minutos, olhe também no spam.
        </p>
      </div>
      {/* S1225-T4 · o terceiro elemento que o dono fixou, e o último a chegar:
          "um CTA para ele visualizar os próprios pedidos dentro do sistema".
          Ele esperava a área do cliente (S1222-T2) existir — apontar CTA para
          rota inexistente trocaria tela genérica por 404, e a trava que
          segurava isso é `AREA_CLIENTE_NO_AR`, consultada por
          `ctaMeusPedidos()`. `null` = área fora do ar ⇒ nenhum botão, nunca um
          botão quebrado.

          É um LINK com cara de botão, não um `<button>` com `router.push`: o
          destino é uma rota, e quem quiser abrir em outra aba (para não perder
          o QR do PIX desta tela) precisa do menu de contexto que só um `<a>`
          oferece. */}
      {cta !== null ? (
        <Link
          href={cta.href}
          data-slot="cta-meus-pedidos"
          className={cn(
            buttonVariants({ variant: 'secondary', size: 'sm' }),
            // A cor semântica FICA: este CTA vive dentro do aviso `info` e é
            // a única variante que o `Button` não publica. A pílula é a forma
            // de marketing da landing (ADR-017).
            'w-fit rounded-ds-pill border-feedback-info text-feedback-info-fg',
            'hover:border-feedback-info hover:bg-surface-raised hover:text-feedback-info-fg',
          )}
        >
          {cta.rotulo}
        </Link>
      ) : null}
      {children}
    </section>
  );
}
