// =============================================================================
// functions/src/finance/requestRefund.ts
//
// Máquina de reembolso do organizador — abertura, roteamento, decisão e
// EXECUÇÃO (LEELA-S904-T1 + T2 · E09 · RN-338/339/340/341/337).
//
// Uma solicitação por INSCRITO do pedido em grupo (ADR-011):
// `eventos/{eventoId}/reembolsos/{inscritoId}` (docId = inscritoId — um
// reembolso ativo por inscrito, espelha o ledger de estornos de FABLE-B).
//
// FLUXO:
//   requestRefund(pedidoId, inscritoId, motivo)  [owner/staff do tenant]
//     → carrega pedido/inscrito/evento/política
//     → `rotearReembolso` (S305/politicaVendas) decide o destino:
//          'bloqueado_corte' → REJEITA a abertura (RN-339; override é fluxo
//                              futuro, não este) — nada é criado;
//          'aprovado_auto'   → cria reembolso e EXECUTA o estorno na hora
//                              (CDC Art. 49 — sem espera);
//          'em_analise'      → cria reembolso e AGUARDA a decisão do organizador.
//   decideRefund(eventoId, inscritoId, decisao, motivo?)  [owner/staff]
//     → 'recusar'  → em_analise → recusado (terminal, sem dinheiro);
//     → 'aprovar'  → em_analise → aprovado → EXECUTA o estorno → estornado.
//
// EXECUÇÃO (T2): REUSA o primitivo idempotente `estornarInscricaoCore`
// (FABLE-B) — devolve o valor da LINHA do inscrito, flipa o inscrito
// `confirmado→estornado`, reverte a receita agregada e grava o ledger de
// estorno. Esta máquina NÃO recomputa dinheiro; só transiciona o
// `reembolsos/{id}` para `estornado` com a prova (refundId/valorEstornado).
//
// DESVIO DELIBERADO DA SPEC (S904-T2 previa "trigger onWrite"): a execução é
// SÍNCRONA a partir das transições (requestRefund/decideRefund), não um
// gatilho. Motivo (Hightower — simplicidade operacional; Kleppmann —
// idempotência explícita): (1) testável 100% contra o Emulator de Firestore,
// como todo o dinheiro do repo; (2) a idempotência já vive no primitivo
// (por pedido/inscrito) + na guarda de estado do próprio reembolso; (3) menos
// superfície (sem trigger duplicado/reentrante). A notificação (T3) e o
// clawback de afiliação (T2/RN-346) ficam de fora — ver DIRECTIVE no fim.
//
// GUARDS (Schneier): só ORGANIZADOR (tenant_owner/tenant_staff do tenant DO
// PEDIDO — assertTenantWriter; athlete/promoter negados). Cross-tenant nega
// (RN-400). Escrita de estado/dinheiro SÓ por Function (Rules congelam o doc
// para o cliente).
// =============================================================================

import * as admin from 'firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { https } from 'firebase-functions/v1';
import * as logger from 'firebase-functions/logger';
import {
  rotearReembolso,
  roundMoney,
  transitionReembolso,
  type AuthClaims,
  type EstadoReembolso,
  type ItemPedido,
  type PaymentProvider,
  type StatusInscrito,
  type StatusPedido,
  type TransicaoReembolso,
} from '@leela/core';
import {
  assertTenantAtivo,
  assertTenantWriter,
  type EventoCaller,
} from '../eventos/criarEvento';
import {
  lerPoliticaReembolsoTx,
  lerPoliticaVendasTx,
} from '../eventos/lerPoliticaVendas';
import { selectPaymentProvider } from '../payments/selectProvider';
import { estornarInscricaoCore } from '../checkout/estornarInscricao';
import {
  notificarAberturaReembolso,
  notificarTransicaoReembolso,
} from './notifyRefund';

type Db = admin.firestore.Firestore;

