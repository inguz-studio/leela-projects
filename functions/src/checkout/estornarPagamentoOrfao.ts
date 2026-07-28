// =============================================================================
// estornarPagamentoOrfao — LEELA-ESTORNO-T5 (item 27 · RN-379/380)
//
// O RETARDATÁRIO: o pedido foi cancelado (ex.: PIX expirou — o gateway foi
// mandado cancelar e o pedido/pagamento viraram 'cancelado'), e SÓ DEPOIS a
// confirmação de pagamento chega pelo webhook. O dinheiro entrou; ninguém tem
// inscrição. Decisão do dono (item 27): estorno automático, com contador e
// alerta sobre o extrato antes do gatilho.
//
// Por que um caminho PRÓPRIO e não `estornarInscricaoCore` (L9 do inventário):
// o primitivo por inscrito exige pagamento e inscrito `confirmado`; aqui o
// pagamento está `cancelado` (estado TERMINAL da máquina de pagamento) e os
// inscritos nunca confirmaram. Não há efeito local a reverter — receita nunca
// agregou, kit nunca contou, vaga nunca virou. O único efeito é devolver o
// dinheiro no gateway e fechar o livro.
//
// O que este módulo REUSA do FABLE-B/T1 (mesma máquina, mesmo carimbo, mesma
// autoridade de webhook — RN-370/371/372):
//   - os ESTADOS do ledger e os predicados (`podeEnviarRefund`,
//     `carimboEstornoVivo`, `STATUS_ESTORNO_CONFIRMAVEL`, `motivoCarimboVivo`);
//   - a classificação de falha (`falhaRefundSemEfeito`) — "não sei" vale
//     como "pode ter acontecido";
//   - a disciplina: carimbo COMMITADO antes do POST, nunca re-enviar sobre
//     carimbo vivo, `pending` do gateway = quem fecha é o webhook.
//
// Ledger próprio: `pagamentos/{id}/estornosOrfaos/total` — docId FIXO porque
// o refund do órfão é TOTAL (amount omitido — contrato PaymentProvider) e há
// no máximo UM por pagamento, não importa quantas entregas retardatárias
// cheguem. Nenhuma Rule abre esta subcoleção: deny-by-default, só Function.
//
// Extrato/contador (RN-380): `estornosOrfaosPendentes/{pagamentoId}` — doc
// top-level criado NA MESMA transação da entrega retardatária. A varredura
// agendada conta, alerta e re-dispara o que o dispatch inline não fechou.
// Registro em vez de collectionGroup no ledger de entregas: mesma garantia
// (nada não-tratado fica invisível — nasce junto da detecção, na mesma tx),
// sem índice de grupo novo e sem varrer todas as entregas de webhook.
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { https, pubsub } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import type { PaymentProvider } from '@leela/core';
import {
  STATUS_ESTORNO_CONFIRMAVEL,
  type StatusEstornoLedger,
  carimboEstornoVivo,
  falhaRefundSemEfeito,
  motivoCarimboVivo,
  podeEnviarRefund,
} from './estornarInscricao';
import { selectPaymentProvider } from '../payments/selectProvider';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Nomes e chaves
// ---------------------------------------------------------------------------

/** Subcoleção-ledger do estorno ÓRFÃO (write só Function; sem Rule = deny). */
export const ESTORNOS_ORFAOS_SUBCOL = 'estornosOrfaos';

/** docId fixo do ledger órfão: o refund é TOTAL, no máximo UM por pagamento. */
export const ESTORNO_ORFAO_DOC_ID = 'total';

/** Coleção top-level do EXTRATO de retardatários pendentes (RN-380). */
export const ORFAOS_PENDENTES_COL = 'estornosOrfaosPendentes';

/**
 * Chave de idempotência do refund órfão no gateway — determinística por
 * pagamento (retry/replay reusa a MESMA chave — RN-333/ADR-006). @pure
 */
export function refundOrfaoIdempotencyKey(pagamentoId: string): string {
  return `refund-orfao-${pagamentoId}`;
}

