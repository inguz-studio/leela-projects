// =============================================================================
// functions/src/checkout/webhookAsaas.ts
//
// Camada HTTP do webhook REAL do Asaas (LEELA-R6 · ativação sandbox —
// checklist §3 do ASAAS-ADAPTER-REPORT). NÃO é uma segunda porta financeira:
// monta o WebhookPayload do POST do Asaas e entra pela MESMA porta única
// (`processarWebhookPagamento`), com toda a idempotência em 3 camadas e a
// integridade cruzada de chargeId/valor herdadas.
//
// Montagem (contrato documentado no adapter):
//   - header `asaas-access-token` → `payload.signature` (o adapter compara
//     em TEMPO CONSTANTE com ASAAS_WEBHOOK_AUTH_TOKEN, ANTES de qualquer
//     leitura de `payment` — a montagem valida só o SHAPE mínimo do corpo
//     [objeto + `event` string] para conseguir montar o payload; nenhum
//     campo de negócio é lido antes do verify);
//   - corpo do POST (`{ id: 'evt_...', event, payment, dateCreated }`) →
//     `payload.data`;
//   - `orderId` derivado do `externalReference` da cobrança
//     (`orderId::idempotencyKey` — parseExternalReference, gravado por nós
//     na criação) e `eventId` (id da ENTREGA `evt_...`) injetados em
//     `data` para o lookup O(1) e o ledger por entrega do core.
//
// SEGURANÇA:
//   - Token do header NUNCA é logado (nem em erro) — logs só carregam
//     event/chargeId/pedidoId.
//   - Evento autêntico de cobrança SEM externalReference nosso (cobrança
//     criada fora do checkout) → ACK 200 sem efeito: responder 4xx a
//     entregas benignas alimenta as 15 falhas que PAUSAM a fila de webhooks
//     do Asaas (docs/sobre-os-webhooks) — e nenhum efeito financeiro
//     acontece de qualquer forma.
//   - Endpoint só opera com o AsaasProvider ativo (chave presente). Sem
//     chave → 503 fail-closed (o mock tem a própria porta assinada).
//
// CARTÃO (checklist §4): na confirmação de cartão o parse do adapter expõe
// `{ bandeira, ultimos4, parcelas? }` — repassado ao core via `extras`, que
// persiste o bloco `pagamento.cartao` NA MESMA transação da confirmação
// (valorParcela/valorTotalComJuros derivados do valor congelado do doc,
// nunca do gateway).
// =============================================================================

import * as admin from 'firebase-admin';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import type { PaymentProvider, WebhookPayload } from '@leela/core';
import {
  AsaasError,
  AsaasProvider,
  AsaasWebhookAssinaturaError,
} from '../payments/asaasProvider';
import { selectPaymentProvider } from '../payments/selectProvider';
import {
  processarWebhookPagamento,
  WebhookRejeitadoError,
  type ResultadoWebhookPagamento,
} from './webhookPagamento';

type Db = admin.firestore.Firestore;

/** Header de autenticação de entrega do Asaas (docs/sobre-os-webhooks). */
export const ASAAS_TOKEN_HEADER = 'asaas-access-token';

// ---------------------------------------------------------------------------
// Montagem do payload (pura — testável sem HTTP)
// ---------------------------------------------------------------------------

/**
 * POST do Asaas → WebhookPayload do contrato ADR-006. Valida SÓ o shape
 * mínimo para montar; autenticidade e parse são do adapter (verify →
 * parse, nesta ordem). @pure
 */
export function montarPayloadAsaas(
  tokenHeader: unknown,
  rawBody: unknown
): WebhookPayload {
  if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
    throw new WebhookRejeitadoError(400, 'Corpo de webhook inválido.');
  }
  const body = rawBody as Record<string, unknown>;
  const event = body['event'];
  if (typeof event !== 'string' || event.length === 0) {
    throw new WebhookRejeitadoError(400, 'Webhook sem "event".');
  }
  const dateCreated = body['dateCreated'];
  return {
    event,
    data: body,
    // Header ausente vira string vazia — o verify do adapter rejeita
    // (assinatura vazia = não-autêntico), nunca um crash de tipo.
    signature: typeof tokenHeader === 'string' ? tokenHeader : '',
    deliveredAt:
      typeof dateCreated === 'string' && dateCreated.length > 0
        ? dateCreated
        : new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; onRequest é wrapper fino)
// ---------------------------------------------------------------------------

/** Resultado do processamento de uma entrega do Asaas. */
export type ResultadoWebhookAsaas =
  | { tipo: 'processado'; resultado: ResultadoWebhookPagamento }
  /**
   * Entrega AUTÊNTICA de cobrança sem `externalReference` do nosso formato
   * (`orderId::idempotencyKey`) — cobrança criada fora do checkout. ACK sem
   * efeito (nunca 4xx em entrega benigna — pausa da fila do Asaas).
   */
  | { tipo: 'ignorado_sem_pedido'; event: string; chargeId: string };

