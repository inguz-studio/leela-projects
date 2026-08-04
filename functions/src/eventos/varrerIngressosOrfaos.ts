// =============================================================================
// functions/src/eventos/varrerIngressosOrfaos.ts
//
// VARREDURA DO INGRESSO ÓRFÃO (item 54 · RN-382) — a rede que faltava embaixo
// da emissão. Achado do vetor 3 da INGQR-REV: pedido pago cuja emissão falhou
// ficava órfão PARA SEMPRE, porque re-entrega de webhook não reabre a janela.
//
// Desenho REUSADO do item 27 (`varrerEstornosOrfaos`), campo a campo:
//   - extrato de pendência gravado NO PONTO DA FALHA (`ingressosPendentes`);
//   - cron `every 15 minutes` no fuso de São Paulo, molde ADR-015;
//   - a varredura CONTA, ALERTA e re-dispara o que o gatilho inline não fechou;
//   - o que exige mão humana não é re-disparado automaticamente, só contado.
//
// O que muda em relação ao gêmeo do dinheiro: lá o re-disparo é um POST no
// gateway, protegido pela máquina de carimbo; aqui é a PRÓPRIA emissão, que já
// é idempotente por inscrito (quem tem token e código sai sem escrita, e o
// token nunca é re-assinado). Chamar de novo é inofensivo por construção — é a
// mesma propriedade que faz o reprocesso do webhook não trocar o código.
//
// O E-MAIL. A varredura também fecha o e-mail do pedido, e é ela quem manda
// quando a primeira passagem ficou incompleta. A idempotência é a da RN-219
// corrigida em `291d4f9`: a chave sai de `pedido.inscritoRefs`, não do que a
// passagem conseguiu emitir, então o envio da varredura e o envio inline
// derivam o MESMO docId — reprocesso e re-entrega nunca produzem um segundo
// e-mail com as credenciais de todo mundo.
// =============================================================================

