// =============================================================================
// functions/src/checkout/expirarPixPendente.ts
//
// Expiração da cobrança PIX (LEELA-CK2-T5 · RN-157 · DEC-0719 D-6),
// REORDENADA em S1209-PIXBE-T3 (item 3 dos escalados da review S1209-REV).
//
// TRANSIÇÃO (premissa CK2-4 — a máquina vigente não tinha estado "expirado"
// e o brief manda REUSAR a máquina): PIX pendente que passou de
// `pixExpiraEm` ⇒ pedido E pagamento `pendente → cancelado` (transição JÁ
// legal nas duas matrizes canônicas; TERMINAL) com carimbo
// `canceladoMotivo: 'pix_expirado'`. O pedido NÃO fica zumbi; a nova
// tentativa é NOVA COTAÇÃO + novo pedido com idempotencyKey nova.
//
// ── A ORDEM É O CONSERTO (S1209-PIXBE-T3) ───────────────────────────────────
// ANTES: marcava o pedido como expirado e deixava a cobrança viva no
// gateway. O comprador via "Código PIX expirado — nada foi cobrado de você"
// com um QR que o banco dele ainda aceitava; se pagasse, o webhook caía em
// 'estado_ja_final' e o dinheiro entrava sem inscrição. A tela era honesta
// sobre uma coisa que o servidor não tinha feito.
//
// AGORA: 1) cancela NO GATEWAY, 2) só então flipa os docs.
//
// FAIL-SAFE (a decisão que vale a pena declarar): se o gateway NÃO
// confirmar o cancelamento, o pedido NÃO vira expirado — a chamada devolve
// `failed-precondition`, que é a verdade literal ("a cobrança continua
// valendo"). Melhor um timer parado numa tela do que duas cobranças vivas
// ou um pedido morto com código pagável. Esse mesmo código é o que a tela
// já traduz como estado `contestado` (fix `59f18ed`): ela devolve a chave ao
// comprador e cala o relógio local — comportamento CORRETO aqui, porque a
// cobrança realmente segue de pé.
//
// COROLÁRIO: cobrança já PAGA não é cancelável no gateway ⇒ o cancelamento
// levanta ⇒ o pedido pago nunca é morto por timer. A guarda de corrida com
// o webhook (releitura in-tx) continua de pé como segunda linha.
//
// SEGURANÇA (a review antagonista ataca isto):
//   1. AUTORIZAÇÃO: só o DONO do pedido (responsavel.atletaId === uid) —
//      ou o CHAMADOR DE SISTEMA da varredura agendada (S322-T1 · RN-545),
//      que é a única outra forma de `ChamadorExpiracaoPix` e não vem de
//      input de cliente por caminho nenhum.
//   2. ANTI-ABUSO DE RELÓGIO: o servidor decide COM O PRÓPRIO relógio
//      (agoraCheckout injetado) — chamar ANTES da hora ⇒ failed-precondition
//      (esta porta NÃO é um "cancelar pedido" genérico).
//   3. TRANSACIONAL: releitura in-tx; só flipa se AMBOS seguem 'pendente'
//      (webhook confirmando em corrida vence — dinheiro pago nunca é
//      cancelado por timer). Estado já final ⇒ resposta idempotente.
//
// JANELA RESIDUAL (premissa CK2-4b — ESCALADA, não fechada aqui): entre a
// leitura e o DELETE no gateway existe um intervalo em que um pagamento já
// em voo pode ser aceito. Ele chega ao webhook e cai em
// 'ignorado_estado_final' — o ledger registra e nada de dinheiro se move
// sozinho, mas o dinheiro SAIU do comprador. O que fazer nesse caso
// (estorno automático × fila de reconciliação manual) é decisão de PRODUTO
// e está escalada no report desta lane; nenhum caminho novo foi inventado
// aqui.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https, runWith } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  MOTIVO_CANCELAMENTO_PIX_EXPIRADO,
  type PaymentProvider,
} from '@leela/core';
import { selectPaymentProvider } from '../payments/selectProvider';
import { agoraCheckout } from './relogioCheckout';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

export interface ExpirarPixPendenteInput {
  pedidoId: string;
}

export interface ExpirarPixPendenteResult {
  pedidoId: string;
  /** Estado do pedido APÓS a chamada. */
  statusPedido: string;
  /** true = ESTA chamada aplicou a transição pendente→cancelado. */
  expirado: boolean;
  /** true = pedido já estava em estado final (resposta idempotente). */
  jaFinal: boolean;
}

/**
 * Motivo TIPADO da recusa quando o gateway não confirma o cancelamento
 * (S1209-PIXBE-T3). Viaja no `details` do `failed-precondition` para a UI
 * distinguir "seu relógio está adiantado" de "não conseguimos matar a
 * cobrança" — as duas exigem o MESMO comportamento seguro na tela (devolver
 * a chave, não abrir outra cobrança), e por isso compartilham o code.
 */