/**
 * Processa uma entrega do webhook Asaas de ponta a ponta:
 * verify (tempo constante) → parse → derivação de orderId/eventId → porta
 * única (`processarWebhookPagamento`, com bloco cartao quando presente).
 */
export async function processarWebhookAsaas(
  db: Db,
  provider: AsaasProvider,
  tokenHeader: unknown,
  rawBody: unknown
): Promise<ResultadoWebhookAsaas> {
  const payload = montarPayloadAsaas(tokenHeader, rawBody);

  // Verify + parse DELEGADOS ao adapter (autenticidade antes de qualquer
  // leitura de campo — invariante provada na suíte do adapter).
  let detalhes;
  try {
    detalhes = provider.parseWebhook(payload);
  } catch (err) {
    if (err instanceof AsaasWebhookAssinaturaError) {
      throw new WebhookRejeitadoError(401, 'Assinatura de webhook inválida.');
    }
    if (err instanceof AsaasError) {
      // Shape/evento fora do contrato mapeado — mensagem pública genérica
      // (detalhe fica no log estruturado do endpoint, sem token/PII).
      throw new WebhookRejeitadoError(400, 'Webhook rejeitado pelo provider.');
    }
    throw err;
  }

  if (detalhes.orderId === undefined) {
    return {
      tipo: 'ignorado_sem_pedido',
      event: detalhes.event,
      chargeId: detalhes.chargeId,
    };
  }

  // Injeta orderId (lookup O(1) — ADR-011) e eventId (ledger por ENTREGA,
  // id `evt_...` do Asaas) no data — o core segue agnóstico de gateway.
  const payloadEnriquecido: WebhookPayload = {
    ...payload,
    data: {
      ...payload.data,
      orderId: detalhes.orderId,
      eventId: detalhes.eventId,
    },
  };

  const resultado = await processarWebhookPagamento(
    db,
    provider,
    payloadEnriquecido,
    // `origem` marca entrega de gateway REAL (habilita o warn de cartão sem
    // dados no core sem tocar o fluxo mock — fix review R6 #4).
    detalhes.cartao !== undefined
      ? { origem: 'asaas', cartao: detalhes.cartao }
      : { origem: 'asaas' }
  );
  return { tipo: 'processado', resultado };
}

// ---------------------------------------------------------------------------
// Endpoint HTTP (v1 — mesmo runtime dos módulos existentes)
// ---------------------------------------------------------------------------

/**
 * `asaasWebhook` — endpoint que o Asaas chama (cadastro do webhook aponta
 * para cá com o authToken). A autenticação É o token do header, comparado
 * em tempo constante pelo adapter; erros respondem mensagens públicas
 * genéricas — detalhes só no log estruturado (NUNCA o token, nunca PII).
 */
export const asaasWebhook = https.onRequest(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Método não suportado.' });
    return;
  }

  let provider: PaymentProvider;
  try {
    provider = selectPaymentProvider();
  } catch (err) {
    // Chave presente com config inválida — indisponível de propósito
    // (fail-hard do selector; NUNCA degrada para Mock).
    logger.error('webhook_asaas_provider_indisponivel', {
      err: err instanceof Error ? err.message : String(err),
    });
    res.status(503).json({ ok: false, error: 'Provider indisponível.' });
    return;
  }
  if (!(provider instanceof AsaasProvider)) {
    // Sem chave Asaas o endpoint não tem quem autentique a entrega —
    // fail-closed (o fluxo mock usa a própria porta assinada).
    res.status(503).json({ ok: false, error: 'Gateway indisponível.' });
    return;
  }

  try {
    const r = await processarWebhookAsaas(
      admin.firestore(),
      provider,
      req.get(ASAAS_TOKEN_HEADER),
      req.body
    );
    if (r.tipo === 'ignorado_sem_pedido') {
      logger.warn('webhook_asaas_sem_pedido', {
        event: r.event,
        chargeId: r.chargeId,
      });
      res.status(200).json({ ok: true, ignorado: true });
      return;
    }
    logger.info('webhook_asaas_processado', {
      pedidoId: r.resultado.pedidoId,
      chargeId: r.resultado.chargeId,
      statusGateway: r.resultado.statusGateway,
      duplicado: r.resultado.duplicado,
      ignorado: r.resultado.ignorado,
    });
    res.status(200).json({
      ok: true,
      duplicado: r.resultado.duplicado,
      ignorado: r.resultado.ignorado,
    });
  } catch (err) {
    if (err instanceof WebhookRejeitadoError) {
      logger.warn('webhook_asaas_rejeitado', {
        httpStatus: err.httpStatus,
        motivo: err.message,
      });
      res.status(err.httpStatus).json({ ok: false, error: err.message });
      return;
    }
    logger.error('webhook_asaas_falha', {
      err: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ ok: false, error: 'Falha interna.' });
  }
});