// ---------------------------------------------------------------------------
// Extrato (RN-380) — nasce NA MESMA transação da entrega retardatária
// ---------------------------------------------------------------------------

export interface RegistroRetardatario {
  pagamentoId: string;
  pedidoId: string;
  chargeId: string;
  /** eventId da ENTREGA de webhook que denunciou o retardatário. */
  entregaEventId: string;
  /** Valor total cobrado (centavos) — o que o estorno TOTAL deve devolver. */
  amountCentavos: number;
  tenantId: string;
}

/**
 * Grava o retardatário no extrato, na MESMA tx da entrega (fase de escrita).
 * docId = pagamentoId: a segunda entrega retardatária do mesmo pagamento
 * ACUMULA (`entregas`+1) em vez de duplicar a pendência.
 *
 * `extratoJaExiste` vem de um `tx.get` do CHAMADOR (fase de leitura): quando o
 * doc já existe, o merge NÃO toca `resolvido` — detecção nunca des-resolve um
 * estorno já concluído (o ledger órfão é quem barra dinheiro duplo, RN-371).
 */
export function registrarRetardatarioNaTx(
  tx: admin.firestore.Transaction,
  db: Db,
  registro: RegistroRetardatario,
  extratoJaExiste: boolean
): void {
  const ref = db.collection(ORFAOS_PENDENTES_COL).doc(registro.pagamentoId);
  tx.set(
    ref,
    {
      ...registro,
      ...(extratoJaExiste ? {} : { resolvido: false, detectadoEm: FieldValue.serverTimestamp() }),
      entregas: FieldValue.increment(1),
      atualizadoEm: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

// ---------------------------------------------------------------------------
// Núcleo — mesma coreografia do T1: compromisso → carimbo → POST → desfecho
// ---------------------------------------------------------------------------

export interface EstornoOrfaoResult {
  pagamentoId: string;
  pedidoId: string;
  refundId: string;
  valorCentavos: number;
  estado: 'aprovado' | 'solicitado';
  /** true = replay/carimbo vivo — NENHUM POST novo saiu desta chamada. */
  duplicado: boolean;
  /** true = gateway aceitou ('pending'); quem fecha é o webhook (RN-372). */
  aguardandoConfirmacao: boolean;
}

interface CompromissoOrfao {
  statusLedger: StatusEstornoLedger;
  pedidoId: string;
  chargeId: string;
  tenantId: string;
  valorCentavos: number;
  refundId?: string;
}

/** TX1: cria (ou lê) o compromisso `estornosOrfaos/total` do pagamento. */
async function comprometerEstornoOrfao(
  db: Db,
  pagamentoId: string
): Promise<CompromissoOrfao> {
  const pagamentoRef = db.collection('pagamentos').doc(pagamentoId);
  const ledgerRef = pagamentoRef
    .collection(ESTORNOS_ORFAOS_SUBCOL)
    .doc(ESTORNO_ORFAO_DOC_ID);

  return db.runTransaction(async (tx) => {
    const pagamentoSnap = await tx.get(pagamentoRef);
    if (!pagamentoSnap.exists) {
      throw new https.HttpsError('not-found', 'Pagamento do estorno órfão não existe.');
    }
    // Guard do cenário: o caminho órfão SÓ existe para pagamento cancelado
    // (item 27). Qualquer outro estado tem dono — o T1 ou nada.
    const status = String(pagamentoSnap.get('status'));
    if (status !== 'cancelado') {
      throw new https.HttpsError(
        'failed-precondition',
        `Pagamento '${status}' não é órfão — estorno órfão só para 'cancelado' (RN-379).`
      );
    }
    const chargeId = pagamentoSnap.get('gatewayChargeId') as string | null;
    const valorCentavos = pagamentoSnap.get('gatewayAmountCentavos') as number | null;
    if (typeof chargeId !== 'string' || chargeId.length === 0 || typeof valorCentavos !== 'number') {
      throw new https.HttpsError(
        'failed-precondition',
        'Pagamento cancelado sem chargeId/valor do gateway — conferência manual.'
      );
    }
    const pedidoId = (pagamentoSnap.get('pedidoRef') as string | null) ?? '';
    const tenantId = (pagamentoSnap.get('tenantId') as string | null) ?? '';

    const ledgerSnap = await tx.get(ledgerRef);
    if (!ledgerSnap.exists) {
      tx.create(ledgerRef, {
        status: 'pendente',
        pedidoId,
        chargeId,
        tenantId,
        valorCentavos,
        motivo: 'Pagamento confirmado após cancelamento (item 27 · RN-379).',
        criadoEm: FieldValue.serverTimestamp(),
      });
      return { statusLedger: 'pendente', pedidoId, chargeId, tenantId, valorCentavos };
    }
    return {
      statusLedger: String(ledgerSnap.get('status')) as StatusEstornoLedger,
      pedidoId: (ledgerSnap.get('pedidoId') as string) ?? pedidoId,
      chargeId: (ledgerSnap.get('chargeId') as string) ?? chargeId,
      tenantId: (ledgerSnap.get('tenantId') as string) ?? tenantId,
      valorCentavos: (ledgerSnap.get('valorCentavos') as number) ?? valorCentavos,
      ...(typeof ledgerSnap.get('refundId') === 'string'
        ? { refundId: ledgerSnap.get('refundId') as string }
        : {}),
    };
  });
}

/** Compare-and-set 'pendente'→'enviando', COMMITADO antes do POST (RN-370). */
async function carimbarEnvioOrfao(db: Db, pagamentoId: string): Promise<boolean> {
  const ledgerRef = db
    .collection('pagamentos')
    .doc(pagamentoId)
    .collection(ESTORNOS_ORFAOS_SUBCOL)
    .doc(ESTORNO_ORFAO_DOC_ID);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ledgerRef);
    if (!snap.exists) {
      throw new https.HttpsError(
        'internal',
        'Ledger do estorno órfão desapareceu antes do envio — intervenção manual.'
      );
    }
    if (!podeEnviarRefund(String(snap.get('status')))) return false;
    const tentativas =
      typeof snap.get('tentativasEnvio') === 'number'
        ? (snap.get('tentativasEnvio') as number)
        : 0;
    tx.update(ledgerRef, {
      status: 'enviando',
      envioIniciadoEm: FieldValue.serverTimestamp(),
      tentativasEnvio: tentativas + 1,
    });
    return true;
  });
}

