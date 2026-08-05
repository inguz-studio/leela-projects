'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/app/_ds/ds';
import { formatarPreco } from '@/lib/formato';
import type { CreateInscricaoChargeResult } from '@leela/api-client';
import type { FormaUI } from './tipos';
import { PixCobranca, payloadPix } from './PixCobranca';
import { ProcessandoPagamento } from './ProcessandoPagamento';
import { AvisoPedidoEmConfirmacao } from './AvisoPedidoEmConfirmacao';

export interface CartaoForm {
  nome: string;
  numero: string;
  validade: string;
  cvv: string;
}

/**
 * Etapa 4 — Pagamento. Chama `createInscricaoCharge` (produtor de escrita) e
 * mostra o instrumento: PIX exibe o QR/copia-e-cola; cartão coleta os campos.
 *
 * DOIS MUNDOS desde a PIXREAL-FIX (T3): contra o MockPaymentProvider a
 * confirmação é um disparo de webhook assinado que a própria tela oferece;
 * contra o gateway REAL quem confirma é o webhook do Asaas, e a tela não
 * oferece ato nenhum de confirmação. Qual dos dois vale não é palpite do
 * cliente — vem do campo `gatewayReal` da cobrança (ver `gatewaySimulado`
 * abaixo).
 *
 * Idempotência VISÍVEL: a chave de idempotência é gerada UMA vez por tentativa e
 * reusada — reenviar "pagar" devolve o MESMO pedido (o servidor não duplica).
 * Os campos de cartão são cosméticos no sandbox (o Mock não os processa) e NÃO
 * são enviados — sinalizado ao usuário.
 *
 * S1217-T1 · RN-438 (supersede a CKFORM §5.3 de 2026-07-18): os DOIS aceites
 * saíram desta etapa e passaram a fechar a etapa de INSCRIÇÃO, gateando o
 * "Continuar". Aqui fica o que é de pagamento. O que NÃO mudou: a cobrança é
 * criada já com os aceites no input, o servidor carimba versão + timestamp +
 * hash dentro da transação (flip F-4a · CKMOD), e o botão de pagar continua
 * desabilitado sem eles — a tela não oferece um ato que o servidor recusaria.
 */
