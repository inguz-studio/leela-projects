// =============================================================================
// functions/src/email/enviarIngressos.ts
//
// DISPARO do e-mail de compra com os ingressos (LEELA-S1206-T6 · RN-398,
// sobre a idempotência da RN-219).
//
// Um e-mail POR PEDIDO, ao RESPONSÁVEL (o pagador — ADR-011), carregando o QR
// e o código identificador de CADA inscrito do pedido. Nada de um e-mail por
// inscrito: quem comprou para a família toda recebe uma mensagem, não cinco.
//
// IDEMPOTÊNCIA — reusada, não reinventada: `registrarComunicacao` (RN-219) faz
// hasSent+markSent atômicos sobre um docId determinístico
// (`{inscritoRef}_{emailConfirmacao}_{email}`). Reprocessar o webhook deriva o
// MESMO id, colide e o e-mail NÃO é reenviado. Registrar-ANTES-de-enviar é
// at-most-once, que é a política que a RN-219 escolheu: melhor um ingresso que
// não chegou (e o organizador reenvia) do que cinco cópias do mesmo ingresso.
//
// CHAVE DO REGISTRO: o inscrito RESPONSÁVEL do pedido; sem ele (compra para
// terceiros), o PRIMEIRO inscrito do pedido. Os dois são estáveis e exclusivos
// de um pedido — um inscrito pertence a exatamente um pedido —, então a chave
// nunca colapsa dois pedidos num só registro.
//
// A chave sai do PEDIDO (`inscritoRefs`), NUNCA da lista de ingressos que esta
// passagem conseguiu emitir (review INGQR-REV, vetor 2). Derivá-la dos
// emitidos a fazia MUDAR quando a primeira passagem falhava justamente no
// responsável: a segunda passagem calculava outro docId, não colidia e mandava
// um SEGUNDO e-mail com as credenciais de todo mundo. `inscritoRefs` é escrito
// pela Function do checkout e fechado a cliente (`pedidos`: write false), então
// é a única parte deste cálculo que não depende do desfecho da emissão.
//
// FAIL-CLOSED (RN-137): sem `BREVO_API_KEY` o `selectEmailProvider` devolve
// null e este módulo não envia nem registra. A compra segue intocada e a
// pendência fica no log — a prova do envio real é pós-deploy, com a chave.
//
// LINK DO INGRESSO (S1214-T3 · RN-423): cada bloco de inscrito ganha o link da
// PRÓPRIA página do ingresso — um por INSCRITO, não um por pedido, porque o
// token é por inscrito. O código em texto e o QR embutido continuam onde
// estavam: o link é a degradação para quem usa cliente que não renderiza data
// URI (Gmail e Outlook), não a troca. Sem base pública, ou sem keyring, o
// e-mail sai SEM link — link quebrado gasta a confiança de quem acabou de
// pagar. A chave de idempotência da RN-219 não é tocada por nada disto.
//
// DUAS CAMADAS, DE PROPÓSITO (F2 · lane BUILD-F2F5): a MONTAGEM+ENTREGA
// (`entregarEmailIngressos`) foi separada da GUARDA de idempotência
// (`enviarEmailIngressos`). O caminho automático — webhook e varredura —
// continua entrando pela guarda e é at-most-once por pedido (RN-219). O
// REENVIO ADMINISTRATIVO precisa da mesma mensagem sem a guarda, porque a
// chave já foi queimada por um envio que o provedor recusou (o 401 de
// allowlist da Brevo em 04/08 é o caso concreto): ele carrega a PRÓPRIA
// idempotência, por chave de operação, e reusa a camada de baixo em vez de
// montar um segundo e-mail de ingresso em outro lugar do código. Separar não
// enfraqueceu nada: a guarda continua sendo o ÚNICO caminho automático, e
// quem chama a camada de baixo tem de ser admin autenticado.
// =============================================================================