/** Move o carimbo órfão, com a trilha do porquê. */
async function marcarCarimboOrfao(
  db: Db,
  pagamentoId: string,
  status: StatusEstornoLedger,
  extras: Record<string, unknown> = {}
): Promise<void> {
  await db
    .collection('pagamentos')
    .doc(pagamentoId)
    .collection(ESTORNOS_ORFAOS_SUBCOL)
    .doc(ESTORNO_ORFAO_DOC_ID)
    .update({ status, ...extras, carimboAtualizadoEm: FieldValue.serverTimestamp() });
}

/** Fecha o livro: ledger 'aprovado' + extrato resolvido + carimbo no pagamento. */
async function aprovarEstornoOrfao(
  db: Db,
  pagamentoId: string,
  refundId: string
): Promise<{ duplicado: boolean }> {
  const pagamentoRef = db.collection('pagamentos').doc(pagamentoId);
  const ledgerRef = pagamentoRef
    .collection(ESTORNOS_ORFAOS_SUBCOL)
    .doc(ESTORNO_ORFAO_DOC_ID);
  const extratoRef = db.collection(ORFAOS_PENDENTES_COL).doc(pagamentoId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ledgerRef);
    if (!snap.exists) {
      throw new https.HttpsError('internal', 'Ledger do estorno órfão sumiu na aprovação.');
    }
    if (String(snap.get('status')) === 'aprovado') return { duplicado: true };
    const agora = FieldValue.serverTimestamp();
    tx.update(ledgerRef, { status: 'aprovado', refundId, aprovadoEm: agora });
    // Nenhum agregado a reverter: a confirmação retardatária foi IGNORADA
    // (receita/kit/vaga nunca entraram). O efeito local é só o livro fechar.
    tx.update(pagamentoRef, { estornoOrfaoRefundId: refundId, estornoOrfaoEm: agora });
    tx.set(extratoRef, { resolvido: true, resolvidoEm: agora, refundId }, { merge: true });
    return { duplicado: false };
  });
}