export function StepPagamento({
  forma,
  total,
  charge,
  criandoCharge,
  erroCharge,
  onGerarCobranca,
  onPagarCartao,
  confirmando,
  erroConfirmar,
  onConfirmar,
  aceitesOk,
  pixExpirado = false,
  pixVivoPeloServidor = false,
  pixDesvioRelogioMs = 0,
  onPixExpirar,
  onNovaCobranca,
  gatewaySemResposta = false,
  totalDefasado = false,
  emailDaCompra = '',
  onConsultarPedido,
  consultandoPedido = false,
  pedidoEmConfirmacao = false,
}: {
  /**
   * S1217-T2 · RN-440: `null` = nenhuma forma escolhida. Não há instrumento a
   * mostrar, e é isso que impede a cobrança de nascer pela simples chegada.
   */
  forma: FormaUI | null;
  total: number | null;
  charge: CreateInscricaoChargeResult | null;
  criandoCharge: boolean;
  erroCharge: string | null;
  onGerarCobranca: () => void;
  onPagarCartao: () => void;
  confirmando: boolean;
  erroConfirmar: string | null;
  onConfirmar: () => void;
  /**
   * S1217-T1 · RN-438: os DOIS aceites já foram colhidos na etapa de
   * inscrição, e esta etapa não os exibe mais. O booleano continua chegando
   * porque o gate do botão de pagar é defesa em profundidade — o servidor
   * recusa a cobrança sem aceite (flip F-4a) e a tela não oferece o ato.
   */
  aceitesOk: boolean;
  /** RN-157: cobrança PIX já expirada (timer zerou / servidor cancelou). */
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
  /** RN-157: recomeçar com uma cobrança NOVA (nunca reusa a expirada). */
  onNovaCobranca?: () => void;
  /**
   * DEC-0727 (item 28): o teto de 15s do adapter estourou — o provedor não
   * respondeu e o estado da cobrança é DESCONHECIDO. Não é erro: a face disso
   * é "processando pagamento", em cartão e em PIX.
   */
  gatewaySemResposta?: boolean;
  /**
   * CKUX-REV · uma cotação NOVA está no ar: o `total` desta renderização é o
   * da seleção ANTERIOR. O B1 pôs resumo, parcelas e botão de pagar na mesma
   * tela, então mexer no que move preço passou a acontecer a um clique do ato
   * de pagar — e a cotação nova custa o debounce mais o round-trip (1,7-9,8 s
   * medidos em produção). Enquanto isso durar, o botão não pode prometer um
   * valor que o servidor não vai cobrar.
   */
  totalDefasado?: boolean;
  /** E-mail da compra — nomeia a caixa de entrada na orientação (RN-470). */
  emailDaCompra?: string;
  /**
   * S1225-T3 · RN-469/RN-470 — o GESTO EXPLÍCITO do comprador: consultar o
   * PRÓPRIO pedido nas Rules (leitura aberta pela S1225-T1). Não é polling e
   * não é listener: a v1 é deliberadamente barata, e a consulta acontece no
   * carregamento e neste clique, mais em lugar nenhum.
   *
   * Não confundir com o `onConfirmar` do sandbox: aquele DISPARA um webhook
   * assinado e MOVE dinheiro de estado; este só LÊ. É por isso que ele pode
   * existir com gateway real, onde o "Já paguei — confirmar" não pode (T3 da
   * PIXREAL-FIX): a plataforma não passa a acreditar no comprador, ela vai
   * olhar o próprio registro.
   */
  onConsultarPedido?: () => void;
  /** Uma consulta está no ar — o botão não dispara a segunda. */
  consultandoPedido?: boolean;
  /**
   * A consulta do gesto voltou e o pedido AINDA não está pago. É o estado que
   * o dono descreveu: pagou no banco, o webhook ainda não materializou. Só
   * então a tela diz "Estamos confirmando o seu pedido" — dizer isso na
   * chegada, antes de qualquer pagamento, seria confirmar o que ninguém pagou.
   */
  pedidoEmConfirmacao?: boolean;
}): React.JSX.Element {
  const totalLabel = total !== null ? formatarPreco(total) : '';
  // ── C3-0803 · cada espera com o nome dela ─────────────────────────────────
  //
  // Verbatim do dono (DEC-0803): *"o 'processando pagamento' só deve aparecer
  // depois de clicar em 'código pix', com um loader aparecendo com a mensagem
  // 'Preparando código pix', com o pix aparecendo na tela."*
  //
  // Gerar o código PIX NÃO é pagar: é preparar o instrumento. Chamar isso de
  // "Processando pagamento" contava ao comprador que o dinheiro estava em
  // trânsito antes de ele ter feito qualquer pagamento — e, com a
  // auto-geração, antes mesmo de ele ter clicado em coisa alguma.
  //
  // "Processando pagamento" (DEC-0727 · teto de 15s) fica onde ela é verdade:
  //   · `gatewaySemResposta` — o teto estourou, desfecho DESCONHECIDO;
  //   · `confirmando` — a confirmação do pagamento está no ar (PIX e cartão);
  //   · `criandoCharge` NO CARTÃO — ali criar a cobrança É o ato de pagar
  //     (`pagarCartao` encadeia criação + confirmação num gesto só).
  const preparandoPix = forma === 'pix' && criandoCharge;
  const emVoo = (criandoCharge && forma !== 'pix') || confirmando;
  const processando = gatewaySemResposta || emVoo;
  // S1225-T3 · RN-470 — o "indeterminado" DO CARTÃO, com a fronteira estreita:
  // a cobrança já nasceu (então o pedido existe e o dinheiro pode ter saído) e
  // o desfecho não voltou. Teto na criação, sem cobrança, NÃO é este estado.
  const cartaoIndeterminado =
    gatewaySemResposta && !emVoo && forma === 'cartao_credito' && charge !== null;
  // Erro e espera não coexistem: enquanto a plataforma não sabe o desfecho,
  // qualquer alerta vermelho seria uma afirmação que ela não pode fazer.
  const mostrarErroCharge = erroCharge !== null && !processando && !preparandoPix;
  const mostrarErroConfirmar = erroConfirmar !== null && !processando;

  // ── PIXREAL-FIX T3 · a tela para de mentir sobre o ambiente ───────────────
  //
  // Incidente de 04/08: o dono chegou nesta etapa com um PIX de PRODUÇÃO na
  // mão — chave `$aact_prod_`, cobrança viva no Asaas, BR Code que o banco
  // dele aceitava — e leu, logo abaixo do QR, "Ambiente de simulação: nenhum
  // PIX real é cobrado", com um botão "Já paguei — confirmar" ao lado. As duas
  // peças eram INCONDICIONAIS: nasceram no sandbox, quando o Mock era o único
  // gateway possível, e nunca ganharam guarda de ambiente. Clicar devolvia
  // `internal` (a callable de sandbox quebrava antes do próprio fail-safe —
  // T1/T2 desta lane), o que só tornou o defeito visível; ele já era grave em
  // silêncio, porque a frase estava errada sobre dinheiro de verdade.
  //
  // O sinal vem do SERVIDOR, e é o provider que criou ESTA cobrança quem o
  // emite (`gatewayReal`). Nenhuma `NEXT_PUBLIC_*`: uma variável de build da
  // landing pode divergir do que o backend fez em runtime, que é a fonte dupla
  // que produziu o incidente.
  //
  // Polaridade fail-safe: a simulação só aparece com um `false` EXPLÍCITO.
  // Campo ausente (servidor antigo, resposta truncada) ⇒ tratamos como real ⇒
  // nenhum convite a "simular" sobre uma cobrança que o banco aceita.
  const gatewaySimulado = charge !== null && charge.gatewayReal === false;

  return (
    <div className="flex flex-col gap-6">
      {/* S1217-T2 · RN-440 — sem meio escolhido não há instrumento de
          pagamento na tela, e nenhuma cobrança nasce. O preço já está acima:
          o bloco de totais mostra a composição da cotação vigente e cada opção
          carrega o próprio total no rótulo. A pessoa decide vendo os dois. */}
      {forma === null ? (
        <p className="text-sm text-text-secondary">
          Escolha a forma de pagamento acima para continuar.
        </p>
      ) : forma === 'pix' ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-text-primary">Pagamento via PIX</h2>

          {charge === null ? (
            <>
              <p className="text-sm text-text-secondary">
                {aceitesOk ? (
                  <>
                    Ao clicar abaixo, geramos o código PIX
                    {totalLabel ? (
                      <>
                        {' '}
                        de <strong>{totalLabel}</strong>
                      </>
                    ) : null}{' '}
                    à vista. Sua vaga fica reservada como pendente até a confirmação.
                  </>
                ) : (
                  <>
                    Volte à etapa de inscrição e confirme os aceites para gerar o código PIX
                    {totalLabel ? (
                      <>
                        {' '}
                        de <strong>{totalLabel}</strong>
                      </>
                    ) : null}{' '}
                    à vista.
                  </>
                )}
              </p>
              {/* C3-0803 · RN-440 — a cobrança nasce NESTE clique e em nenhum
                  outro lugar. A auto-geração (A-3) saiu: ela fazia
                  `createInscricaoCharge` — que grava pedido, pagamento e
                  inscritos pendentes ANTES de falar com o gateway — disparar
                  pela simples escolha do meio. */}
              <div>
                <Button
                  onClick={onGerarCobranca}
                  disabled={criandoCharge || !aceitesOk || totalDefasado}
                >
                  Gerar código PIX
                </Button>
              </div>
              {/* O loader do dono, com a frase dele. Fica ABAIXO do botão, no
                  lugar onde o código vai aparecer — a espera ocupa o espaço do
                  que está sendo esperado. */}
              {preparandoPix ? (
                <section
                  role="status"
                  aria-live="polite"
                  className="flex items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised p-4"
                >
                  <Loader2
                    size={18}
                    strokeWidth={2}
                    aria-hidden
                    className="shrink-0 animate-spin text-text-secondary"
                  />
                  <p className="text-sm font-medium text-text-primary">Preparando código PIX</p>
                </section>
              ) : null}
            </>
          ) : (
            <>
              {/* RN-157 · D-6: o MESMO bloco vivo da tela do pedido pendente —
                  QR + copia-e-cola + contagem de 30 min + copiar com toast. */}
              <PixCobranca
                codigo={payloadPix(charge)}
                expiraEmMillis={charge.pixExpiraEmMillis}
                expirado={pixExpirado}
                vivoPeloServidor={pixVivoPeloServidor}
                desvioRelogioMs={pixDesvioRelogioMs}
                onExpirar={onPixExpirar}
                onNovaCobranca={onNovaCobranca}
                nota={
                  gatewaySimulado ? (
                    <p className="text-xs text-text-tertiary">
                      Ambiente de simulação: nenhum PIX real é cobrado. Clique abaixo para simular a
                      confirmação do pagamento (o gateway dispara o webhook).
                    </p>
                  ) : (
                    // S1225-T2 · RN-470 — a frase que estava aqui prometia um
                    // canal que não existe: *"a confirmação chega sozinha, em
                    // segundos — não é preciso avisar aqui"*. Não chega. Não há
                    // `onSnapshot` nem polling em `apps/landing`, então nada
                    // nesta tela ia mudar sozinho, em segundo nenhum. Quem
                    // cumpriria a promessa era o e-mail, e no incidente de
                    // 04/08 ele quebrou na trava de IPs da Brevo — o comprador
                    // ficou olhando um QR pago sem uma palavra de ninguém.
                    //
                    // A versão honesta mantém as duas verdades do T3 (o
                    // dinheiro sai de verdade; o código tem prazo, e o relógio
                    // acima é o do servidor), tira a promessa de canal e nomeia
                    // o canal que a plataforma REALMENTE tem: o e-mail.
                    <p className="text-xs text-text-tertiary">
                      Este é um PIX real: o valor sai da sua conta assim que você pagar. Pague dentro
                      do prazo acima — quem confirma o pagamento é o gateway, e isso pode levar
                      alguns instantes. O acesso do seu ingresso vai para o e-mail da compra. Sua
                      inscrição está reservada como pendente até lá.
                    </p>
                  )
                }
              />
              {/* Cobrança expirada não tem o que confirmar: o caminho é uma
                  cobrança nova (o botão vive dentro do bloco do PIX).

                  T3: com gateway REAL o botão não existe. Quem confirma é o
                  webhook do Asaas (de pé, respondendo 200) — e um "Já paguei"
                  aqui seria, na melhor das hipóteses, um botão que erra, e na
                  pior um convite a marcar como pago o que não foi. */}
              {pixExpirado || !gatewaySimulado ? null : (
                <div>
                  <Button onClick={onConfirmar} disabled={confirmando}>
                    {confirmando ? 'Confirmando…' : 'Já paguei — confirmar'}
                  </Button>
                </div>
              )}

              {/* S1225-T3 · o gesto explícito do PIX real (RN-469 + RN-470).
                  Ele LÊ o próprio pedido; não afirma nada ao servidor. O
                  rótulo diz o que o clique faz, e de propósito não diz "já
                  paguei": a plataforma não passa a acreditar na palavra do
                  comprador (T3 da PIXREAL-FIX), ela vai olhar o registro.
                  Cobrança expirada não tem estado novo a buscar — ali o
                  caminho é uma cobrança nova, e o botão dela já está no bloco
                  do PIX. */}
              {gatewaySimulado || pixExpirado || onConsultarPedido === undefined ? null : (
                <>
                  <div>
                    <Button
                      variant="secondary"
                      onClick={onConsultarPedido}
                      disabled={consultandoPedido}
                    >
                      {consultandoPedido ? 'Consultando…' : 'Atualizar estado do pedido'}
                    </Button>
                  </div>
                  {pedidoEmConfirmacao ? (
                    <AvisoPedidoEmConfirmacao email={emailDaCompra} />
                  ) : null}
                </>
              )}
            </>
          )}
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-text-primary">Pagamento com cartão</h2>
          {/* D-0729-6: os campos do cartão são revelados dentro da própria
              opção "Cartão de crédito" (SeletorForma), no 1º clique — não
              existe mais uma segunda tela para digitá-los. S1217-T1: os
              aceites saíram daqui; o que resta é o ATO de pagar. */}
          <div>
            <Button
              onClick={onPagarCartao}
              disabled={criandoCharge || confirmando || !aceitesOk || totalDefasado}
            >
              {criandoCharge || confirmando
                ? 'Processando…'
                : totalDefasado
                  ? 'Atualizando o total…'
                  : `Pagar ${totalLabel}`.trim()}
            </Button>
          </div>
        </section>
      )}

      {/* DEC-0727 · "processando pagamento" vale para PIX e cartão — o bloco
          fica FORA do ramo por forma, de propósito: uma frase, um lugar.

          S1225-T3 · RN-470 abre UMA exceção, e só uma: o CARTÃO com a cobrança
          JÁ CRIADA e desfecho desconhecido. É o "timeout/queda entre criar e
          responder" da spec — no cartão criar a cobrança É pagar
          (CHECKOUT-FIX-0803), então ali o pedido existe, o dinheiro pode ter
          saído, e o que o dono mandou dizer nesse estado é "Estamos
          confirmando o seu pedido" com a orientação de e-mail. A copy de
          segurança que o DEC-0727 escreveu (não abra a segunda cobrança) não
          se perde: ela entra DENTRO do mesmo bloco, com o botão de retomada.

          O teto na CRIAÇÃO (charge === null) segue com "Processando
          pagamento" — lá pode não haver cobrança nenhuma, e "estamos
          confirmando o seu pedido" afirmaria um pedido em confirmação que
          talvez nem tenha nascido. */}
      {processando ? (
        cartaoIndeterminado ? (
          <AvisoPedidoEmConfirmacao email={emailDaCompra}>
            <p className="text-sm text-feedback-info-fg">
              O provedor de pagamento não respondeu no tempo esperado, então ainda não sabemos
              se a cobrança foi registrada. Não abra outra: tentar de novo reaproveita a mesma
              cobrança e nunca cobra duas vezes.
            </p>
            <div className="pt-1">
              <Button variant="secondary" onClick={onConfirmar} disabled={confirmando}>
                {confirmando ? 'Processando pagamento…' : 'Tentar novamente'}
              </Button>
            </div>
          </AvisoPedidoEmConfirmacao>
        ) : (
          <ProcessandoPagamento
            estado={emVoo ? 'em-voo' : 'sem-resposta'}
            tentando={emVoo}
            {...(gatewaySemResposta && !emVoo
              ? {
                  // A retomada é a MESMA ação que estourou, não uma ação nova:
                  // sem cobrança, re-tenta a criação (que é replay pela chave);
                  // com cobrança na mão, o que faltou foi a confirmação. Mandar
                  // "criar" aqui devolveria a cobrança de cache e a tela ficaria
                  // parada no mesmo aviso — um botão que não faz nada.
                  onTentarNovamente:
                    charge === null
                      ? forma === 'pix'
                        ? onGerarCobranca
                        : onPagarCartao
                      : onConfirmar,
                }
              : {})}
          />
        )
      ) : null}
      {mostrarErroCharge ? (
        <p role="alert" className="text-sm font-medium text-feedback-danger-fg">
          {erroCharge}
        </p>
      ) : null}
      {mostrarErroConfirmar ? (
        <p role="alert" className="text-sm font-medium text-feedback-danger-fg">
          {erroConfirmar}
        </p>
      ) : null}
    </div>
  );
}