import type * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import {
  isCodigoIngressoValido,
  isCodigoPedidoValido,
  validarEmail,
  type EmailProvider,
} from '@leela/core';
import { registrarComunicacao } from '../eventos/logComunicacao';
import { gerarQrDataUrl } from '../eventos/publicarEvento';
import { urlIngressoPorLink, urlPublicaDoEvento } from '../eventos/basePublica';
import { assinarLinkIngresso } from '../eventos/linkIngresso';
import { obterQrKeyring } from '../eventos/qrToken';
import {
  renderIngressosCompraEmail,
  type IngressoDoEmail,
} from './templates';
import { registrarIncidenteEmail } from './incidenteEmail';
import type { IngressoEmitido } from '../eventos/emitirIngressos';

type Db = admin.firestore.Firestore;

/** Subtipo estável da chave de idempotência (RN-219). */
export const CHAVE_EMAIL_INGRESSOS = 'emailConfirmacao';

export type StatusEmailIngressos =
  | 'enviado'
  | 'ja_enviado'
  | 'pendente_chave'
  | 'falha_envio'
  | 'sem_ingresso'
  | 'sem_destinatario';

export interface ResultadoEmailIngressos {
  status: StatusEmailIngressos;
  /** docId do log de comunicação (RN-219) quando houve registro. */
  comunicacaoId?: string;
}

/**
 * Carimba o desfecho do e-mail de ingressos NO PEDIDO (F5 · RN-382).
 *
 * Antes disto, só a conta sem fricção gravava `emailStatus`: um pedido cujo
 * e-mail de INGRESSO falhou ficava idêntico, no banco, a um pedido entregue —
 * a falha vivia só no log, e log ninguém lê antes de o cliente reclamar. Com o
 * carimbo, "quem pagou e não recebeu" vira consulta
 * (`pedidos.emailIngressos.status == "falha_envio"`) e o operador tem onde
 * conferir o resultado do reenvio.
 *
 * Caminho pontilhado + `update`: nunca cria o doc do pedido, nunca clobbera
 * campo irmão. O carimbo é ACESSÓRIO — falhar aqui não pode derrubar o envio
 * que talvez tenha dado certo, então o erro é engolido com log.
 *
 * ⚠ O QUE NÃO ENTRA AQUI (lane FIX-PROJECAO, reconciliando REV-F2F5 com
 * REV-S1225): `comunicacaoId`. Desde a RN-469 o COMPRADOR lê o próprio doc de
 * `pedidos/{id}` inteiro, e as Rules não filtram campo — elas decidem o
 * documento, não a projeção. Logo, todo campo novo aqui NASCE VISÍVEL ao
 * comprador, e a consequência disso é a regra: estado operacional interno não
 * mora no doc do pedido. `comunicacaoId` é handle da coleção server-only
 * `eventos/{id}/comunicacoes` (Rules: leitura só de gestão), e o valor continua
 * vivo lá — o docId é determinístico (`{destinatario}_{chave}_{canal}`) e o
 * resultado da função ainda o devolve a quem chamou. Nenhum caminho o lia a
 * partir do pedido. O que FICA é o que é legitimamente do comprador: `status`,
 * `atualizadoEm`, `falhaEm`, `falhas` — a consulta "quem pagou e não recebeu"
 * (F5) usa `status`, não o handle.
 */
