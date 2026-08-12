// =============================================================================
// desfechoPedido.ts — o que a tela faz quando o desfecho do pagamento chega.
//
// A DECISÃO QUE ISTO MATERIALIZA (11/08 · CKPIX-1 · RN-560). O dono revogou a
// RN-470 (a tela passiva, que só sabia do desfecho por clique do comprador) e
// escreveu os quatro ramos, na íntegra: *"a tela precisa receber o webhook de
// volta do gateway de pagamento. Após receber confirmação, direcionamos para a
// área interna com o cliente logado (...). Se o pix nao foi pago, ser
// redirecionado avisando que o pix foi canelado após o prazo evncer, e levar
// tambem para a area do cliente. cartao recusado, da mensagem de erro e fala
// para revisar os dados de cartao, e volta para o checkout. cartao aceito,
// mostra mensagem de sucesso e depois já loader redirecinando para aread o
// cliente também."*
//
// O QUINTO RAMO veio na leva 7 da mesma noite (ESTOURO-2 · RN-546), na íntegra:
// *"o pendente de cartão, caso um pagamento de erro, devolveremos a vaga após o
// checkout expirar, (dentro do time de 15 minutos). Se expirou os 15 minutos, o
// pedido nao é mais reservado, e damos um refresh, levanto novamente para a
// tela de landing page."* — e ele NÃO é o PIX vencido com outra roupa: o
// destino é a página do evento, não a área do cliente, porque o que a pessoa
// precisa dali é escolher de novo, não conferir uma compra que não houve.
//
// POR QUE A CLASSIFICAÇÃO MORA NUMA FUNÇÃO PURA, longe do componente: os ramos
// não são cinco `if` espalhados por dois efeitos e um render. Eles são UMA
// leitura do doc do pedido, e é a mesma leitura que precisa valer para o
// listener e para a consulta de carregamento/gesto que a S1225-T3 deixou de pé.
// Duas cópias da regra divergiriam no primeiro conserto, e a que divergisse
// contaria ao comprador uma história diferente sobre o mesmo dinheiro.
//
// ⚠️ O `status` do pedido NÃO basta para nomear o desfecho, e é isso que torna
// esta função necessária. A máquina tem quatro valores (`StatusPedido`) e três
// terminais; `falhou` e `cancelado` chegam pelos DOIS meios, por causas que a
// tela precisa distinguir para não mentir. Ver a tabela em `classificarDesfecho`.
// =============================================================================

import { MOTIVO_CANCELAMENTO_PIX_EXPIRADO } from '@leela/core';
import { ROTA_AREA_CLIENTE } from '@/lib/areaDoCliente';
import type { FormaUI } from './tipos';

/**
 * O desfecho, já traduzido para o que a TELA faz. Não é o status do pedido com
 * outro nome: `encerrado` e `pix_vencido` compartilham o mesmo `cancelado`, e
 * `cartao_recusado` e `pix_vencido` compartilham o mesmo `falhou`.
 */
export type DesfechoPedido =
  /** Ainda vivo e não pago — a espera continua, ninguém é mandado a lugar nenhum. */
  | 'pendente'
  /** Ramos 1 e 4 (RN-560) — PIX confirmado e cartão aceito têm o MESMO desfecho. */
  | 'pago'
  /** Ramo 2 (RN-560) — o prazo do PIX venceu sem pagamento. */
  | 'pix_vencido'
  /** Ramo 3 (RN-560) — o cartão não passou; a saída é revisar os dados e tentar de novo. */
  | 'cartao_recusado'
  /** Ramo 5 (RN-546 · ESTOURO-2) — a reserva do pendente de cartão venceu. */
  | 'reserva_expirada'
  /**
   * Terminal não-pago cuja CAUSA a tela não apurou. Não é ramo do dono: é o
   * estado que a REV-S1225 já desenhava (`AvisoPedidoEncerrado`), e ele fica
   * exatamente como estava. Inventar aqui uma das frases do dono seria afirmar
   * uma causa que ninguém leu.
   */
  | 'encerrado';