// ---------------------------------------------------------------------------
// Contratos
// ---------------------------------------------------------------------------

/** Nome da subcoleção de reembolsos (write só Function; docId = inscritoId). */
export const REEMBOLSOS_SUBCOL = 'reembolsos';

export const MOTIVO_REFUND_MIN = 3;
export const MOTIVO_REFUND_MAX = 500;

export interface RequestRefundInput {
  pedidoId: string;
  inscritoId: string;
  /** Motivo (auditoria — obrigatório, 3–500 caracteres). */
  motivo: string;
}

export interface DecideRefundInput {
  eventoId: string;
  inscritoId: string;
  /** 'aprovar' → executa o estorno; 'recusar' → terminal sem dinheiro. */
  decisao: 'aprovar' | 'recusar';
  /** Motivo da decisão (opcional; anexado à trilha se presente). */
  motivo?: string;
}

export interface RefundResult {
  eventoId: string;
  inscritoId: string;
  estado: EstadoReembolso;
  /** true = a chamada não produziu efeito novo (replay idempotente). */
  replay: boolean;
  /** Presentes quando o estado alcançou 'estornado'. */
  refundId?: string;
  valorEstornado?: number;
  /**
   * RN-372: o gateway ACEITOU a solicitação de estorno e ainda não a
   * concluiu. O reembolso continua no estado executável (aprovado/
   * aprovado_auto) e é o webhook `PAYMENT_REFUNDED` que o fecha. Não é erro
   * e NÃO pede nova tentativa — uma segunda chamada não manda segundo POST.
   */
  aguardandoConfirmacao?: boolean;
}

/** Valida o input bruto de abertura. @pure */
export function validarRequestRefundInput(raw: unknown): string[] {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return ['Input é obrigatório.'];
  }
  const input = raw as Record<string, unknown>;
  const erros: string[] = [];
  if (typeof input['pedidoId'] !== 'string' || input['pedidoId'].length === 0) {
    erros.push('"pedidoId" é obrigatório.');
  }
  if (typeof input['inscritoId'] !== 'string' || input['inscritoId'].length === 0) {
    erros.push('"inscritoId" é obrigatório.');
  }
  const motivo = input['motivo'];
  if (typeof motivo !== 'string' || motivo.trim().length < MOTIVO_REFUND_MIN) {
    erros.push(`"motivo" é obrigatório (mínimo ${MOTIVO_REFUND_MIN} caracteres).`);
  } else if (motivo.trim().length > MOTIVO_REFUND_MAX) {
    erros.push(`"motivo" excede ${MOTIVO_REFUND_MAX} caracteres.`);
  }
  return erros;
}

// ---------------------------------------------------------------------------
// Helpers puros
// ---------------------------------------------------------------------------

/**
 * Valor que o inscrito PAGOU (linha + fatia da taxa repassada — RN-347), a
 * partir da decomposição por-inscrito do pedido (ADR-011). Espelha o cálculo
 * congelado por `estornarInscricao` — aqui é só o valor de ABERTURA (o valor
 * autoritativo do refund vem do ledger da execução). @pure
 */
function valorPagoDaLinha(itens: ItemPedido[], inscritoId: string): number {
  const item = itens.find((i) => i?.inscritoRef === inscritoId);
  if (!item || typeof item.valorFinal !== 'number') {
    throw new https.HttpsError(
      'internal',
      `Pedido sem linha do inscrito '${inscritoId}' — decomposição corrompida (ADR-011).`
    );
  }
  const taxa =
    typeof item.taxaRepassada === 'number' && Number.isFinite(item.taxaRepassada) && item.taxaRepassada >= 0
      ? item.taxaRepassada
      : 0;
  return roundMoney(item.valorFinal + taxa);
}

// A leitura transacional da política mora em `eventos/lerPoliticaVendas` —
// dois donos precisam dela (esta máquina e o primitivo de estorno) e importar
// uma da outra fecharia ciclo. Re-exportada aqui pelos chamadores existentes
// (requestTransfer — S904-T4).
export { lerPoliticaVendasTx };