export const MOTIVO_CANCELAMENTO_GATEWAY_FALHOU = 'cancelamento_gateway_falhou';

/**
 * QUEM está mandando expirar (S322-T1 · RN-545).
 *
 * O core nasceu com um chamador só — o DONO do pedido, autenticado, pela
 * porta pública. A RN-545 traz um segundo: a varredura agendada, que não tem
 * uid nenhum e precisa expirar pedido de qualquer comprador. As duas saídas
 * possíveis eram criar uma segunda máquina de cancelamento (duas
 * implementações do gateway-primeiro, do fail-safe e da guarda de corrida,
 * divergindo na primeira manutenção) ou dar ao core a distinção do chamador.
 * O precedente da casa é o segundo caminho: `encerrarPixAnteriorNaCriacao` já
 * reusa este mesmo core na trava do PIX.
 *
 * `{ sistema: true }` NÃO afrouxa a porta pública: o callable continua
 * construindo `{ uid: context.auth.uid }` byte a byte, e nenhum caminho leva
 * input do cliente a virar `sistema`. É union fechada — não existe
 * `{ uid, sistema }`, e por isso não existe "pedir para ser sistema".
 *
 * O que o sistema PULA: só a checagem de dono. Relógio do servidor,
 * gateway-primeiro, fail-safe e releitura transacional valem iguais para os
 * dois — a varredura não ganha nenhum atalho sobre dinheiro.
 */