/**
 * Estorna (TOTAL) um pagamento órfão — pagamento `cancelado` cuja confirmação
 * chegou tarde. Mesma coreografia do T1: compromisso → carimbo antes do POST
 * (RN-370) → nunca re-enviar sobre carimbo vivo (RN-371) → `pending` do
 * gateway aguarda o webhook (RN-372). Idempotente por ledger (docId fixo).
 */
export async function estornarPagamentoOrfaoCore(
  db: Db,
  provider: PaymentProvider,
  pagamentoId: string
): Promise<EstornoOrfaoResult> {
  const compromisso = await comprometerEstornoOrfao(db, pagamentoId);
  const base = {
    pagamentoId,
    pedidoId: compromisso.pedidoId,
    valorCentavos: compromisso.valorCentavos,
  };

  if (compromisso.statusLedger === 'aprovado') {
    return {
      ...base,
      refundId: compromisso.refundId ?? '',
      estado: 'aprovado',
      duplicado: true,
      aguardandoConfirmacao: false,
    };
  }

  if (carimboEstornoVivo(compromisso.statusLedger)) {
    if (compromisso.statusLedger === 'solicitado') {
      // Já pedimos; o gateway aceitou; a palavra final é do webhook (RN-372).
      return {
        ...base,
        refundId: compromisso.refundId ?? '',
        estado: 'solicitado',
        duplicado: true,
        aguardandoConfirmacao: true,
      };
    }
    throw new https.HttpsError(
      'failed-precondition',
      motivoCarimboVivo(compromisso.statusLedger)
    );
  }

  const carimbou = await carimbarEnvioOrfao(db, pagamentoId);
  if (!carimbou) {
    throw new https.HttpsError(
      'failed-precondition',
      'Outro estorno deste pagamento órfão já está em andamento — nenhuma ' +
        'segunda solicitação foi enviada (RN-371).'
    );
  }

  // POST TOTAL — `amount` OMITIDO de propósito (contrato PaymentProvider:
  // refund sem amount = devolve a cobrança inteira). O órfão não tem linha:
  // ninguém ficou inscrito, devolve-se tudo.
  let refund;
  try {
    refund = await provider.refund({
      chargeId: compromisso.chargeId,
      tenantId: compromisso.tenantId,
      reason: 'Estorno automático: pagamento confirmado após cancelamento (RN-379).',
      idempotencyKey: refundOrfaoIdempotencyKey(pagamentoId),
    });
  } catch (err) {
    const semEfeito = falhaRefundSemEfeito(err);
    const detalhe = err instanceof Error ? err.message : String(err);
    await marcarCarimboOrfao(db, pagamentoId, semEfeito ? 'pendente' : 'gateway_sem_resposta', {
      ultimaFalhaEnvio: detalhe.slice(0, 500),
    });
    if (semEfeito) throw err;
    logger.error('estorno_orfao_gateway_sem_resposta', {
      pagamentoId,
      erro: detalhe.slice(0, 200),
    });
    throw new https.HttpsError('failed-precondition', motivoCarimboVivo('gateway_sem_resposta'));
  }

  // Integridade cruzada: o refund TOTAL deve devolver exatamente o total
  // cobrado. Divergência trava o ledger — re-enviar por cima de valor errado
  // é somar erro a erro (RN-371).
  if (refund.amount !== compromisso.valorCentavos) {
    await marcarCarimboOrfao(db, pagamentoId, 'divergencia_valor', {
      refundId: refund.refundId,
      valorDevolvidoCentavos: refund.amount,
    });
    throw new https.HttpsError(
      'internal',
      `Refund órfão do gateway (${refund.amount}) diverge do total cobrado ` +
        `(${compromisso.valorCentavos}) — conferência manual.`
    );
  }

  if (refund.status === 'rejected') {
    await marcarCarimboOrfao(db, pagamentoId, 'rejeitado_gateway', {
      refundId: refund.refundId,
    });
    throw new https.HttpsError('failed-precondition', motivoCarimboVivo('rejeitado_gateway'));
  }

  await marcarCarimboOrfao(db, pagamentoId, 'solicitado', {
    refundId: refund.refundId,
    solicitadoEm: FieldValue.serverTimestamp(),
  });

  if (refund.status !== 'approved') {
    // 'pending' — decisão 46: a autoridade do desfecho é o webhook.
    logger.info('estorno_orfao_solicitado_aguardando_webhook', {
      pagamentoId,
      refundId: refund.refundId,
      valorCentavos: compromisso.valorCentavos,
    });
    return {
      ...base,
      refundId: refund.refundId,
      estado: 'solicitado',
      duplicado: false,
      aguardandoConfirmacao: true,
    };
  }

  const efeito = await aprovarEstornoOrfao(db, pagamentoId, refund.refundId);
  logger.info('estorno_orfao_aprovado', {
    pagamentoId,
    refundId: refund.refundId,
    valorCentavos: compromisso.valorCentavos,
    duplicado: efeito.duplicado,
  });
  return {
    ...base,
    refundId: refund.refundId,
    estado: 'aprovado',
    duplicado: efeito.duplicado,
    aguardandoConfirmacao: false,
  };
}