function novaTransicao(
  de: EstadoReembolso,
  para: EstadoReembolso,
  por: string,
  papel: string
): TransicaoReembolso {
  return { de, para, em: Timestamp.now(), por, papel };
}

// ---------------------------------------------------------------------------
// Abertura (T1) — cria o reembolso já roteado pela política
// ---------------------------------------------------------------------------

interface AberturaReembolso {
  eventoId: string;
  /**
   * Estado APÓS a abertura: doc novo sai roteado ('aprovado_auto' |
   * 'em_analise'); replay de doc existente devolve o estado ATUAL — que
   * pode já ter avançado ('aprovado' pós-decisão com crash antes da
   * execução, 'estornado' concluído). 'recusado' nunca chega aqui (a
   * abertura rejeita) e 'solicitado' não existe em disco (docs nascem
   * roteados).
   */
  estado: EstadoReembolso;
  jaExistia: boolean;
}

async function abrirReembolso(
  db: Db,
  input: RequestRefundInput,
  tenantId: string,
  caller: EventoCaller,
  agora: Date
): Promise<AberturaReembolso> {
  const pedidoRef = db.collection('pedidos').doc(input.pedidoId);

  return db.runTransaction(async (tx) => {
    // ── LEITURAS ───────────────────────────────────────────────────────────
    const pedidoSnap = await tx.get(pedidoRef);
    if (!pedidoSnap.exists) {
      throw new https.HttpsError('not-found', `Pedido '${input.pedidoId}' não existe.`);
    }
    if (pedidoSnap.get('tenantId') !== tenantId) {
      throw new https.HttpsError('permission-denied', 'Pedido pertence a outro tenant (RN-400).');
    }
    if ((pedidoSnap.get('status') as StatusPedido) !== 'pago') {
      throw new https.HttpsError(
        'failed-precondition',
        `Pedido '${input.pedidoId}' está '${String(pedidoSnap.get('status'))}' — só pedido pago reembolsa.`
      );
    }
    const inscritoRefs = (pedidoSnap.get('inscritoRefs') as string[]) ?? [];
    if (!inscritoRefs.includes(input.inscritoId)) {
      throw new https.HttpsError(
        'failed-precondition',
        `Inscrito '${input.inscritoId}' não pertence ao pedido '${input.pedidoId}' (ADR-011).`
      );
    }
    const eventoId = pedidoSnap.get('eventoId') as string;
    const compradoEm = pedidoSnap.get('criadoEm') as Timestamp | undefined;

    const reembolsoRef = db
      .collection('eventos')
      .doc(eventoId)
      .collection(REEMBOLSOS_SUBCOL)
      .doc(input.inscritoId);
    const reembolsoSnap = await tx.get(reembolsoRef);
    if (reembolsoSnap.exists) {
      const estado = reembolsoSnap.get('estado') as EstadoReembolso;
      // Reembolso já existe:
      //   'recusado'                   → terminal negativo, NÃO reabre (fail);
      //   'estornado'/'aprovado'/'auto'→ replay idempotente: requestRefundCore
      //       roteia ao executor (que trata estornado como replay sem efeito);
      //   'em_analise'                 → aguarda a decisão (replay da abertura).
      if (estado === 'recusado') {
        throw new https.HttpsError(
          'failed-precondition',
          `Inscrito '${input.inscritoId}' teve reembolso recusado — reabrir é decisão manual.`
        );
      }
      return { eventoId, estado, jaExistia: true };
    }

    const eventoRef = db.collection('eventos').doc(eventoId);
    const [eventoSnap, inscritoSnap] = await Promise.all([
      tx.get(eventoRef),
      tx.get(eventoRef.collection('inscritos').doc(input.inscritoId)),
    ]);
    if (!eventoSnap.exists) {
      throw new https.HttpsError('internal', `Evento '${eventoId}' do pedido não existe.`);
    }
    if (!inscritoSnap.exists) {
      throw new https.HttpsError('not-found', `Inscrito '${input.inscritoId}' não existe.`);
    }
    const statusInscrito = inscritoSnap.get('status') as StatusInscrito;
    if (statusInscrito !== 'confirmado') {
      throw new https.HttpsError(
        'failed-precondition',
        `Inscrito '${input.inscritoId}' está '${statusInscrito}' — só inscrição confirmada (paga) reembolsa.`
      );
    }
    const dataEvento = eventoSnap.get('data') as Timestamp | undefined;
    if (!dataEvento || !compradoEm) {
      throw new https.HttpsError('internal', 'Pedido/evento sem datas — roteamento impossível.');
    }

    // ── ROTEAMENTO pela política (S305 · RN-338/339/340) ────────────────────
    const politica = await lerPoliticaReembolsoTx(tx, db, eventoId, tenantId);
    const rota = rotearReembolso(politica, compradoEm, dataEvento, agora);
    if (rota === 'bloqueado_corte') {
      throw new https.HttpsError(
        'failed-precondition',
        `Solicitação bloqueada: faltam ${politica.corteHoras}h ou menos para o evento (RN-339). ` +
          'Reabertura excepcional é decisão manual do organizador.'
      );
    }

    const itens = (pedidoSnap.get('itens') as ItemPedido[]) ?? [];
    const valorSolicitado = valorPagoDaLinha(itens, input.inscritoId);
    if (valorSolicitado <= 0) {
      throw new https.HttpsError(
        'failed-precondition',
        'Linha do inscrito sem valor pago — use cancelamento, não reembolso.'
      );
    }

    const agoraTs = FieldValue.serverTimestamp();
    tx.create(reembolsoRef, {
      id: input.inscritoId,
      tenantId,
      eventoId,
      pedidoId: input.pedidoId,
      inscritoId: input.inscritoId,
      motivo: input.motivo.trim(),
      estado: rota,
      origem: 'organizador',
      valorSolicitado,
      transicoes: [novaTransicao('solicitado', rota, caller.uid, caller.claims.role ?? 'desconhecido')],
      criadoEm: agoraTs,
      atualizadoEm: agoraTs,
    });

    logger.info('reembolso_aberto', {
      eventoId,
      inscritoId: input.inscritoId,
      pedidoId: input.pedidoId,
      rota,
      valorSolicitado,
    });

    return { eventoId, estado: rota, jaExistia: false };
  });
}