export async function registrarStatusEmailIngressos(
  db: Db,
  pedidoId: string,
  status: StatusEmailIngressos
): Promise<void> {
  try {
    await db
      .collection('pedidos')
      .doc(pedidoId)
      .update({
        'emailIngressos.status': status,
        'emailIngressos.atualizadoEm': FieldValue.serverTimestamp(),
        ...(status === 'falha_envio'
          ? {
              'emailIngressos.falhaEm': FieldValue.serverTimestamp(),
              'emailIngressos.falhas': FieldValue.increment(1),
            }
          : {}),
      });
  } catch (err) {
    logger.warn('email_ingressos_status_nao_carimbado', {
      pedidoId,
      status,
      err: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
  }
}

/** Tudo que a MONTAGEM do e-mail precisa saber do pedido e do evento. */
export interface DestinatarioEmailIngressos {
  /** E-mail do responsável, já normalizado (trim + lowercase). */
  email: string;
  nomeComprador: string;
  nomeEvento: string;
  slug: string;
  /** tenantId do EVENTO (ADR-009) — entra na assinatura do link. */
  tenantId: string;
  /** `inscritoRefs` do pedido — insumo da chave de idempotência da RN-219. */
  inscritoRefs: string[];
  /**
   * S1228-T2 · RN-474/RN-475 — os cinco símbolos do código da COMPRA, do doc
   * do pedido, sem prefixo. AUSENTE quando a compra é anterior ao backfill da
   * 5b (dezessete pedidos medidos em produção em 05/08), e a ausência viaja
   * como ausência: o template omite o bloco e o `pedidoId` não entra no lugar.
   *
   * Ele NÃO participa da chave de idempotência da RN-219 nem de nenhuma outra
   * decisão deste módulo — é dado de apresentação, e só.
   */
  codigoPedido?: string;
}

/**
 * Lê o destinatário do e-mail de ingressos (pedido + evento).
 *
 * @returns `null` quando o pedido não existe ou o e-mail do responsável não é
 *   endereço válido — os dois desfechos que a RN-398 trata como
 *   `sem_destinatario`.
 */
export async function lerDestinatarioEmailIngressos(
  db: Db,
  pedidoId: string,
  eventoId: string
): Promise<DestinatarioEmailIngressos | null> {
  const pedidoSnap = await db.collection('pedidos').doc(pedidoId).get();
  if (!pedidoSnap.exists) return null;
  const emailRaw = pedidoSnap.get('responsavel.email') as string | undefined;
  const nomeComprador =
    (pedidoSnap.get('responsavel.nome') as string | undefined) ?? '';
  if (typeof emailRaw !== 'string' || !validarEmail(emailRaw)) {
    logger.warn('email_ingressos_sem_destinatario', { pedidoId, eventoId });
    return null;
  }

  // S1228-T2 · o código da compra sai do doc que ESTA função já leu — nenhuma
  // leitura a mais no caminho do e-mail. Quem decide se o valor é código é o
  // core: campo ausente e campo corrompido colapsam no MESMO desfecho, que é
  // `undefined`, e o template trata os dois como ausência.
  const codigoPedidoRaw = pedidoSnap.get('codigoPedido') as unknown;

  const eventoSnap = await db.collection('eventos').doc(eventoId).get();
  return {
    email: emailRaw.trim().toLowerCase(),
    nomeComprador,
    nomeEvento: (eventoSnap.get('nome') as string | undefined) ?? 'seu evento',
    slug: (eventoSnap.get('slug') as string | undefined) ?? eventoId,
    tenantId: (eventoSnap.get('tenantId') as string | undefined) ?? '',
    inscritoRefs: (pedidoSnap.get('inscritoRefs') as string[] | undefined) ?? [],
    ...(isCodigoPedidoValido(codigoPedidoRaw) ? { codigoPedido: codigoPedidoRaw } : {}),
  };
}

/**
 * MONTA e ENTREGA o e-mail de compra — sem nenhuma guarda de idempotência.
 *
 * Camada de baixo (ver cabeçalho): quem chama já decidiu que PODE enviar. O
 * caminho automático decide pela RN-219 (`enviarEmailIngressos`); o reenvio
 * administrativo decide pela chave da operação. QR e link continuam por
 * INSCRITO (RN-423) e falha de UMA imagem/assinatura não derruba a mensagem
 * de todo mundo.
 *
 * @throws o erro do provedor — quem chama é que sabe como registrar a falha
 *   (log de comunicação no caminho automático, extrato no reenvio).
 */
export async function entregarEmailIngressos(
  args: {
    pedidoId: string;
    eventoId: string;
    ingressos: readonly IngressoEmitido[];
    destinatario: DestinatarioEmailIngressos;
  },
  emailProvider: EmailProvider
): Promise<void> {
  const { pedidoId, eventoId, ingressos, destinatario } = args;

  // Keyring do processo — o mesmo do QR (S1214 · RN-419). Ausente ⇒ nenhum
  // link é assinado e o e-mail sai como sempre saiu. Nunca "link sem
  // assinatura".
  const keyring = obterQrKeyring();
  const tenantId = destinatario.tenantId;

  // QR por inscrito. Falha de geração de UMA imagem não derruba o e-mail: o
  // código em texto continua lá, que é o que a RN-398 promete.
  const paraTemplate: IngressoDoEmail[] = [];
  for (const ingresso of ingressos) {
    let qrDataUri = '';
    try {
      qrDataUri = await gerarQrDataUrl(ingresso.qrToken, 240);
    } catch (err) {
      logger.warn('email_ingressos_qr_falhou', {
        pedidoId,
        eventoId,
        inscritoId: ingresso.inscritoId,
        err: err instanceof Error ? err.name : 'erro',
      });
    }

    // UM LINK POR INSCRITO (RN-423 · P8), não um por pedido: o token é por
    // inscrito, e é isso que resolve o QR invisível para cada pessoa da
    // compra. O link é amarrado ao `qrToken` que ACABOU de ser emitido, então
    // re-emitir o ingresso mata este link (RN-420).
    let linkIngresso: string | undefined;
    if (keyring !== null && tenantId.length > 0 && ingresso.qrToken.length > 0) {
      try {
        const token = assinarLinkIngresso(
          { inscritoId: ingresso.inscritoId, eventoId, tenantId },
          ingresso.qrToken,
          keyring
        );
        // `?? undefined`: sem base pública o link NÃO é renderizado — nunca
        // uma URL com `undefined` no meio, nunca o domínio antigo (D-ING-8).
        linkIngresso = urlIngressoPorLink(token) ?? undefined;
      } catch (err) {
        // Assinatura de UM link não derruba o e-mail de todo mundo.
        logger.warn('email_ingressos_link_falhou', {
          pedidoId,
          eventoId,
          inscritoId: ingresso.inscritoId,
          err: err instanceof Error ? err.name : 'erro',
        });
      }
    }

    paraTemplate.push({
      nome: ingresso.nome,
      modalidade: ingresso.modalidade,
      codigo: isCodigoIngressoValido(ingresso.codigo) ? ingresso.codigo : '',
      qrDataUri,
      ...(linkIngresso !== undefined ? { linkIngresso } : {}),
    });
  }

  const linkEvento = urlPublicaDoEvento(destinatario.slug);
  const rendered = renderIngressosCompraEmail({
    nomeComprador: destinatario.nomeComprador,
    nomeEvento: destinatario.nomeEvento,
    ...(linkEvento !== null ? { linkEvento } : {}),
    // S1228-T2 · a referência da COMPRA. O reenvio administrativo entra por
    // esta mesma camada de baixo (F2 · BUILD-F2F5), então ele herda o código
    // sem uma linha a mais — inclusive nas compras que o backfill carimbar
    // depois de o primeiro e-mail ter saído sem ele.
    ...(destinatario.codigoPedido !== undefined
      ? { codigoPedido: destinatario.codigoPedido }
      : {}),
    ingressos: paraTemplate,
  });
  await emailProvider.sendTransactional({
    to: {
      email: destinatario.email,
      ...(destinatario.nomeComprador.length > 0
        ? { nome: destinatario.nomeComprador }
        : {}),
    },
    assunto: rendered.assunto,
    html: rendered.html,
    texto: rendered.texto,
    tag: 'ingressos-compra',
  });
  logger.info('email_ingressos_enviado', {
    pedidoId,
    eventoId,
    inscritos: paraTemplate.length,
  });
}

/**
 * Envia o e-mail de compra com os ingressos do pedido.
 *
 * Caminho AUTOMÁTICO (webhook e varredura), guardado pela RN-219: at-most-once
 * por pedido. Reprocesso e re-entrega do gateway não reenviam.
 *
 * @param ingressos saída de `emitirIngressosDoPedido` — na ordem do pedido.
 */
export async function enviarEmailIngressos(
  db: Db,
  args: {
    pedidoId: string;
    eventoId: string;
    ingressos: readonly IngressoEmitido[];
  },
  emailProvider: EmailProvider | null
): Promise<ResultadoEmailIngressos> {
  const { pedidoId, eventoId, ingressos } = args;

  // Sem ingresso não há e-mail de ingresso. Mandar "sua compra foi
  // confirmada" com a lista vazia seria pior que o silêncio: o registro de
  // idempotência queimaria e o envio de verdade nunca mais aconteceria.
  if (ingressos.length === 0) return { status: 'sem_ingresso' };

  const destinatario = await lerDestinatarioEmailIngressos(db, pedidoId, eventoId);
  if (destinatario === null) return { status: 'sem_destinatario' };

  if (emailProvider === null) {
    // Fail-closed: NÃO registra no log de comunicação. Registrar ali gravaria
    // "enfileirado" para um envio que nunca existiu, e o dia em que a chave
    // chegasse o e-mail seria suprimido pela própria idempotência. O CARIMBO
    // no pedido é outra coisa: pendência de chave é estado que precisa ser
    // consultável, não só logável (F5).
    logger.info('email_ingressos_pendente_chave', { pedidoId, eventoId });
    await registrarStatusEmailIngressos(db, pedidoId, 'pendente_chave');
    return { status: 'pendente_chave' };
  }

  // Chave do registro: responsável, senão o primeiro inscrito DO PEDIDO —
  // função só do pedido, nunca do que esta passagem emitiu (ver cabeçalho).
  const responsavel = await encontrarInscritoResponsavel(
    db,
    eventoId,
    destinatario.inscritoRefs,
    ingressos
  );

  // markSent ANTES do envio (at-most-once — RN-219).
  const registro = await registrarComunicacao(db, eventoId, {
    destinatario: { tipo: 'inscrito', ref: responsavel },
    canal: 'email',
    tipo: 'transacional',
    chaveRef: CHAVE_EMAIL_INGRESSOS,
    assunto: `Seu ingresso para ${destinatario.nomeEvento}`.slice(0, 150),
    templateRef: 'ingressosCompra',
  });
  if (!registro.registrada) {
    // 'ja_registrada' É o sinal de hasSent: reprocesso não reenvia.
    logger.info('email_ingressos_nao_reenviado', {
      pedidoId,
      eventoId,
      motivo: registro.motivo,
    });
    const status =
      registro.motivo === 'ja_registrada' ? 'ja_enviado' : 'sem_destinatario';
    if (status === 'ja_enviado') {
      await registrarStatusEmailIngressos(db, pedidoId, status);
    }
    return { status, comunicacaoId: registro.comunicacaoId };
  }

  try {
    await entregarEmailIngressos(
      { pedidoId, eventoId, ingressos, destinatario },
      emailProvider
    );
    await registrarStatusEmailIngressos(db, pedidoId, 'enviado');
    return { status: 'enviado', comunicacaoId: registro.comunicacaoId };
  } catch (err) {
    // O registro fica como `enfileirado` — pendência VISÍVEL no log de
    // comunicação, que é o estado que a RN-219 previu para o crash entre o
    // markSent e o envio. Reenvio é decisão do organizador, não retry cego.
    //
    // F5: a partir daqui isto é INCIDENTE, não linha de log. O campo `alerta`
    // é o que uma política casa, e o carimbo no pedido é o que torna a falha
    // consultável — antes, um pedido com e-mail recusado era indistinguível,
    // no banco, de um pedido entregue.
    registrarIncidenteEmail('email_ingressos_falhou', {
      tipo: 'ingressos',
      pedidoId,
      eventoId,
      erro: err,
    });
    await registrarStatusEmailIngressos(db, pedidoId, 'falha_envio');
    return { status: 'falha_envio', comunicacaoId: registro.comunicacaoId };
  }
}

/**
 * Inscrito responsável DO PEDIDO; senão o primeiro da lista do pedido.
 *
 * Varre `inscritoRefs` (a composição do pedido, imutável para cliente), não os
 * ingressos emitidos: o docId de idempotência tem de ser o mesmo quer a
 * emissão tenha completado, quer tenha parado no meio. `ingressos` só entra
 * como último recurso, para pedido sem `inscritoRefs` legível.
 */
async function encontrarInscritoResponsavel(
  db: Db,
  eventoId: string,
  inscritoRefs: readonly string[],
  ingressos: readonly IngressoEmitido[]
): Promise<string> {
  const col = db.collection('eventos').doc(eventoId).collection('inscritos');
  for (const inscritoId of inscritoRefs) {
    const snap = await col.doc(inscritoId).get();
    if (snap.get('ehResponsavel') === true) return inscritoId;
  }
  const primeiro = inscritoRefs[0];
  if (typeof primeiro === 'string' && primeiro.length > 0) return primeiro;
  return (ingressos[0] as IngressoEmitido).inscritoId;
}
