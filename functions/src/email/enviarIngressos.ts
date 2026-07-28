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
// FAIL-CLOSED (RN-137): sem `BREVO_API_KEY` o `selectEmailProvider` devolve
// null e este módulo não envia nem registra. A compra segue intocada e a
// pendência fica no log — a prova do envio real é pós-deploy, com a chave.
// =============================================================================

import type * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { isCodigoIngressoValido, validarEmail, type EmailProvider } from '@leela/core';
import { registrarComunicacao } from '../eventos/logComunicacao';
import { gerarQrDataUrl, urlPublicaDoEvento } from '../eventos/publicarEvento';
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

  // Chave do registro: responsável, senão o primeiro inscrito (ver cabeçalho).
  const responsavel = await encontrarInscritoResponsavel(db, eventoId, ingressos);

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
    paraTemplate.push({
      nome: ingresso.nome,
      modalidade: ingresso.modalidade,
      codigo: isCodigoIngressoValido(ingresso.codigo) ? ingresso.codigo : '',
      qrDataUri,
    });
  }

  try {
    const rendered = renderIngressosCompraEmail({
      nomeComprador,
      nomeEvento,
      linkEvento: urlPublicaDoEvento(slug),
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

/** Inscrito responsável do pedido; senão o primeiro (ver cabeçalho). */
async function encontrarInscritoResponsavel(
  db: Db,
  eventoId: string,
  ingressos: readonly IngressoEmitido[]
): Promise<string> {
  const col = db.collection('eventos').doc(eventoId).collection('inscritos');
  for (const ingresso of ingressos) {
    const snap = await col.doc(ingresso.inscritoId).get();
    if (snap.get('ehResponsavel') === true) return ingresso.inscritoId;
  }
  return (ingressos[0] as IngressoEmitido).inscritoId;
}