// ---------------------------------------------------------------------------
// Execução (T2) — REUSA FABLE-B (estornarInscricaoCore) e transiciona →estornado
// ---------------------------------------------------------------------------

/**
 * Executa o estorno de um reembolso `aprovado`/`aprovado_auto` reusando o
 * primitivo idempotente FABLE-B e transiciona o `reembolsos/{id}` para
 * `estornado`. Idempotente: se já `estornado`, devolve replay sem efeito novo.
 */
async function executarEstorno(
  db: Db,
  provider: PaymentProvider,
  eventoId: string,
  input: RequestRefundInput,
  caller: EventoCaller,
  /** Mesmo relógio do roteamento (RN-373: a janela de arrependimento que
   * decide a taxa tem de ser a MESMA que decidiu a rota). */
  agora: Date
): Promise<RefundResult> {
  const reembolsoRef = db
    .collection('eventos')
    .doc(eventoId)
    .collection(REEMBOLSOS_SUBCOL)
    .doc(input.inscritoId);

  // Guarda de estado ANTES do dinheiro: só executa de estado executável.
  const pre = await reembolsoRef.get();
  if (!pre.exists) {
    throw new https.HttpsError('internal', 'Reembolso desapareceu antes da execução — intervenção manual.');
  }
  const estadoPre = pre.get('estado') as EstadoReembolso;
  if (estadoPre === 'estornado') {
    const valorPre = pre.get('valorEstornado') as number | undefined;
    return {
      eventoId,
      inscritoId: input.inscritoId,
      estado: 'estornado',
      replay: true,
      refundId: (pre.get('refundId') as string | undefined) ?? '',
      ...(typeof valorPre === 'number' ? { valorEstornado: valorPre } : {}),
    };
  }
  const transicao = transitionReembolso(estadoPre, 'estornado');
  if (!transicao.ok) {
    throw new https.HttpsError('failed-precondition', transicao.motivo ?? 'Transição inválida.');
  }

  // DINHEIRO: primitivo idempotente FABLE-B (valor congelado no ledger dele;
  // retry nunca duplica o refund no gateway).
  const estorno = await estornarInscricaoCore(
    db,
    provider,
    { pedidoId: input.pedidoId, inscritoId: input.inscritoId, motivo: input.motivo.trim() },
    caller,
    agora
  );

  // RN-372: o gateway aceitou e ainda não concluiu. O reembolso NÃO vira
  // 'estornado' aqui — quem fecha é o webhook `PAYMENT_REFUNDED`
  // (fecharReembolsoPorEstorno). Carimba a solicitação para a fila mostrar
  // "aguardando o gateway" em vez de "estornado" mentiroso.
  if (estorno.aguardandoConfirmacao) {
    await reembolsoRef.update({
      refundId: estorno.refundId,
      aguardandoGateway: true,
      solicitadoAoGatewayEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    logger.info('reembolso_aguardando_gateway', {
      eventoId,
      inscritoId: input.inscritoId,
      refundId: estorno.refundId,
    });
    return {
      eventoId,
      inscritoId: input.inscritoId,
      estado: estadoPre,
      replay: false,
      refundId: estorno.refundId,
      aguardandoConfirmacao: true,
    };
  }

  // Transiciona o reembolso → estornado com a prova (guarda contra corrida:
  // relê o estado dentro da transação).
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(reembolsoRef);
    if (!snap.exists) return;
    const estado = snap.get('estado') as EstadoReembolso;
    if (estado === 'estornado') return; // corrida: outro caller fechou
    const t = transitionReembolso(estado, 'estornado');
    if (!t.ok) return; // estado saiu do executável — não força
    tx.update(reembolsoRef, {
      estado: 'estornado',
      refundId: estorno.refundId,
      valorEstornado: estorno.valorEstornado,
      transicoes: FieldValue.arrayUnion(
        novaTransicao(estado, 'estornado', caller.uid, caller.claims.role ?? 'system')
      ),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  });

  logger.info('reembolso_estornado', {
    eventoId,
    inscritoId: input.inscritoId,
    refundId: estorno.refundId,
    valorEstornado: estorno.valorEstornado,
    duplicado: estorno.duplicado,
  });

  return {
    eventoId,
    inscritoId: input.inscritoId,
    estado: 'estornado',
    replay: estorno.duplicado,
    refundId: estorno.refundId,
    valorEstornado: estorno.valorEstornado,
  };
}

/**
 * Fecha o `reembolsos/{inscritoId}` quando o ESTORNO foi confirmado pelo
 * webhook (RN-372). Chamado pela porta única do webhook, nunca por cliente.
 * Idempotente: reembolso já `estornado` (ou em estado não-executável) sai
 * sem escrita; reembolso inexistente (estorno aberto direto pelo primitivo)
 * é no-op silencioso.
 */
export async function fecharReembolsoPorEstorno(
  db: Db,
  eventoId: string,
  inscritoId: string
): Promise<boolean> {
  const reembolsoRef = db
    .collection('eventos')
    .doc(eventoId)
    .collection(REEMBOLSOS_SUBCOL)
    .doc(inscritoId);
  const fechou = await db.runTransaction(async (tx) => {
    const snap = await tx.get(reembolsoRef);
    if (!snap.exists) return false;
    const estado = snap.get('estado') as EstadoReembolso;
    if (estado === 'estornado') return false;
    if (!transitionReembolso(estado, 'estornado').ok) return false;
    tx.update(reembolsoRef, {
      estado: 'estornado',
      aguardandoGateway: false,
      transicoes: FieldValue.arrayUnion(
        novaTransicao(estado, 'estornado', 'webhook', 'gateway')
      ),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    return true;
  });
  if (fechou) {
    logger.info('reembolso_fechado_por_webhook', { eventoId, inscritoId });
    await notificarTransicaoReembolso(db, eventoId, inscritoId, 'estornado');
  }
  return fechou;
}

// ---------------------------------------------------------------------------
// Núcleos (testáveis contra o Emulator)
// ---------------------------------------------------------------------------

export async function requestRefundCore(
  db: Db,
  provider: PaymentProvider,
  rawInput: unknown,
  caller: EventoCaller,
  agora: Date = new Date()
): Promise<RefundResult> {
  const tenantId = assertTenantWriter(caller.claims);
  const erros = validarRequestRefundInput(rawInput);
  if (erros.length > 0) {
    throw new https.HttpsError('invalid-argument', `RequestRefundInput inválido: ${erros.join(' ')}`);
  }
  const input = rawInput as unknown as RequestRefundInput;
  input.motivo = input.motivo.trim();

  await assertTenantAtivo(db, tenantId);

  const abertura = await abrirReembolso(db, input, tenantId, caller, agora);

  // Notificações da ABERTURA (RN-342 · T3): idempotentes por docId do log —
  // replay recompleta registro perdido por crash sem renotificar.
  if (abertura.estado === 'aprovado_auto' || abertura.estado === 'em_analise') {
    await notificarAberturaReembolso(
      db,
      abertura.eventoId,
      input.inscritoId,
      abertura.estado
    );
  }

  switch (abertura.estado) {
    // Executáveis (ou já executado): aprovado_auto na hora (CDC Art. 49);
    // 'aprovado' = decisão tomada com crash antes da execução — o replay
    // COMPLETA a saga; 'estornado' = replay integral (executor devolve sem
    // efeito novo). Dinheiro é idempotente no primitivo FABLE-B.
    case 'aprovado_auto':
    case 'aprovado':
    case 'estornado': {
      const resultado = await executarEstorno(
        db,
        provider,
        abertura.eventoId,
        input,
        caller,
        agora
      );
      if (resultado.estado === 'estornado') {
        await notificarTransicaoReembolso(db, abertura.eventoId, input.inscritoId, 'estornado');
      }
      return resultado;
    }
    // em_analise → aguarda a decisão do organizador (decideRefund).
    case 'em_analise':
      return {
        eventoId: abertura.eventoId,
        inscritoId: input.inscritoId,
        estado: 'em_analise',
        replay: abertura.jaExistia,
      };
    // 'solicitado' não existe em disco (docs nascem roteados) e 'recusado'
    // é rejeitado na abertura — chegar aqui é doc corrompido.
    default:
      throw new https.HttpsError(
        'internal',
        `Reembolso do inscrito '${input.inscritoId}' em estado inesperado ` +
          `'${abertura.estado}' — intervenção manual (RN-341).`
      );
  }
}

export async function decideRefundCore(
  db: Db,
  provider: PaymentProvider,
  rawInput: unknown,
  caller: EventoCaller,
  agora: Date = new Date()
): Promise<RefundResult> {
  const tenantId = assertTenantWriter(caller.claims);
  const input = rawInput as Partial<DecideRefundInput> | null;
  if (
    typeof input?.eventoId !== 'string' || input.eventoId.length === 0 ||
    typeof input.inscritoId !== 'string' || input.inscritoId.length === 0 ||
    (input.decisao !== 'aprovar' && input.decisao !== 'recusar')
  ) {
    throw new https.HttpsError(
      'invalid-argument',
      '"eventoId", "inscritoId" e "decisao" (aprovar|recusar) são obrigatórios.'
    );
  }
  await assertTenantAtivo(db, tenantId);

  const reembolsoRef = db
    .collection('eventos')
    .doc(input.eventoId)
    .collection(REEMBOLSOS_SUBCOL)
    .doc(input.inscritoId);

  // Transição de estado (em_analise → aprovado|recusado) numa transação.
  const { pedidoId, estadoDestino, replay } = await db.runTransaction(async (tx) => {
    const snap = await tx.get(reembolsoRef);
    if (!snap.exists) {
      throw new https.HttpsError('not-found', `Reembolso do inscrito '${input.inscritoId}' não existe.`);
    }
    if (snap.get('tenantId') !== tenantId) {
      throw new https.HttpsError('permission-denied', 'Reembolso de outro tenant (RN-400).');
    }
    const estado = snap.get('estado') as EstadoReembolso;
    const destino: EstadoReembolso = input.decisao === 'aprovar' ? 'aprovado' : 'recusado';
    // Replay idempotente da decisão (recusa terminal repetida; ou 'aprovar'
    // repetido após a execução ter concluído — review S904 L3: retry de
    // decisão bem-sucedida devolve replay, nunca erro).
    if (estado === destino || (input.decisao === 'aprovar' && estado === 'estornado')) {
      return {
        pedidoId: snap.get('pedidoId') as string,
        estadoDestino: estado,
        replay: true,
      };
    }
    const t = transitionReembolso(estado, destino);
    if (!t.ok) {
      throw new https.HttpsError('failed-precondition', t.motivo ?? 'Transição inválida.');
    }
    const patch: Record<string, unknown> = {
      estado: destino,
      decididoPor: caller.uid,
      transicoes: FieldValue.arrayUnion(
        novaTransicao(estado, destino, caller.uid, caller.claims.role ?? 'desconhecido')
      ),
      atualizadoEm: FieldValue.serverTimestamp(),
    };
    if (typeof input.motivo === 'string' && input.motivo.trim().length > 0) {
      patch['motivoDecisao'] = input.motivo.trim();
    }
    tx.update(reembolsoRef, patch);
    return { pedidoId: snap.get('pedidoId') as string, estadoDestino: destino, replay: false };
  });

  // Notificação da decisão ao atleta/responsável (RN-342 · T3 — idempotente;
  // no replay o registro já existe e o log FABLE-G dedupa por docId).
  await notificarTransicaoReembolso(db, input.eventoId, input.inscritoId, estadoDestino);

  if (estadoDestino === 'recusado') {
    return { eventoId: input.eventoId, inscritoId: input.inscritoId, estado: 'recusado', replay };
  }

  // aprovado → executa o estorno (reusa FABLE-B) → estornado.
  const motivo = (await reembolsoRef.get()).get('motivo') as string;
  const resultado = await executarEstorno(
    db,
    provider,
    input.eventoId,
    { pedidoId, inscritoId: input.inscritoId, motivo },
    caller,
    agora
  );
  if (resultado.estado === 'estornado') {
    await notificarTransicaoReembolso(db, input.eventoId, input.inscritoId, 'estornado');
  }
  return resultado;
}

// ---------------------------------------------------------------------------
// Callables
// ---------------------------------------------------------------------------

function callerDe(context: https.CallableContext): EventoCaller {
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Requer autenticação.');
  }
  return { uid: context.auth.uid, claims: context.auth.token as unknown as AuthClaims };
}

export const requestRefund = https.onCall(async (data: unknown, context) =>
  requestRefundCore(admin.firestore(), selectPaymentProvider(), data, callerDe(context))
);

export const decideRefund = https.onCall(async (data: unknown, context) =>
  decideRefundCore(admin.firestore(), selectPaymentProvider(), data, callerDe(context))
);