// ---------------------------------------------------------------------------
// Fechamento pelo webhook (RN-372) — a mesma autoridade do T1
// ---------------------------------------------------------------------------

export interface ResultadoConfirmacaoOrfao {
  aplicado: boolean;
  motivo: 'confirmado' | 'ja_aprovado' | 'sem_ledger_orfao' | 'sem_carimbo_vivo' | 'divergencia_valor';
}

/**
 * Fecha o ledger órfão a partir do `PAYMENT_REFUNDED` — chamado pela porta de
 * webhook DEPOIS do fechamento T1 devolver `sem_carimbo_vivo` (o refund pode
 * ser de inscrição OU do órfão; o T1 tem precedência porque casa por
 * refundId/valor). Valor divergente NÃO fecha: trava para conferência.
 */
export async function confirmarEstornoOrfaoPorWebhook(
  db: Db,
  pagamentoId: string,
  confirmacao: { refundId?: string; amountCentavos?: number } = {}
): Promise<ResultadoConfirmacaoOrfao> {
  const ledgerRef = db
    .collection('pagamentos')
    .doc(pagamentoId)
    .collection(ESTORNOS_ORFAOS_SUBCOL)
    .doc(ESTORNO_ORFAO_DOC_ID);
  const snap = await ledgerRef.get();
  if (!snap.exists) return { aplicado: false, motivo: 'sem_ledger_orfao' };

  const status = String(snap.get('status'));
  if (status === 'aprovado') return { aplicado: false, motivo: 'ja_aprovado' };
  if (!(STATUS_ESTORNO_CONFIRMAVEL as readonly string[]).includes(status)) {
    return { aplicado: false, motivo: 'sem_carimbo_vivo' };
  }

  const valorCentavos = snap.get('valorCentavos') as number;
  if (
    typeof confirmacao.amountCentavos === 'number' &&
    confirmacao.amountCentavos !== valorCentavos
  ) {
    logger.error('estorno_orfao_webhook_divergente', {
      pagamentoId,
      valorCentavos,
      amountEntrega: confirmacao.amountCentavos,
    });
    await marcarCarimboOrfao(db, pagamentoId, 'divergencia_valor', {
      valorDevolvidoCentavos: confirmacao.amountCentavos,
    });
    return { aplicado: false, motivo: 'divergencia_valor' };
  }

  const refundId =
    confirmacao.refundId ??
    ((snap.get('refundId') as string | undefined) ?? `webhook:${pagamentoId}:orfao`);
  const efeito = await aprovarEstornoOrfao(db, pagamentoId, refundId);
  logger.info('estorno_orfao_confirmado_por_webhook', {
    pagamentoId,
    refundId,
    duplicado: efeito.duplicado,
  });
  return {
    aplicado: !efeito.duplicado,
    motivo: efeito.duplicado ? 'ja_aprovado' : 'confirmado',
  };
}