export type ChamadorExpiracaoPix = { uid: string } | { sistema: true };

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function expirarPixPendenteCore(
  db: Db,
  provider: PaymentProvider,
  rawInput: unknown,
  caller: ChamadorExpiracaoPix,
  agora: () => Date = () => new Date()
): Promise<ExpirarPixPendenteResult> {
  const pedidoId =
    rawInput && typeof rawInput === 'object'
      ? (rawInput as Record<string, unknown>)['pedidoId']
      : undefined;
  if (typeof pedidoId !== 'string' || pedidoId.length === 0) {
    throw new https.HttpsError('invalid-argument', '"pedidoId" é obrigatório.');
  }

  const pedidoRef = db.collection('pedidos').doc(pedidoId);

  // ── FASE 1 · quem é, e a cobrança pode morrer? ────────────────────────────
  // Leitura + autorização + gates ANTES de tocar o gateway: cancelar
  // primeiro e descobrir depois que o chamador não era o dono seria dar a
  // qualquer um o poder de matar cobrança alheia.
  const pedidoSnap = await pedidoRef.get();
  if (!pedidoSnap.exists) {
    throw new https.HttpsError('not-found', `Pedido não existe.`);
  }
  // Ownership ANTES de qualquer informação de estado (não confirmar a um
  // sondador nem o status de pedido alheio).
  //
  // S322-T1: a VARREDURA não tem dono a apresentar — ela expira pedido de
  // qualquer comprador, e é esse o trabalho dela. O que ela pula é ESTA
  // checagem e só ela; tudo abaixo (relógio do servidor, gateway-primeiro,
  // fail-safe, releitura in-tx) roda idêntico. A porta pública segue
  // exigindo o dono, provado por teste de ataque.
  if (!('sistema' in caller)) {
    if (pedidoSnap.get('responsavel.atletaId') !== caller.uid) {
      throw new https.HttpsError(
        'permission-denied',
        'Este pedido pertence a outro pagador.'
      );
    }
  }

  const statusPedido = pedidoSnap.get('status') as string;
  if (statusPedido !== 'pendente') {
    // Idempotente: já pago/falhou/cancelado — nada a fazer, nem no gateway.
    return { pedidoId, statusPedido, expirado: false, jaFinal: true };
  }
  if (pedidoSnap.get('formaPagamento') !== 'pix') {
    throw new https.HttpsError(
      'failed-precondition',
      'Expiração por timer é exclusiva de PIX (RN-157).'
    );
  }

  const pagamentoId = pedidoSnap.get('pagamentoRef') as string | null;
  if (!pagamentoId) {
    throw new https.HttpsError(
      'failed-precondition',
      'Pedido ainda sem cobrança criada.'
    );
  }
  const pagamentoRef = db.collection('pagamentos').doc(pagamentoId);
  const pagamentoSnap = await pagamentoRef.get();
  if (!pagamentoSnap.exists || pagamentoSnap.get('status') !== 'pendente') {
    // Webhook venceu a corrida (confirmou/falhou) — dinheiro manda.
    return { pedidoId, statusPedido, expirado: false, jaFinal: true };
  }

  const pixExpiraEm = pagamentoSnap.get('pixExpiraEm') as
    | { toMillis?: () => number }
    | undefined;
  if (pixExpiraEm === undefined || typeof pixExpiraEm.toMillis !== 'function') {
    throw new https.HttpsError(
      'failed-precondition',
      'Cobrança sem expiração de PIX (pedido anterior à RN-157).'
    );
  }
  // Anti-abuso: o RELÓGIO DO SERVIDOR decide — antes da hora, nega.
  if (agora().getTime() < pixExpiraEm.toMillis()) {
    throw new https.HttpsError(
      'failed-precondition',
      'A cobrança PIX ainda não expirou.'
    );
  }

  // ── FASE 2 · matar a cobrança NO GATEWAY (antes dos docs) ─────────────────
  const chargeId = pagamentoSnap.get('gatewayChargeId') as string | null;
  if (chargeId) {
    try {
      await provider.cancelCharge({
        chargeId,
        tenantId: pagamentoSnap.get('tenantId') as string,
        reason: 'Expiração do PIX por prazo (RN-157)',
        // Idempotente POR PEDIDO: reentrar não gera efeito novo, e a chave
        // não muda entre tentativas do mesmo pedido.
        idempotencyKey: `cancel-${pedidoId}`,
      });
    } catch (err) {
      // FAIL-SAFE: o pedido continua VIVO. Não sabemos se a cobrança morreu,
      // e marcar expirado aqui recriaria exatamente o defeito que a review
      // pegou (tela dizendo "nada foi cobrado" sobre um código pagável).
      logger.error('pix_cancelamento_gateway_falhou', {
        pedidoId,
        erro: err instanceof Error ? err.message : String(err),
      });
      throw new https.HttpsError(
        'failed-precondition',
        'Não foi possível encerrar a cobrança no provedor de pagamento — ' +
          'ela CONTINUA válida. Não gere outra: pague esta ou tente de novo ' +
          'em alguns instantes.',
        { motivo: MOTIVO_CANCELAMENTO_GATEWAY_FALHOU, pedidoId }
      );
    }
  }
  // chargeId ausente = cobrança nunca chegou ao gateway (crash entre a
  // criação dos docs e o createCharge). Não há o que cancelar lá fora; o
  // flip abaixo fecha o pedido órfão.

  // ── FASE 3 · flipar os docs (com a corrida do webhook re-checada) ─────────
  const resultado = await db.runTransaction<ExpirarPixPendenteResult>(
    async (tx) => {
      const [pedidoFresco, pagamentoFresco] = await Promise.all([
        tx.get(pedidoRef),
        tx.get(pagamentoRef),
      ]);
      if (!pedidoFresco.exists) {
        throw new https.HttpsError('not-found', `Pedido não existe.`);
      }
      const statusFresco = pedidoFresco.get('status') as string;
      if (statusFresco !== 'pendente') {
        return { pedidoId, statusPedido: statusFresco, expirado: false, jaFinal: true };
      }
      if (!pagamentoFresco.exists || pagamentoFresco.get('status') !== 'pendente') {
        // Webhook confirmou ENTRE a fase 1 e aqui. O dinheiro manda: o
        // pedido não é cancelado. (No caminho normal isto é inalcançável —
        // cobrança paga não é cancelável no gateway e a fase 2 teria
        // levantado —, mas a guarda fica: é a última linha do dinheiro.)
        return { pedidoId, statusPedido: statusFresco, expirado: false, jaFinal: true };
      }

      const now = FieldValue.serverTimestamp();
      tx.update(pedidoRef, {
        status: 'cancelado',
        canceladoMotivo: MOTIVO_CANCELAMENTO_PIX_EXPIRADO,
        atualizadoEm: now,
      });
      tx.update(pagamentoRef, {
        status: 'cancelado',
        canceladoMotivo: MOTIVO_CANCELAMENTO_PIX_EXPIRADO,
        // Prova de que a cobrança foi morta LÁ FORA antes de morrer aqui —
        // a reconciliação sabe distinguir pedido cancelado com gateway
        // fechado de pedido cancelado sem cobrança nenhuma.
        gatewayCancelado: chargeId !== null,
        atualizadoEm: now,
      });
      // Inscritos permanecem 'pendente' — mesmo tratamento do caminho
      // 'falhou' do webhook (nova tentativa = NOVO pedido; nada ressuscita).
      return { pedidoId, statusPedido: 'cancelado', expirado: true, jaFinal: false };
    }
  );

  if (resultado.expirado) {
    logger.info('pix_expirado_cancelado', { pedidoId, gatewayCancelado: chargeId !== null }); // sem PII
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `expirarPixPendente` — o dono materializa a expiração do PIX (RN-157). */
// Task 8 (DEPLOY-PREVIEW, decisao do dono 2026-07-28): caminho REAL do
// dinheiro ligado - secrets do gateway em producao (Mock permanece no
// emulador, onde ASAAS_API_KEY e vazia por contrato - item 51).
export const expirarPixPendente = runWith({
  secrets: ['ASAAS_API_KEY', 'ASAAS_WEBHOOK_AUTH_TOKEN'],
}).https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return expirarPixPendenteCore(
    admin.firestore(),
    selectPaymentProvider(),
    data,
    { uid: context.auth.uid },
    agoraCheckout
  );
});
