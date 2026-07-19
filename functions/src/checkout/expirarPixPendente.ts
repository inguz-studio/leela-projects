// =============================================================================
// functions/src/checkout/expirarPixPendente.ts
//
// Expiração da cobrança PIX (LEELA-CK2-T5 · RN-157 · DEC-0719 D-6).
//
// TRANSIÇÃO ESCOLHIDA (premissa CK2-4 — a máquina vigente não tinha estado
// "expirado" e o brief manda REUSAR a máquina): PIX pendente que passou de
// `pixExpiraEm` ⇒ pedido E pagamento `pendente → cancelado` (transição JÁ
// legal nas duas matrizes canônicas; TERMINAL) com carimbo
// `canceladoMotivo: 'pix_expirado'`. O pedido NÃO fica zumbi; a nova
// tentativa é NOVA COTAÇÃO + novo pedido com idempotencyKey nova (o caminho
// de retry BC-1 que a UI já tem) — exatamente o comportamento vigente de
// `falhou`/`cancelado`.
//
// SEGURANÇA (a review antagonista ataca isto):
//   1. AUTORIZAÇÃO: só o DONO do pedido (responsavel.atletaId === uid) —
//      ninguém expira pedido alheio.
//   2. ANTI-ABUSO DE RELÓGIO: o servidor decide COM O PRÓPRIO relógio
//      (agoraCheckout injetado) — chamar ANTES da hora ⇒ failed-precondition
//      (esta porta NÃO é um "cancelar pedido" genérico).
//   3. TRANSACIONAL: releitura in-tx; só flipa se AMBOS seguem 'pendente'
//      (webhook confirmando em corrida vence — dinheiro pago nunca é
//      cancelado por timer). Estado já final ⇒ resposta idempotente.
//
// JANELA RESIDUAL (premissa CK2-4b, documentada): no Asaas real o dueDate é
// DIA — um pagamento aceito pelo gateway APÓS o cancelamento chega ao
// webhook e cai em 'ignorado_estado_final' (ledger registra; reconciliação
// manual/estorno — raro e observável). Follow-up de produção: cancelar a
// cobrança no gateway no mesmo fluxo.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
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

// ---------------------------------------------------------------------------
// Núcleo (testável com Admin SDK contra o Emulator; callable é wrapper fino)
// ---------------------------------------------------------------------------

export async function expirarPixPendenteCore(
  db: Db,
  rawInput: unknown,
  caller: { uid: string },
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

  const resultado = await db.runTransaction<ExpirarPixPendenteResult>(
    async (tx) => {
      const pedidoSnap = await tx.get(pedidoRef);
      if (!pedidoSnap.exists) {
        throw new https.HttpsError('not-found', `Pedido não existe.`);
      }
      // Ownership ANTES de qualquer informação de estado (não confirmar a
      // um sondador nem o status de pedido alheio).
      if (pedidoSnap.get('responsavel.atletaId') !== caller.uid) {
        throw new https.HttpsError(
          'permission-denied',
          'Este pedido pertence a outro pagador.'
        );
      }

      const statusPedido = pedidoSnap.get('status') as string;
      if (statusPedido !== 'pendente') {
        // Idempotente: já pago/falhou/cancelado — nada a fazer.
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
      const pagamentoSnap = await tx.get(pagamentoRef);
      if (!pagamentoSnap.exists || pagamentoSnap.get('status') !== 'pendente') {
        // Webhook venceu a corrida (confirmou/falhou) — dinheiro manda.
        return {
          pedidoId,
          statusPedido,
          expirado: false,
          jaFinal: true,
        };
      }

      const pixExpiraEm = pagamentoSnap.get('pixExpiraEm') as
        | { toMillis?: () => number }
        | undefined;
      if (
        pixExpiraEm === undefined ||
        typeof pixExpiraEm.toMillis !== 'function'
      ) {
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

      const now = FieldValue.serverTimestamp();
      tx.update(pedidoRef, {
        status: 'cancelado',
        canceladoMotivo: 'pix_expirado',
        atualizadoEm: now,
      });
      tx.update(pagamentoRef, {
        status: 'cancelado',
        canceladoMotivo: 'pix_expirado',
        atualizadoEm: now,
      });
      // Inscritos permanecem 'pendente' — mesmo tratamento do caminho
      // 'falhou' do webhook (nova tentativa = NOVO pedido; nada ressuscita).
      return { pedidoId, statusPedido: 'cancelado', expirado: true, jaFinal: false };
    }
  );

  if (resultado.expirado) {
    logger.info('pix_expirado_cancelado', { pedidoId }); // sem PII
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Callable
// ---------------------------------------------------------------------------

/** `expirarPixPendente` — o dono materializa a expiração do PIX (RN-157). */
export const expirarPixPendente = https.onCall(async (data: unknown, context) => {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return expirarPixPendenteCore(
    admin.firestore(),
    data,
    { uid: context.auth.uid },
    agoraCheckout
  );
});
