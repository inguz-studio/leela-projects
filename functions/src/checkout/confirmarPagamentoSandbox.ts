// =============================================================================
// functions/src/checkout/confirmarPagamentoSandbox.ts
//
// Gatilho de confirmação SANDBOX (LEELA-S1203 · "vender ponta a ponta" contra o
// MockPaymentProvider). No fluxo real, o gateway dispara o webhook assinado de
// forma assíncrona; sem Asaas, "o Mock dispara o webhook" (brief) — mas o
// CLIENTE não pode assinar (o segredo do webhook vive no servidor). Este
// callable É esse disparo: o dono clica "confirmar pagamento" e o servidor
// monta o payload ASSINADO e o entrega pela ÚNICA porta de confirmação
// (`processarWebhookPagamento`), fechando pedido→pago / inscrito→confirmado.
//
// NÃO redefine o produtor de escrita nem a porta de confirmação — REUSA
// `buildMockWebhookPayload` (assinatura mock) + `processarWebhookPagamento`
// (idempotência em 3 camadas, integridade cruzada de chargeId/valor). É glue de
// demo, não uma segunda porta financeira.
//
// FAIL-SAFE (Schneier): fecha com chave Asaas REAL configurada — nesse mundo é
// o gateway real que dispara o webhook, e um "confirmar sandbox" simularia
// dinheiro em ambiente produtivo (pior modo de falha). Só roda em sandbox.
//
// ⚠️ PIXREAL-FIX T1 (2026-08-04) — A ORDEM É O CONSERTO. O fail-safe acima
// existe desde a S1203 e sempre esteve correto; o que estava errado era QUANDO
// ele rodava. A callable montava `selectPaymentProvider()` como ARGUMENTO do
// core, então a construção do provider acontecia ANTES da primeira linha do
// guard. Em produção, com chave `$aact_prod_` e sem `ASAAS_WEBHOOK_AUTH_TOKEN`
// no `runWith`, essa construção levantava `AsaasConfigError` — que não é
// `HttpsError` — e o comprador recebia `internal` diante de um PIX de verdade.
// Agora o guard mora na PORTA (`confirmarPagamentoSandboxHandler`), antes de
// qualquer provider, exatamente como `pagamentoWebhook` já fazia (410 antes de
// tocar no selector). O guard do core permanece: defesa em profundidade.
//
// SEGURANÇA: exige auth (anon uid) e que o caller SEJA o responsável/pagador do
// pedido (`responsavel.atletaId === uid`) — ninguém confirma o pedido de outro.
// Idempotente por entrega: `eventId` determinístico por pedido → reenviar
// "confirmar" não duplica receita (ledger de webhookPagamento).
//
// ⚠️ FABLE-REVIEW (fiação de dinheiro): é o ponto que FLIPA o estado financeiro
// na demo. Conferir: (1) fail-closed com chave real; (2) ownership; (3) que o
// valor/chargeId vêm do doc persistido (não do cliente) — herdado de
// `processarWebhookPagamento`; (4) que existe SÓ no sandbox.
// =============================================================================