import * as admin from 'firebase-admin';
import { runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import type { EmailProvider } from '@leela/core';
import { emitirIngressosDoPedido } from './emitirIngressos';
import { obterQrKeyring, type QrKeyring } from './qrToken';
import { enviarEmailIngressos } from '../email/enviarIngressos';
import { selectEmailProvider } from '../email/selectEmailProvider';
import {
  INGRESSOS_PENDENTES_COL,
  carimbarTentativaIngresso,
  resolverIngressoPendente,
} from './ingressosPendentes';

type Db = admin.firestore.Firestore;

export interface ResultadoVarreduraIngressos {
  /** Pendências que seguem ABERTAS ao fim da varredura (o contador do alerta). */
  pendentes: number;
  /** Ingressos emitidos NESTA varredura (o que estava faltando e saiu). */
  emitidos: number;
  /** Pendências fechadas nesta varredura. */
  resolvidos: number;
  /** E-mails de compra que saíram daqui (a RN-219 barra o resto). */
  emailsEnviados: number;
  /** Casos que ESGOTARAM as re-tentativas nesta varredura (alerta contável). */
  esgotados: number;
  /** Já esgotados antes — contados, nunca re-tentados (mão humana). */
  conferenciaManual: number;
  falhas: number;
}

/**
 * Varre o extrato de pedidos pagos sem ingresso: re-tenta a emissão, fecha o
 * e-mail e alerta o que não se cura sozinho.
 *
 * @param keyring ring de assinatura (injetável — `null` = pendência fica de pé).
 * @param emailProvider provider do e-mail (injetável; `null` = fail-closed
 *   RN-137, o ingresso é emitido e o e-mail continua pendente de chave).
 */
export async function varrerIngressosOrfaosCore(
  db: Db,
  keyring: QrKeyring | null,
  emailProvider: EmailProvider | null
): Promise<ResultadoVarreduraIngressos> {
  const pendentesSnap = await db
    .collection(INGRESSOS_PENDENTES_COL)
    .where('resolvido', '==', false)
    .get();

  const resultado: ResultadoVarreduraIngressos = {
    pendentes: pendentesSnap.size,
    emitidos: 0,
    resolvidos: 0,
    emailsEnviados: 0,
    esgotados: 0,
    conferenciaManual: 0,
    falhas: 0,
  };
  if (pendentesSnap.empty) return resultado;

  for (const doc of pendentesSnap.docs) {
    const pedidoId = doc.id;
    try {
      // Esgotado: NENHUMA re-tentativa automática. O alerta já saiu quando
      // esgotou; insistir a cada 15 minutos só afogaria o log (RN-382).
      if (doc.get('esgotado') === true) {
        resultado.conferenciaManual += 1;
        continue;
      }

      const r = await emitirIngressosDoPedido(db, pedidoId, keyring);
      resultado.emitidos += r.emitidos;

      if (!r.processado) {
        // Pedido que não é (mais) órfão: cancelado, estornado, inexistente.
        // Quinze minutos depois da detecção, "não pago" já é desfecho, não
        // corrida — fecha a pendência com o motivo à vista.
        if (r.motivo === 'pedido_nao_pago' || r.motivo === 'pedido_inexistente') {
          if (await resolverIngressoPendente(db, pedidoId, { desfecho: r.motivo })) {
            resultado.resolvidos += 1;
            resultado.pendentes -= 1;
          }
          continue;
        }
        // Keyring ausente ou evento sem tenant: a emissão nem rodou. Conta a
        // tentativa e segue — é o caso que o alerta de esgotamento existe para
        // levar a um humano (sem chave de assinatura, ninguém tem ingresso).
        const carimbo = await carimbarTentativaIngresso(db, pedidoId, {
          ultimoMotivo: r.motivo ?? 'nao_processado',
        });
        if (carimbo.esgotado) {
          resultado.esgotados += 1;
          logger.error('ingresso_orfao_esgotado', {
            pedidoId,
            tentativas: carimbo.tentativas,
            motivo: r.motivo ?? 'nao_processado',
          });
        }
        continue;
      }

      if (r.falhas === 0 && r.eventoId !== null && r.ingressos.length > 0) {
        // Emissão FECHADA: agora o e-mail pode queimar a chave da RN-219 com a
        // lista completa. `ja_enviado` aqui é sucesso — significa que o envio
        // inline já tinha saído e a idempotência do `291d4f9` segurou.
        const mail = await enviarEmailIngressos(
          db,
          { pedidoId, eventoId: r.eventoId, ingressos: r.ingressos },
          emailProvider
        );
        if (mail.status === 'enviado') resultado.emailsEnviados += 1;
        if (await resolverIngressoPendente(db, pedidoId, { emailStatus: mail.status })) {
          resultado.resolvidos += 1;
          resultado.pendentes -= 1;
        }
        continue;
      }

      // Ainda incompleta (`sem_codigo_livre` persistente, erro por inscrito).
      const carimbo = await carimbarTentativaIngresso(db, pedidoId, {
        falhas: r.falhas,
        ...(r.eventoId !== null ? { eventoId: r.eventoId } : {}),
      });
      if (!carimbo.esgotado) continue;

      // ESGOTOU: o comprador não pode ficar sem nada. Manda o que existe (o
      // ingresso de quem saiu) e deixa o alerta contável para o humano fechar
      // o resto — o oposto de esperar para sempre por uma emissão completa.
      resultado.esgotados += 1;
      if (r.eventoId !== null && r.ingressos.length > 0) {
        const mail = await enviarEmailIngressos(
          db,
          { pedidoId, eventoId: r.eventoId, ingressos: r.ingressos },
          emailProvider
        );
        if (mail.status === 'enviado') resultado.emailsEnviados += 1;
      }
      logger.error('ingresso_orfao_esgotado', {
        pedidoId,
        eventoId: r.eventoId,
        tentativas: carimbo.tentativas,
        falhas: r.falhas,
        emitidos: r.ingressos.length,
      });
    } catch (err) {
      resultado.falhas += 1;
      logger.error('ingresso_orfao_varredura_falhou', {
        pedidoId,
        erro: err instanceof Error ? err.message.slice(0, 200) : String(err),
      });
    }
  }

  // O ALERTA (RN-382): pedido pago sem ingresso nunca é silêncio.
  logger.warn('ingressos_orfaos_pendentes', { ...resultado });
  return resultado;
}

/** Cron ADR-015 — mesma cadência do gêmeo do dinheiro (item 27). */
// ⚠️ PIXREAL-FIX T5 · P0 (2026-08-04): esta função subia com ZERO secrets
// declarados, e ela é a REDE DE SEGURANÇA da emissão de ingressos. Sem os
// bindings, `obterQrKeyring()` devolvia `null` e `selectEmailProvider()`
// devolvia o provider fail-closed a cada 15 minutos, para sempre: a varredura
// rodava, encontrava os pedidos pagos sem ingresso, tentava emitir, falhava
// por `sem_keyring` e registrava o alerta — sem nunca poder consertar nada.
// A rede que não pega é pior do que rede nenhuma, porque parece que existe.
export const varrerIngressosOrfaos = runWith({
  secrets: ['QR_TOKEN_KEYS', 'BREVO_API_KEY'],
})
  .pubsub.schedule('every 15 minutes')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    await varrerIngressosOrfaosCore(
      admin.firestore(),
      obterQrKeyring(),
      selectEmailProvider()
    );
    return null;
  });