/** O recorte do pedido de que a classificação precisa — nada além disso. */
export interface EntradaDesfecho {
  status: string | null | undefined;
  /** `canceladoMotivo` do doc (contrato do core) — ausente = causa não apurada. */
  canceladoMotivo?: string | undefined;
  /** Espelho `pedido.formaPagamento`, escrito pelo servidor pós-cobrança. */
  formaPagamento?: string | undefined;
  /** A forma escolhida NESTA tela — só vale como desempate; ver abaixo. */
  formaNaTela?: FormaUI | null | undefined;
  /**
   * A reserva de vaga deste pedido venceu (RN-546)? Vem de
   * {@link reservaDoPedidoExpirou}, e é o único ramo que NÃO se lê no status —
   * ver a nota daquela função.
   */
  reservaExpirada?: boolean | undefined;
}

/**
 * A reserva de vaga do pendente de CARTÃO venceu (RN-546 · ESTOURO-2)?
 *
 * ⛔ ESTE RAMO ESTÁ ATRÁS DO CONTRATO DA LANE ESTOURO-BUILD, e por isso responde
 * `false` hoje. A razão de ele existir mesmo assim é que o resto do ramo — o
 * destino, o refresh, a tela — é decisão do dono e é desta lane; o que falta é
 * UM predicado, e ele fica isolado aqui para a outra lane ter uma linha só a
 * trocar em vez de um fluxo a reescrever.
 *
 * POR QUE NÃO DÁ PARA ADIVINHAR O CAMPO. O dono disse *"o pedido nao é mais
 * reservado"*, e a RN-546 é explícita em que o **pedido continua vivo** — nada
 * é cancelado no gateway, porque dinheiro em voo não se toca, e a confirmação
 * atrasada ainda entra (RN-498). Ou seja: a expiração da reserva NÃO é uma
 * transição de `status`, é um fato à parte que a varredura carimba. Chutar o
 * nome do campo aqui (`reservaExpirouEm`? `reservaAtiva`?) produziria um ramo
 * que nunca acende ou, pior, um que acende no doc errado.
 *
 * O QUE A OUTRA LANE PRECISA FAZER: trocar o corpo desta função pela leitura do
 * campo que ela definir no core, e nada mais. O teste do ramo 5 já exercita o
 * comportamento por injeção, então ele passa a valer no mesmo commit.
 */
export function reservaDoPedidoExpirou(
  _pedido: { status: string; canceladoMotivo?: string | undefined },
): boolean {
  return false;
}

/**
 * Traduz o doc do pedido para o ramo da tela.
 *
 * A TABELA, e a razão de cada linha:
 *
 * | status         | meio     | causa                    | ramo              |
 * |----------------|----------|--------------------------|-------------------|
 * | `pago`         | qualquer | —                        | `pago`            |
 * | `pendente`     | cartão   | reserva venceu (RN-546)  | `reserva_expirada`|
 * | `pendente`     | qualquer | —                        | `pendente`        |
 * | `cancelado`    | PIX      | motivo `pix_expirado`    | `pix_vencido`     |
 * | `falhou`       | PIX      | (só há uma — ver abaixo) | `pix_vencido`     |
 * | `falhou`       | cartão   | recusa do emissor/risco  | `cartao_recusado` |
 * | resto terminal | —        | não apurada              | `encerrado`       |
 *
 * ⚠️ `pago` VENCE A RESERVA EXPIRADA, e a ordem das portas é o que garante
 * isso. A RN-498 admite confirmação atrasada: um pedido pode ter perdido a
 * reserva e ser pago logo depois. Mandar essa pessoa de volta à página do
 * evento porque um carimbo anterior dizia "expirou" seria negar uma compra que
 * o servidor aceitou.
 *
 * ⚠️ `falhou` NO PIX É VENCIMENTO, e isso é prova, não palpite. O mapa
 * `WEBHOOK_EVENT_TO_CHARGE` (`functions/src/payments/asaasProvider.ts`) tem
 * três eventos que viram `failed`: `PAYMENT_OVERDUE`,
 * `PAYMENT_CREDIT_CARD_CAPTURE_REFUSED` e `PAYMENT_REPROVED_BY_RISK_ANALYSIS`.
 * Os dois últimos são de CARTÃO por definição. Sobra o vencimento — que é
 * exatamente a mesma coisa que a varredura da RN-545 carimba como
 * `pix_expirado` pelo outro caminho. Os dois caminhos existem porque o
 * vencimento pode chegar pelo gateway ou pela nossa varredura, e o comprador
 * não tem por que ver duas histórias diferentes do mesmo fato.
 *
 * ⚠️ O MEIO VEM DO PEDIDO, não da tela, e a ordem importa. `formaPagamento` é
 * espelho escrito pelo SERVIDOR na criação da cobrança; `formaNaTela` é estado
 * de React que o comprador pode ter trocado depois. Quando os dois discordam,
 * quem manda é o doc — foi ele que o gateway pagou ou recusou. A forma da tela
 * só entra quando o espelho não existe (pedido pré-espelho, ou leitura
 * truncada), e mesmo aí só para escolher entre duas frases honestas.
 */