import * as admin from 'firebase-admin';
import { https, runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import type { PaymentProvider } from '@leela/core';
import { buildMockWebhookPayload } from '../payments/mockProvider';
import {
  hasAsaasKey,
  selectPaymentProvider,
  type ProviderEnv,
} from '../payments/selectProvider';
import { dispararContaSemFriccaoPosConfirmacao } from './contaSemFriccao';
import { dispararEmissaoIngressosPosConfirmacao } from '../eventos/emitirIngressos';
import { processarWebhookPagamento, WebhookRejeitadoError } from './webhookPagamento';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Input do disparo sandbox — só o pedido criado por `createInscricaoCharge`. */
export interface ConfirmarPagamentoSandboxInput {
  pedidoId: string;
}

/** Resultado — o que a UI usa para chegar à etapa Confirmação. */
export interface ConfirmarPagamentoSandboxResult {
  pedidoId: string;
  pagamentoId: string;
  chargeId: string;
  /** Status normalizado do gateway (confirmed no caminho feliz). */
  statusGateway: string;
  /** true = mesma entrega já processada (ledger) — reenvio idempotente. */
  duplicado: boolean;
  /** true = entrega registrada sem efeito (estado já final, etc.). */
  ignorado: boolean;
  /** Estado ATUAL do pedido após o disparo (pago no caminho feliz). */
  statusPedido: string;
}

/** Identidade do caller (anon uid — checkout sem login). */
export interface ConfirmarSandboxCaller {
  uid: string;
}

/**
 * A recusa de ambiente, escrita UMA vez (o guard da callable e o fail-safe do
 * core dizem a mesma frase — duas mensagens para o mesmo fato foi como este
 * incidente começou).
 */
export const MSG_SANDBOX_INDISPONIVEL =
  'Confirmação sandbox indisponível: há chave Asaas configurada — o gateway ' +
  'real dispara o webhook de confirmação.';

/**
 * GUARD DE AMBIENTE — a primeira coisa que a porta faz (PIXREAL-FIX T1).
 *
 * Espelha o que `pagamentoWebhook` já fazia (webhookPagamento.ts:832): fechar
 * ANTES de tocar no provider. A ordem é o conserto, não a checagem: o
 * `hasAsaasKey` do core sempre existiu, mas ele roda DEPOIS que a callable já
 * construiu o provider — e com chave de produção a construção era o que
 * levantava (`AsaasConfigError`, que não é `HttpsError`, logo `internal` na
 * cara do comprador). Guard primeiro ⇒ a recusa é TIPADA em qualquer
 * configuração de ambiente, inclusive nas quebradas.
 *
 * @throws HttpsError('failed-precondition') quando há gateway real. @pure-ish
 */
export function recusarSandboxComGatewayReal(env: ProviderEnv): void {
  if (hasAsaasKey(env)) {
    throw new https.HttpsError('failed-precondition', MSG_SANDBOX_INDISPONIVEL);
  }
}

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

/**
 * Dispara o webhook de confirmação ASSINADO para um pedido criado no sandbox.
 * Reusa a única porta de confirmação; idempotente por entrega.
 */
export async function confirmarPagamentoSandboxCore(
  db: Db,
  provider: PaymentProvider,
  rawInput: unknown,
  caller: ConfirmarSandboxCaller
): Promise<ConfirmarPagamentoSandboxResult> {
  // Fail-safe: sandbox NUNCA roda com chave real (o gateway real dispara o
  // hook). DEFESA EM PROFUNDIDADE desde o T1 — a porta já recusou antes de
  // construir o provider; esta linha segura quem chamar o core direto.
  recusarSandboxComGatewayReal(process.env);

  const pedidoId =
    rawInput && typeof rawInput === 'object'
      ? (rawInput as Record<string, unknown>)['pedidoId']
      : undefined;
  if (typeof pedidoId !== 'string' || pedidoId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"pedidoId" é obrigatório.');
  }

  const pedidoRef = db.collection('pedidos').doc(pedidoId);
  const pedidoSnap = await pedidoRef.get();
  if (!pedidoSnap.exists) {
    throw new https.HttpsError('not-found', `Pedido '${pedidoId}' não existe.`);
  }

  // Ownership: só o responsável/pagador confirma o próprio pedido.
  if (pedidoSnap.get('responsavel.atletaId') !== caller.uid) {
    throw new https.HttpsError(
      'permission-denied',
      'Este pedido pertence a outro pagador.'
    );
  }

  const pagamentoId = pedidoSnap.get('pagamentoRef') as string | null;
  if (!pagamentoId) {
    throw new https.HttpsError(
      'failed-precondition',
      'Pedido ainda sem cobrança criada.'
    );
  }

  const pagamentoSnap = await db.collection('pagamentos').doc(pagamentoId).get();
  if (!pagamentoSnap.exists) {
    throw new https.HttpsError('failed-precondition', 'Cobrança do pedido não encontrada.');
  }

  const chargeId = pagamentoSnap.get('gatewayChargeId') as string | null;
  const amount = pagamentoSnap.get('gatewayAmountCentavos') as number;
  if (!chargeId) {
    throw new https.HttpsError(
      'failed-precondition',
      'Cobrança ainda sem chargeId — tente novamente em instantes.'
    );
  }

  // Payload ASSINADO como o gateway mock enviaria. Valor/chargeId vêm do doc
  // persistido — `processarWebhookPagamento` ainda os confere contra o pagamento
  // (integridade cruzada). eventId determinístico → confirmar 2× não duplica.
  const payload = buildMockWebhookPayload('charge.confirmed', {
    chargeId,
    orderId: pedidoId,
    amount,
    eventId: `sandbox-confirm-${pedidoId}`,
  });

  let resultado;
  try {
    resultado = await processarWebhookPagamento(db, provider, payload);
  } catch (err) {
    if (err instanceof WebhookRejeitadoError) {
      // Mapeia o status HTTP do webhook para um código de callable honesto.
      const code = err.httpStatus === 404 ? 'not-found' : 'failed-precondition';
      throw new https.HttpsError(code, err.message);
    }
    throw err;
  }

  // CK2-T3 (RN-155): conta sem fricção PÓS-confirmação, best-effort — fora
  // da tx de dinheiro; falha aqui NUNCA quebra a confirmação.
  await dispararContaSemFriccaoPosConfirmacao(db, resultado);
  // S1206-T5 (RN-218/396): mesma janela pós-confirmação — é aqui que a
  // jornada de compra do preview passa a terminar com ingresso na mão.
  await dispararEmissaoIngressosPosConfirmacao(db, resultado);

  const statusPedido = (await pedidoRef.get()).get('status') as string;

  logger.info('checkout_confirmacao_sandbox', {
    pedidoId,
    chargeId,
    statusGateway: resultado.statusGateway,
    duplicado: resultado.duplicado,
    ignorado: resultado.ignorado,
  });

  return {
    pedidoId,
    pagamentoId,
    chargeId,
    statusGateway: resultado.statusGateway,
    duplicado: resultado.duplicado,
    ignorado: resultado.ignorado,
    statusPedido,
  };
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/**
 * O CORPO da porta, testável sem Firebase Functions em volta (PIXREAL-FIX T1).
 *
 * Existe porque a ORDEM é o contrato aqui, e ordem só se prova executando: o
 * defeito de produção era o `selectPaymentProvider()` avaliado como ARGUMENTO
 * do core, isto é, antes de qualquer linha do core rodar. Com o corpo em uma
 * função nomeada, o teste que falsifica ("chave de produção ⇒ recusa tipada,
 * não `internal`") roda contra o caminho de verdade, e não contra uma
 * reencenação dele.
 */
export async function confirmarPagamentoSandboxHandler(
  db: Db,
  rawInput: unknown,
  caller: ConfirmarSandboxCaller,
  env: ProviderEnv = process.env
): Promise<ConfirmarPagamentoSandboxResult> {
  // PRIMEIRA linha, antes do provider: com gateway real esta porta não existe,
  // e a recusa não pode depender de o provider conseguir ser construído.
  recusarSandboxComGatewayReal(env);
  return confirmarPagamentoSandboxCore(
    db,
    selectPaymentProvider(env),
    rawInput,
    caller
  );
}

/** `confirmarPagamentoSandbox` — disparo do webhook de confirmação (sandbox). */
// Item 11 (DEPLOY-PREVIEW): binding para o fail-safe hasAsaasKey do core
// recusar o disparo sandbox quando há gateway real configurado (produção).
//
// PIXREAL-FIX T2 · ASAAS_WEBHOOK_AUTH_TOKEN: o binding que faltava. Ele NÃO é
// o conserto (o conserto é a ordem, no T1) e não viaja sozinho — sozinho ele
// apenas trocaria o `internal` por um provider real construído com sucesso
// dentro da porta de simulação, que é o pior dos dois mundos. Com o guard na
// frente, o par existe para que o caminho de sandbox continue construindo o
// provider certo em ambiente de sandbox (chave `$aact_hmlg_` + token), sem
// nunca abrir em produção.
export const confirmarPagamentoSandbox = runWith({
  secrets: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_AUTH_TOKEN'],
}).https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return confirmarPagamentoSandboxHandler(admin.firestore(), data, {
    uid: context.auth.uid,
  });
});