// ---------------------------------------------------------------------------
// Varredura agendada (RN-380) — contador, alerta e a rede do dispatch perdido
// ---------------------------------------------------------------------------

export interface ResultadoVarreduraOrfaos {
  /** Quantos retardatários seguem NÃO resolvidos (o contador do alerta). */
  pendentes: number;
  /** Re-disparos feitos nesta varredura (ledger ausente ou 'pendente'). */
  disparados: number;
  /** Aguardando webhook ('enviando'/'solicitado') — nenhuma ação. */
  aguardandoWebhook: number;
  /** Carimbos que exigem MÃO HUMANA (sem_resposta/divergência/rejeitado). */
  conferenciaManual: number;
  falhas: number;
}

/**
 * Varre o extrato de retardatários não resolvidos: CONTA e ALERTA (RN-380 —
 * "contador/alerta antes do gatilho", item 27) e re-dispara com segurança o
 * que o dispatch inline do webhook não concluiu — a máquina de carimbo torna
 * o re-disparo inofensivo (carimbo vivo NUNCA re-POSTa, RN-371).
 */
export async function varrerEstornosOrfaosCore(
  db: Db,
  provider: PaymentProvider
): Promise<ResultadoVarreduraOrfaos> {
  const pendentesSnap = await db
    .collection(ORFAOS_PENDENTES_COL)
    .where('resolvido', '==', false)
    .get();

  const resultado: ResultadoVarreduraOrfaos = {
    pendentes: pendentesSnap.size,
    disparados: 0,
    aguardandoWebhook: 0,
    conferenciaManual: 0,
    falhas: 0,
  };
  if (pendentesSnap.empty) return resultado;

  for (const doc of pendentesSnap.docs) {
    const pagamentoId = doc.id;
    try {
      const ledgerSnap = await db
        .collection('pagamentos')
        .doc(pagamentoId)
        .collection(ESTORNOS_ORFAOS_SUBCOL)
        .doc(ESTORNO_ORFAO_DOC_ID)
        .get();
      const status = ledgerSnap.exists ? String(ledgerSnap.get('status')) : null;

      if (status === 'aprovado') {
        // Extrato dessincronizado (aprovação passou, resolução não) — sara.
        await db
          .collection(ORFAOS_PENDENTES_COL)
          .doc(pagamentoId)
          .set({ resolvido: true, resolvidoEm: FieldValue.serverTimestamp() }, { merge: true });
        resultado.pendentes -= 1;
        continue;
      }
      if (status === null || status === 'pendente') {
        const r = await estornarPagamentoOrfaoCore(db, provider, pagamentoId);
        resultado.disparados += 1;
        if (r.aguardandoConfirmacao) resultado.aguardandoWebhook += 1;
        continue;
      }
      if (status === 'enviando' || status === 'solicitado') {
        resultado.aguardandoWebhook += 1;
        continue;
      }
      // gateway_sem_resposta / divergencia_valor / rejeitado_gateway:
      // NENHUM re-envio automático (RN-371) — o alerta abaixo é o gatilho
      // da conferência humana no extrato do gateway.
      resultado.conferenciaManual += 1;
    } catch (err) {
      resultado.falhas += 1;
      logger.error('estorno_orfao_varredura_falhou', {
        pagamentoId,
        erro: err instanceof Error ? err.message.slice(0, 200) : String(err),
      });
    }
  }

  // O ALERTA (RN-380): pendência de dinheiro nunca é silêncio.
  logger.warn('estornos_orfaos_pendentes', { ...resultado });
  return resultado;
}

/** Cron ADR-015 (molde `expirarCarrinhosAbandonados`) — fino de propósito. */
export const varrerEstornosOrfaos = pubsub
  .schedule('every 15 minutes')
  .timeZone('America/Sao_Paulo')
  .onRun(async () => {
    await varrerEstornosOrfaosCore(admin.firestore(), selectPaymentProvider());
    return null;
  });
