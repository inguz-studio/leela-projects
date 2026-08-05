'use client';

import Link from 'next/link';
import { Button } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import type {
  ConfirmarPagamentoSandboxResult,
  CreateInscricaoChargeResult,
} from '@leela/api-client';
import { Ticket } from './Ticket';
import { PixCobranca, payloadPix } from './PixCobranca';
import { AvisoPedidoEmConfirmacao } from './AvisoPedidoEmConfirmacao';
import {
  AvisoPedidoEncerrado,
  pedidoEncerradoSemPagamento,
} from './AvisoPedidoEncerrado';

/** Metadados por inscrito, na MESMA ordem de `charge.inscritoIds`. */
export interface LinhaConfirmacao {
  titulo: string;
  modalidade: string;
  kitLabel: string;
}

/**
 * Etapa 5 — Confirmação. Mostra o estado real do pedido, resumo, ingresso/QR
 * por inscrito e o aviso de e-mail. Trata o estado "pendente" (PIX ainda não
 * confirmado) com honestidade — nada de "confirmado" fabricado.
 */
export function StepConfirmacao({
  charge,
  confirmacao,
  statusPedidoConsultado,
  eventoNome,
  slug,
  responsavelEmail,
  linhas,
  forma,
  taxaRepassada,
  pixExpirado = false,
  pixVivoPeloServidor = false,
  pixDesvioRelogioMs = 0,
  onPixExpirar,
  onNovaCobranca,
}: {
  charge: CreateInscricaoChargeResult;
  confirmacao: ConfirmarPagamentoSandboxResult | null;
  /**
   * S1225-T3 · RN-469 — o status LIDO do próprio pedido nas Rules. Segunda
   * fonte de verdade para o `pago` desta tela, e a única que existe no PIX
   * real: ali ninguém chama `confirmarPagamentoSandbox` (quem confirma é o
   * webhook do Asaas), então `confirmacao` é `null` e sempre foi.
   */
  statusPedidoConsultado?: string;
  eventoNome: string;
  slug: string;
  responsavelEmail: string;
  linhas: LinhaConfirmacao[];
  /** Forma escolhida — o bloco do PIX só existe quando a cobrança é PIX. */
  forma?: 'pix' | 'cartao_credito';
  /**
   * S1216-T3 (RN-435 · D-ACH-5): `true` = evento com taxa REPASSADA ao
   * comprador. Mesma regra do resumo — a confirmação é a segunda superfície
   * em que o comprador lê a composição do que pagou, e ela não pode contar
   * uma história diferente da que ele leu antes de pagar.
   */
  taxaRepassada: boolean;
  /** RN-157: cobrança já expirada (timer zerou / servidor cancelou). */
  pixExpirado?: boolean;
  /** S1209-REV: o servidor RECUSOU a expiração — a cobrança segue viva. */
  pixVivoPeloServidor?: boolean;
  /**
   * S1209-PIXBE-T5: relógio do servidor − relógio do aparelho, medido na
   * resposta da cobrança. Ancora a contagem no relógio que carimbou a
   * expiração (achado #6 da review). 0 = comportamento vigente.
   */
  pixDesvioRelogioMs?: number;
  /** RN-157: o timer zerou — materializar a expiração no servidor. */
  onPixExpirar?: () => void;
  /** RN-157: recomeçar com uma cobrança NOVA. */
  onNovaCobranca?: () => void;
}): React.JSX.Element {
  // S1225-T3: duas fontes, um estado. A confirmação (cartão e sandbox) e a
  // leitura do próprio pedido (PIX real, RN-469) respondem à MESMA pergunta —
  // e basta uma delas dizer `pago` para a tela parar de esperar.
  const pago = confirmacao?.statusPedido === 'pago' || statusPedidoConsultado === 'pago';
  // REV-S1225 · o terceiro estado, que faltava. "Não pago" não é sinônimo de
  // "em confirmação": `falhou` e `cancelado` são TERMINAIS (a matriz
  // `TRANSICOES_STATUS_PEDIDO` do core não os deixa voltar a `pendente`), e a
  // cobrança EXPIRADA pelo servidor (`pixExpirado`, que só é `true` quando o
  // servidor materializou a expiração — `pixVivoPeloServidor` é o outro ramo)
  // fecha o mesmo caminho. Sobre qualquer um deles, "Estamos confirmando o seu
  // pedido" + "o acesso do ingresso vai por lá" prometem um ingresso que não
  // vem — a mentira que esta rodada existe para matar.
  const encerrado =
    !pago &&
    (pedidoEncerradoSemPagamento(statusPedidoConsultado) ||
      pedidoEncerradoSemPagamento(confirmacao?.statusPedido) ||
      pixExpirado);
  const { valores } = charge;
  // D-6 · RN-157: enquanto o PIX está PENDENTE, o QR e o copia-e-cola valem
  // também AQUI — esta é a "tela do pedido pendente" do checkout. Pedido pago
  // não mostra cobrança: não há mais o que pagar.
  const mostraPix = !pago && forma === 'pix';
  // S1216-T3 · RN-435/RN-437 — a mesma composição do resumo, agora sobre os
  // valores CONGELADOS no pedido. `forma` é opcional aqui (a confirmação
  // sobrevive sem ela): sem meio conhecido, o rótulo volta ao genérico em vez
  // de inventar um. Juros ausente = pedido anterior a esta rodada ⇒ 0.
  const meioDaTaxa = forma === 'cartao_credito' ? 'cartão' : forma === 'pix' ? 'PIX' : null;
  const taxaServico = valores.taxaServico ?? 0;
  const jurosParcelamento = valores.jurosParcelamento ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {/* S1225-T2 · RN-470 — o estado NÃO-FINAL deixa de ser um rótulo
          ("Pagamento pendente") e passa a ser a resposta que o dono pediu:
          a mensagem dele, com a orientação de e-mail junto. O que saiu daqui
          era honesto mas mudo — dizia o estado e não dizia o que fazer com
          ele, e foi essa mudez que o comprador do primeiro PIX real encontrou.
          O CTA "ver meus pedidos" fechou o trio na S1225-T4, dentro do próprio
          `AvisoPedidoEmConfirmacao` — ali ele vive junto da mensagem e da
          orientação, que é como o dono os descreveu.

          O estado PAGO segue sem o CTA, e é escolha: aqui embaixo já vem o
          ingresso com QR por inscrito, e mandar a pessoa para uma lista no
          exato momento em que ela tem o ingresso na tela é tirá-la de onde ela
          queria chegar. Quem entra depois, de outro aparelho, chega pela
          `/minha-conta` — que é o caminho que a S1222-T2 abriu. */}
      {pago ? (
        <section className="rounded-ds-lg border border-border-subtle bg-feedback-success-surface p-5">
          <h2 className="text-lg font-bold text-feedback-success-fg">Inscrição confirmada!</h2>
          <p className="mt-1 text-sm text-text-primary">
            {linhas.length === 1 ? 'Sua vaga está garantida' : 'As vagas estão garantidas'} em{' '}
            {eventoNome}.
          </p>
          <p className="mt-2 font-mono text-xs text-text-tertiary">Pedido {charge.pedidoId}</p>
        </section>
      ) : (
        <div className="flex flex-col gap-2">
          {encerrado ? (
            <AvisoPedidoEncerrado />
          ) : (
            <AvisoPedidoEmConfirmacao email={responsavelEmail} />
          )}
          <p className="font-mono text-xs text-text-tertiary">Pedido {charge.pedidoId}</p>
        </div>
      )}

      {/* PIX pendente: a chave continua à mão (D-6) com a MESMA contagem da
          tela de pagamento — quem fechou o app e voltou paga daqui. */}
      {mostraPix ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-text-primary">Pague com PIX</h3>
          <PixCobranca
            codigo={payloadPix(charge)}
            expiraEmMillis={charge.pixExpiraEmMillis}
            expirado={pixExpirado}
            vivoPeloServidor={pixVivoPeloServidor}
            desvioRelogioMs={pixDesvioRelogioMs}
            onExpirar={onPixExpirar}
            onNovaCobranca={onNovaCobranca}
          />
        </section>
      ) : null}

      {/* Resumo financeiro — valores do resultado da cobrança (core) */}
      <section className="rounded-ds-lg border border-border-subtle bg-surface-raised p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-text-primary">Resumo do pedido</h3>
        <dl className="mt-3 flex flex-col gap-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-text-secondary">Subtotal</dt>
            <dd className="text-text-primary">{formatarPreco(valores.valorBase)}</dd>
          </div>
          {valores.desconto > 0 ? (
            <div className="flex items-center justify-between">
              <dt className="text-text-secondary">Desconto</dt>
              <dd className="text-feedback-success-fg">− {formatarPreco(valores.desconto)}</dd>
            </div>
          ) : null}
          {/* RN-347 + RN-435 (S1216-T3): repassada nomeia o meio e mostra o
              valor; incorporada diz "inclusa no valor" e NUNCA "R$ 0,00" nem
              o valor real (termo comercial do organizador — 703db9c).
              Percentual não aparece em nenhum ramo. */}
          {taxaRepassada ? (
            taxaServico > 0 ? (
              <div className="flex items-center justify-between">
                <dt className="text-text-secondary">
                  {meioDaTaxa !== null ? `Taxa de serviço (${meioDaTaxa})` : 'Taxa de serviço'}
                </dt>
                <dd className="text-text-primary">{formatarPreco(taxaServico)}</dd>
              </div>
            ) : null
          ) : (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-text-secondary">Taxa de serviço</dt>
              <dd className="whitespace-nowrap text-text-secondary">inclusa no valor</dd>
            </div>
          )}
          {/* RN-437: o juro pago aparece com nome próprio também aqui — o que
              o comprador leu antes de pagar é o que ele relê no comprovante. */}
          {jurosParcelamento > 0 ? (
            <div className="flex items-center justify-between">
              <dt className="text-text-secondary">Juros do parcelamento</dt>
              <dd className="text-text-primary">{formatarPreco(jurosParcelamento)}</dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between border-t border-border-subtle pt-2">
            <dt className="font-semibold text-text-primary">
              {valores.parcelas > 1 ? `Total em ${valores.parcelas}x` : 'Total pago'}
            </dt>
            <dd className="text-base font-bold text-text-primary">
              {formatarPreco(valores.totalCobrado)}
            </dd>
          </div>
          {valores.parcelas > 1 ? (
            <p className="text-right text-xs text-text-tertiary">
              {valores.parcelas}x de {formatarPreco(valores.valorParcela)}
            </p>
          ) : null}
        </dl>
      </section>

      {/* Ingressos por inscrito */}
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-text-primary">
          {charge.inscritoIds.length > 1 ? 'Seus ingressos' : 'Seu ingresso'}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {charge.inscritoIds.map((id, i) => {
            const linha = linhas[i];
            return (
              <Ticket
                key={id}
                inscritoId={id}
                titulo={linha?.titulo ?? `Participante ${i + 1}`}
                modalidade={linha?.modalidade ?? '—'}
                kitLabel={linha?.kitLabel ?? 'Sem kit'}
              />
            );
          })}
        </div>
      </section>

      {/* S1225-T2 · RN-470 — o stub que vivia aqui dizia "o envio de e-mail
          ainda não está ativo neste ambiente". Isso deixou de ser verdade
          (`emitirIngressos` + Brevo estão no ar desde a DEPLOY-EMAIL,
          `abf4b794`) e, pior, contradizia frontalmente a orientação que a
          mesma tela agora dá — mandar conferir a caixa de entrada e, dois
          blocos abaixo, avisar que ninguém vai escrever. Uma tela, uma
          história. O aviso de guardar a tela continua, porque o QR aqui é
          verdadeiro e útil, e agora ele é conselho, não substituto do canal. */}
      <p className="text-sm text-text-secondary">
        {responsavelEmail
          ? `O acesso do ingresso vai para ${responsavelEmail}. `
          : 'O acesso do ingresso vai para o e-mail informado na compra. '}
        Guarde também esta tela: cada ingresso tem seu QR de check-in.
      </p>

      <div className="flex flex-wrap gap-3 pt-2">
        <Button asChild variant="secondary">
          <Link href={`/${slug}`}>Voltar ao evento</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">Ver outros eventos</Link>
        </Button>
      </div>
    </div>
  );
}
