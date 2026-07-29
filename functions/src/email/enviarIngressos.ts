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
// =============================================================================

import type * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { isCodigoIngressoValido, validarEmail, type EmailProvider } from '@leela/core';
import { registrarComunicacao } from '../eventos/logComunicacao';
import { gerarQrDataUrl } from '../eventos/publicarEvento';
import { urlIngressoPorLink, urlPublicaDoEvento } from '../eventos/basePublica';
import { assinarLinkIngresso } from '../eventos/linkIngresso';
import { obterQrKeyring } from '../eventos/qrToken';
import {
  renderIngressosCompraEmail,
  type IngressoDoEmail,
} from './templates';
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
 * Envia o e-mail de compra com os ingressos do pedido.
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

  const pedidoSnap = await db.collection('pedidos').doc(pedidoId).get();
  if (!pedidoSnap.exists) return { status: 'sem_destinatario' };
  const emailRaw = pedidoSnap.get('responsavel.email') as string | undefined;
  const nomeComprador =
    (pedidoSnap.get('responsavel.nome') as string | undefined) ?? '';
  if (typeof emailRaw !== 'string' || !validarEmail(emailRaw)) {
    logger.warn('email_ingressos_sem_destinatario', { pedidoId, eventoId });
    return { status: 'sem_destinatario' };
  }
  const email = emailRaw.trim().toLowerCase();

  if (emailProvider === null) {
    // Fail-closed: NÃO registra. Registrar aqui gravaria "enfileirado" para
    // um envio que nunca existiu, e o dia em que a chave chegasse o e-mail
    // seria suprimido pela própria idempotência.
    logger.info('email_ingressos_pendente_chave', { pedidoId, eventoId });
    return { status: 'pendente_chave' };
  }

  const eventoSnap = await db.collection('eventos').doc(eventoId).get();
  const nomeEvento = (eventoSnap.get('nome') as string | undefined) ?? 'seu evento';
  const slug = (eventoSnap.get('slug') as string | undefined) ?? eventoId;

  // Chave do registro: responsável, senão o primeiro inscrito DO PEDIDO —
  // função só do pedido, nunca do que esta passagem emitiu (ver cabeçalho).
  const responsavel = await encontrarInscritoResponsavel(
    db,
    eventoId,
    (pedidoSnap.get('inscritoRefs') as string[] | undefined) ?? [],
    ingressos
  );

  // markSent ANTES do envio (at-most-once — RN-219).
  const registro = await registrarComunicacao(db, eventoId, {
    destinatario: { tipo: 'inscrito', ref: responsavel },
    canal: 'email',
    tipo: 'transacional',
    chaveRef: CHAVE_EMAIL_INGRESSOS,
    assunto: `Seu ingresso para ${nomeEvento}`.slice(0, 150),
    templateRef: 'ingressosCompra',
  });
  if (!registro.registrada) {
    // 'ja_registrada' É o sinal de hasSent: reprocesso não reenvia.
    logger.info('email_ingressos_nao_reenviado', {
      pedidoId,
      eventoId,
      motivo: registro.motivo,
    });
    return {
      status: registro.motivo === 'ja_registrada' ? 'ja_enviado' : 'sem_destinatario',
      comunicacaoId: registro.comunicacaoId,
    };
  }

  // Keyring do processo — o mesmo do QR (S1214 · RN-419). Ausente ⇒ nenhum
  // link é assinado e o e-mail sai como sempre saiu. Nunca "link sem
  // assinatura".
  const keyring = obterQrKeyring();
  const tenantId = (eventoSnap.get('tenantId') as string | undefined) ?? '';

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

  try {
    const linkEvento = urlPublicaDoEvento(slug);
    const rendered = renderIngressosCompraEmail({
      nomeComprador,
      nomeEvento,
      ...(linkEvento !== null ? { linkEvento } : {}),
      ingressos: paraTemplate,
    });
    await emailProvider.sendTransactional({
      to: { email, ...(nomeComprador.length > 0 ? { nome: nomeComprador } : {}) },
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
    return { status: 'enviado', comunicacaoId: registro.comunicacaoId };
  } catch (err) {
    // O registro fica como `enfileirado` — pendência VISÍVEL no log de
    // comunicação, que é o estado que a RN-219 previu para o crash entre o
    // markSent e o envio. Reenvio é decisão do organizador, não retry cego.
    logger.error('email_ingressos_falhou', {
      pedidoId,
      eventoId,
      err: err instanceof Error ? err.message.slice(0, 200) : String(err),
    });
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