export function classificarDesfecho(entrada: EntradaDesfecho): DesfechoPedido {
  const { status, canceladoMotivo, formaPagamento, formaNaTela, reservaExpirada } = entrada;
  if (status === 'pago') return 'pago';

  const meio = formaPagamento ?? formaNaTela ?? null;

  if (status !== 'falhou' && status !== 'cancelado') {
    // RN-546 · o único ramo que nasce de um pedido AINDA VIVO. Cartão só: o PIX
    // tem vencimento próprio (`pixExpiraEm`) e sai pelo ramo 2.
    return reservaExpirada === true && meio === 'cartao_credito'
      ? 'reserva_expirada'
      : 'pendente';
  }

  if (meio === 'pix') {
    if (status === 'cancelado') {
      return canceladoMotivo === MOTIVO_CANCELAMENTO_PIX_EXPIRADO
        ? 'pix_vencido'
        : 'encerrado';
    }
    return 'pix_vencido';
  }

  if (meio === 'cartao_credito' && status === 'falhou') return 'cartao_recusado';

  return 'encerrado';
}

/**
 * Para onde o desfecho leva, ou `null` quando ele não tira ninguém do checkout.
 *
 * UM LUGAR SÓ DECIDE O DESTINO, e os destinos são dois de propósito: os ramos
 * 1, 2 e 4 vão para a área do cliente, porque lá está a compra da pessoa; o
 * ramo 5 volta para a PÁGINA DO EVENTO, porque ali não houve compra — a vaga
 * foi devolvida e o que ela precisa é escolher de novo. O dono separou os dois
 * na mesma noite, e a separação é a decisão, não um detalhe de rota.
 *
 * O ramo 3 (cartão recusado) devolve `null`: ele "volta para o checkout", que é
 * a tela onde a pessoa já está.
 */
export function destinoDoDesfecho(
  desfecho: DesfechoPedido,
  eventoSlug: string,
): string | null {
  if (desfecho === 'pago' || desfecho === 'pix_vencido') return ROTA_AREA_CLIENTE;
  if (desfecho === 'reserva_expirada') return `/${eventoSlug}`;
  return null;
}

/**
 * Quanto tempo a mensagem fica na tela antes de o redirecionamento acontecer
 * (ms). O dono pediu *"mensagem de sucesso e depois já loader redirecinando"* —
 * "já" é curto, e não é zero: redirecionar no mesmo quadro em que a mensagem
 * aparece é o mesmo que não mostrar mensagem nenhuma, e o código da compra
 * (RN-475) mora justamente na tela que sumiria.
 *
 * Não é temporizador de leitura: a informação toda sobrevive do outro lado, em
 * "Minhas compras". É o tempo de a pessoa entender o que aconteceu antes de a
 * tela mudar debaixo dela.
 */
export const MS_ATE_DESTINO = 4000;
